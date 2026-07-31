/**
 * Knowledge base retrieval layer.
 *
 * This is the piece that turns the app from "a prompt that asks Gemini to
 * invent resources" into a small RAG (Retrieval-Augmented Generation)
 * pipeline: we keep a curated, tagged knowledge base of real resources in
 * resources.json, score it against the user's profile, and hand Gemini a
 * short list of real candidates to personalize instead of letting it
 * hallucinate titles and links from scratch.
 */

let _kbCache = null;

async function loadKnowledgeBase() {
    if (_kbCache) return _kbCache;
    const res = await fetch('knowledge/resources.json');
    if (!res.ok) throw new Error('Failed to load knowledge base');
    _kbCache = await res.json();
    return _kbCache;
}

// Turn learningStyle free text (e.g. "I like watching videos") into one of
// the tags used in resources.json.
function normalizeLearningStyle(styleText) {
    if (!styleText) return null;
    const s = styleText.toLowerCase();
    if (s.includes('video') || s.includes('watch')) return 'video';
    if (s.includes('read') || s.includes('book')) return 'reading';
    if (s.includes('hands') || s.includes('doing') || s.includes('practice')) return 'hands-on';
    return null;
}

// Turn financialRunway free text into a coarse budget tier.
function normalizeBudget(runwayText) {
    if (!runwayText) return null;
    const s = runwayText.toLowerCase();
    if (s.includes('1') || s.includes('2') || s.includes('tight') || s.includes('none')) return 'free';
    if (s.includes('12') || s.includes('abundant') || s.includes('comfortable')) return 'medium';
    return null;
}

function scoreResource(resource, { goalKeywords, learningStyle, budget, regionKey }) {
    let score = 0;

    // Tag overlap with the user's actual goal titles/category — the
    // strongest signal that a resource is relevant to what they're
    // working on.
    const tagText = resource.tags.join(' ').toLowerCase();
    goalKeywords.forEach(kw => {
        if (kw && tagText.includes(kw)) score += 3;
    });

    // Learning style match
    if (learningStyle && resource.learningStyles.includes(learningStyle)) score += 2;

    // Budget match — free always scores a little even for tighter budgets,
    // but exact match scores more.
    if (budget) {
        if (resource.budgetLevel === budget) score += 2;
        else if (resource.budgetLevel === 'free') score += 1;
    }

    // Region — global resources always eligible; region-locked resources
    // only score (and are only eligible) if they match.
    if (resource.regions.includes('global')) score += 1;
    else if (regionKey && resource.regions.includes(regionKey)) score += 3;
    else score -= 5; // region-locked and non-matching: push to the bottom

    return score;
}

/**
 * Returns { category: [topResources...] } for the given categoriesToCover,
 * ranked by relevance to the user's profile/goals/deep-profile.
 */
async function retrieveCandidates({ profile, goals, deepContext, categoriesToCover, topN = 2 }) {
    const kb = await loadKnowledgeBase();

    const goalKeywords = (goals || [])
        .map(g => (g.title || '').toLowerCase())
        .join(' ')
        .split(/\W+/)
        .filter(w => w.length > 3);

    const learningStyle = normalizeLearningStyle(deepContext && deepContext.learningStyle);
    const budget = normalizeBudget(deepContext && deepContext.financialRunway);
    const regionKey = (profile && profile.location || '').toLowerCase().includes('kenya') ? 'kenya' : null;

    const context = { goalKeywords, learningStyle, budget, regionKey };
    const result = {};

    categoriesToCover.forEach(cat => {
        const pool = kb[cat] || [];
        result[cat] = pool
            .map(r => ({ resource: r, score: scoreResource(r, context) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topN)
            .map(x => x.resource);
    });

    return result;
}

// Expose as globals since this project uses plain <script> tags, no bundler.
window.retrieveCandidates = retrieveCandidates;
