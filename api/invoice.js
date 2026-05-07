export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { notes, rate, currency, from_name, to_name, date, inv_number, tax, payment } = req.body;

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

    const groqData = await groqRes.json();
    const raw = groqData.choices[0].message.content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

    const total = parsed.items.reduce((s, i) => s + (i.amount || 0), 0) * (1 + (tax || 0) / 100);

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

    await fetch(`${SUPABASE_URL}/rest/v1/invoices`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        from_name: from_name || 'Unknown',
        to_name: to_name || 'Unknown',
        date: date || new Date().toISOString(),
        inv_number: inv_number || '',
        items: parsed.items,
        currency: currency || '$',
        tax: tax || 0,
        payment: payment || '',
        total: Math.round(total * 100) / 100,
      }),
    });

    return res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
