/* ============================================================
   /api/contact.js — Hardened Contact Form Endpoint
   Security: CORS lock · IP rate limit · input sanitization
              · honeypot · method guard · size limit
   ============================================================ */

// ── In-process rate limit store ──────────────────────────────
const rateStore = new Map();
const RATE_LIMIT  = 3;           // max contact submissions per window
const RATE_WINDOW = 5 * 60 * 1000; // 5-minute rolling window (stricter than waitlist)

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
    : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

// ── Sanitise string — strip HTML/script tags ──────────────────
function sanitize(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
}

export default async function handler(req, res) {
  setCors(req, res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') return res.status(204).end();

  // 1. Method guard
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Payload size guard (~25 KB max for contact with message)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 25_000) {
    return res.status(413).json({ error: 'Payload too large.' });
  }

  // 3. IP-based rate limiting (stricter: 3 per 5 min for contact)
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const entry = getRateEntry(ip);
  entry.count++;
  if (entry.count > RATE_LIMIT) {
    res.setHeader('Retry-After', '300');
    return res.status(429).json({ error: 'Too many submissions. Please wait a few minutes.' });
  }

  const body = req.body || {};

  // 4. Honeypot — bots fill hidden fields, humans don't
  if (body._trap || body.website || body.url) {
    return res.status(200).json({ success: true }); // silent accept
  }

  // 5. Validate & sanitise all fields
  const name        = sanitize(body.name, 120);
  const email       = sanitize(body.email, 254);
  const company     = sanitize(body.company, 120);
  const phone       = sanitize(body.phone, 30);
  const projectType = sanitize(body.projectType, 60);
  const budget      = sanitize(body.budget, 60);
  const message     = sanitize(body.message, 4000);

  if (!name) return res.status(400).json({ error: 'Name is required.' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  if (!message || message.length < 10) {
    return res.status(400).json({ error: 'Message must be at least 10 characters.' });
  }

  // 6. Supabase credentials
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('[contact] Supabase credentials missing');
    return res.status(500).json({ error: 'Database configuration error.' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/contact_messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        name,
        company:      company  || null,
        email:        email.toLowerCase(),
        phone:        phone    || null,
        project_type: projectType || null,
        budget:       budget   || null,
        message,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[contact] Supabase error:', err);
      return res.status(500).json({ error: 'Failed to send. Please try again.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[contact] Internal error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
