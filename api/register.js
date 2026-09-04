/* ============================================================
   /api/register.js — Hardened Early Access Endpoint
   Security: CORS lock · IP rate limit · input sanitization
              · honeypot · method guard · size limit
   ============================================================ */

// ── In-process rate limit store ──────────────────────────────
// Resets on cold-start (acceptable for serverless).
// Keyed by IP → { count, resetAt }
const rateStore = new Map();
const RATE_LIMIT   = 5;          // max submissions per window
const RATE_WINDOW  = 60 * 1000;  // 60-second rolling window

function getRateEntry(ip) {
  const now = Date.now();
  let entry = rateStore.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW };
    rateStore.set(ip, entry);
  }
  return entry;
}

// ── Allowed origins ───────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://blco-website.vercel.app',
  'https://www.bl.co',
  'https://bl.co',
];

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0]; // default to production
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

// ── Sanitise string — strip HTML/script tags ──────────────────
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, 500);
}

export default async function handler(req, res) {
  setCors(req, res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') return res.status(204).end();

  // 1. Method guard
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Payload size guard (~10 KB max)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 10_000) {
    return res.status(413).json({ error: 'Payload too large.' });
  }

  // 3. IP-based rate limiting
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const entry = getRateEntry(ip);
  entry.count++;
  if (entry.count > RATE_LIMIT) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
  }

  const body = req.body || {};

  // 4. Honeypot — bots fill hidden fields, humans don't
  if (body._trap || body.website || body.url) {
    // Silently accept so bots think they succeeded
    return res.status(200).json({ success: true });
  }

  // 5. Validate & sanitise email
  const email = sanitize(body.email || '');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  if (email.length > 254) {
    return res.status(400).json({ error: 'Email too long.' });
  }

  // 6. Supabase credentials
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('[register] Supabase credentials missing');
    return res.status(500).json({ error: 'Database configuration error.' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/early_access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ email: email.toLowerCase() }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (err.code === '23505' || (err.message || '').includes('duplicate key')) {
        return res.status(409).json({ error: 'Email already registered.' });
      }
      console.error('[register] Supabase error:', err);
      return res.status(500).json({ error: 'Failed to save. Please try again.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[register] Internal error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
