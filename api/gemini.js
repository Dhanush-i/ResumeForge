/**
 * Vercel Serverless Function — Gemini API Proxy
 *
 * Keeps the GEMINI_API_KEY secret on the server.
 * Clients POST to /api/gemini with { prompt, maxTokens, temperature }
 * and this function forwards the request to Google's Gemini API.
 *
 * Set GEMINI_API_KEY in your Vercel project → Settings → Environment Variables.
 */

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const BASE_DELAY_MS = 1500;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tryModel(model, prompt, apiKey, maxTokens, temperature, attempt = 1) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (res.status === 429 || res.status === 503) {
    if (attempt >= MAX_RETRIES) return { rateLimited: true };
    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
    await sleep(delay);
    return tryModel(model, prompt, apiKey, maxTokens, temperature, attempt + 1);
  }

  if (res.status === 404) return { notFound: true };

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from model.');
  return { text };
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server not configured. The site owner needs to set GEMINI_API_KEY in Vercel.',
    });
  }

  const { prompt, maxTokens = 4096, temperature = 0.4 } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body.' });
  }

  try {
    for (const model of MODELS) {
      const result = await tryModel(model, prompt, apiKey, maxTokens, temperature);
      if (result.text) {
        return res.status(200).json({ text: result.text, model });
      }
      if (result.notFound) continue;
      if (result.rateLimited) continue;
    }
    return res.status(503).json({ error: 'All models are busy. Please try again in a moment.' });
  } catch (err) {
    console.error('[Gemini Proxy] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
