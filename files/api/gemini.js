export default async function handler(req, res) {
    // 1. Security check 
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const { prompt } = req.body;
    
    if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt in request body.' });
    }

    // 2. Get API key from Vercel's Environment Variables 
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    try {
        // 3. Securely call Gemini API from the server
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    response_mime_type: "application/json", // Force output to be of JSON format
                    maxOutputTokens: 8192, // Headroom for 5 resources + 3 insights even with a long goals list
                    thinkingConfig: {
                        thinkingBudget: 1024 // Cap internal reasoning so it doesn't eat the whole token budget
                    }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", errorText);
            return res.status(response.status).json({ error: 'Failed to fetch from Gemini API' });
        }

        const data = await response.json();

        // 4. Flag truncated responses so the frontend can handle them gracefully
        const finishReason = data?.candidates?.[0]?.finishReason;
        if (finishReason === 'MAX_TOKENS') {
            console.error('Gemini response was truncated (MAX_TOKENS).');
            return res.status(200).json({ ...data, truncated: true });
        }

        // 5. Send the successful data back to your frontend
        return res.status(200).json(data);

    } catch (error) {
        console.error("Backend Error:", error);
        return res.status(500).json({ error: 'Internal server error while connecting to AI.' });
    }
}