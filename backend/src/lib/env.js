// Hosting dashboards (Vercel/Render) sometimes store env values with a leading
// BOM, zero-width chars, or stray whitespace/newlines. These are invisible but
// break anything that puts the value into an HTTP header: e.g. a contaminated
// API key throws "String contains non ISO-8859-1 code point" when used as a
// Bearer token, silently breaking Resend emails, Supabase calls, etc.
// Run env strings through this before use.
function cleanEnv(value) {
  if (typeof value !== 'string') return value;
  // Strip BOM (U+FEFF), zero-width space/non-joiner/joiner (U+200B–U+200D),
  // and word joiner (U+2060), then trim surrounding whitespace/newlines.
  return value
    .replace(/[﻿​‌‍⁠]/g, '')
    .trim();
}

module.exports = { cleanEnv };
