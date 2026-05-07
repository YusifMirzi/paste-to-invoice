export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic CORS — lock this down to your GitHub Pages domain in production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { notes, rate, currency } = req.body;

  if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
    return res.status(400).json({ error: 'notes field is required' });
  }

  const prompt = `Parse these freelance work notes into invoice line items.

Notes:
${notes.trim()}

Hourly rate: ${rate || 0} ${currency || '$'}

Return ONLY valid JSON, no markdown, no explanation:
{
  "items": [
    {"description": "clear task description", "hours": 1.5, "type": "hourly|fixed", "amount": 225}
  ],
  "notes": "any unclear items or assumptions (1-2 sentences, or empty string)"
}

Rules:
- Hourly items: amount = hours * ${rate || 'given rate'}
- Fixed items (no time mentioned): set hours to null, estimate a reasonable fixed amount
- If no rate and no time, set amount to 0
- Keep descriptions professional and concise
- Combine similar small tasks if logical`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You are an invoice parser. You only respond with valid JSON. Never include markdown, code fences, or explanation.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      return res.status(502).json({ error: err.error?.message || 'Groq API error' });
    }

    const data = await groqRes.json();
    const raw = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

    return res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}