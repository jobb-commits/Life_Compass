// Only signed-in users (valid Supabase session token) may call it.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://betgtqczetqwlhmjqjlh.supabase.co'; 
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldGd0cWN6ZXRxd2xobWpxamxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTM5NzksImV4cCI6MjEwMzA2OTk3OX0.ToQRtf9eZy0q7Fdvp0IdrUoTDxrEuwtPWmd4bZkF7Hg';
const MAX_PROMPT_CHARS = 12000; // generous for profile + goals, blocks abuse as a free general-purpose endpoint

async function getVerifiedUser(req) {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return null;

    try {
        // Supabase validates the JWT (signature, expiry) and returns the user
        const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
        });
        if (!r.ok) return null;
        const user = await r.json();
        return user && user.id ? user : null;
    } catch (err) {
        console.error('Auth check failed:', err);
        return null;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const user = await getVerifiedUser(req);
    if (!user) {
        return res.status(401).json({ error: 'Please sign in to use AI recommendations.' });
    }

    const { prompt } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Missing prompt in request body.' });
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
        return res.status(413).json({ error: 'Prompt too long.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey // header instead of ?key= so the key can't leak into URL logs
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    response_mime_type: 'application/json',
                    maxOutputTokens: 8192,
                    thinkingConfig: { thinkingBudget: 1024 }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', errorText);
            return res.status(response.status).json({ error: 'Failed to fetch from Gemini API' });
        }

        const data = await response.json();

        const finishReason = data?.candidates?.[0]?.finishReason;
        if (finishReason === 'MAX_TOKENS') {
            console.error('Gemini response was truncated (MAX_TOKENS).');
            return res.status(200).json({ ...data, truncated: true });
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('Backend Error:', error);
        return res.status(500).json({ error: 'Internal server error while connecting to AI.' });
    }
}
