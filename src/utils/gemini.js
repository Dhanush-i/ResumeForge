/**
 * Gemini API client — routes through the serverless proxy (/api/gemini).
 *
 * In production (Vercel), the proxy injects the secret API key server-side.
 * In local dev, set VITE_GEMINI_DEV_KEY in a .env.local file to bypass the
 * proxy and call Google directly (optional convenience for development only).
 *
 * Retry logic:
 *  - Up to 3 retries with exponential backoff on 429 / 503
 *  - Falls back to a second model if the proxy reports rate-limiting
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Single attempt via the /api/gemini serverless proxy.
 * Returns { text } on success, { rateLimited: true } on 429/503 after retries.
 */
async function callProxy(prompt, maxTokens, temperature, attempt = 1) {
  let response;

  try {
    response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, maxTokens, temperature }),
    });
  } catch (networkErr) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(`Network error: ${networkErr.message}. Please check your internet connection.`);
    }
    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
    console.warn(`[Gemini] Network error, retrying in ${delay}ms...`);
    await sleep(delay);
    return callProxy(prompt, maxTokens, temperature, attempt + 1);
  }

  if (response.status === 429 || response.status === 503) {
    if (attempt >= MAX_RETRIES) return { rateLimited: true };
    const retryAfter = response.headers.get('Retry-After');
    const delay = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : BASE_DELAY_MS * Math.pow(2, attempt - 1);
    console.warn(`[Gemini] Rate limited (${response.status}). Retrying in ${delay}ms...`);
    await sleep(delay);
    return callProxy(prompt, maxTokens, temperature, attempt + 1);
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `Proxy error ${response.status}`);
  }

  const data = await response.json();
  if (!data.text) throw new Error('Empty response from AI. Please try again.');
  return { text: data.text };
}

/**
 * Main entry point for all Gemini calls.
 * No API key required — the proxy handles authentication.
 */
export async function callGemini(prompt, _apiKey, maxTokens = 4096, temperature = 0.4) {
  // _apiKey is kept as a parameter for backwards compatibility but is ignored.
  // The key lives securely in Vercel's environment variables.

  const result = await callProxy(prompt, maxTokens, temperature);

  if (result.text) {
    console.log('[Gemini] Success via proxy');
    return result.text;
  }

  if (result.rateLimited) {
    throw new Error('AI is busy right now. Please wait a moment and try again.');
  }

  throw new Error('Failed to get a response from AI. Please try again.');
}

/**
 * Robustly extracts and parses a JSON object from a Gemini text response.
 *
 * Handles:
 *  - Markdown code fences (```json ... ```)
 *  - Trailing commas before } or ] (most common Gemini mistake)
 *  - Unescaped newlines/tabs inside string values
 *  - Inline JS-style comments
 */
export function parseGeminiJSON(raw) {
  let text = raw.trim();

  // 1. Strip markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();

  // 2. Extract first complete JSON object
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (!objMatch) throw new Error('No JSON found in AI response. Please try again.');
  let jsonStr = objMatch[0];

  // 3. Remove inline comments (// ...)
  jsonStr = jsonStr.replace(/\/\/[^\n\r"]*/g, '');

  // 4. Fix trailing commas before } or ]
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

  // 5. Fix unescaped control characters inside string values
  jsonStr = fixJsonStrings(jsonStr);

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Last resort: strip all remaining control characters
    const aggressive = jsonStr
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(aggressive);
  }
}

/**
 * Walk through a JSON string char-by-char and escape any unescaped
 * newlines/tabs that appear inside string literals.
 */
function fixJsonStrings(src) {
  let out = '';
  let inStr = false;
  let esc = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (esc) { out += c; esc = false; continue; }
    if (c === '\\' && inStr) { out += c; esc = true; continue; }
    if (c === '"') { inStr = !inStr; out += c; continue; }
    if (inStr) {
      if (c === '\n') { out += '\\n'; continue; }
      if (c === '\r') { out += '\\r'; continue; }
      if (c === '\t') { out += '\\t'; continue; }
    }
    out += c;
  }
  return out;
}
