// Hosting dashboards (Vercel) sometimes store env values with a leading BOM,
// zero-width chars, or stray whitespace/newlines. Those are invisible but break
// two things: a contaminated Supabase key throws "String contains non
// ISO-8859-1 code point" when set as a fetch header, and a contaminated URL
// fails server-side `fetch()` URL parsing (turning SSR data fetches into 404s).
// Always run env strings through this before use.
export function cleanEnv(value) {
  if (typeof value !== 'string') return value;
  // Strip BOM (U+FEFF), zero-width space/non-joiner/joiner (U+200B–U+200D),
  // and word joiner (U+2060), then trim surrounding whitespace/newlines.
  return value
    .replace(/[﻿​‌‍⁠]/g, '')
    .trim();
}

// Resolve an absolute API base usable in getServerSideProps. A relative base
// like "/api" cannot be fetched server-side, so fall back to the same-origin
// rewrite using the incoming request's host.
export function resolveServerApiBase(req) {
  const configured = cleanEnv(process.env.BACKEND_URL) || cleanEnv(process.env.NEXT_PUBLIC_API_URL) || '';
  if (/^https?:\/\//i.test(configured)) return configured;

  const host = req?.headers?.host;
  if (host) {
    // x-forwarded-proto can arrive as "https,https" on Vercel — take first value only.
    const rawProto = req.headers['x-forwarded-proto'] || '';
    const proto = rawProto.split(',')[0].trim() || (host.startsWith('localhost') ? 'http' : 'https');
    const path = configured && configured.startsWith('/') ? configured : '/api';
    return `${proto}://${host}${path}`;
  }
  return configured || 'http://127.0.0.1:5000/api';
}
