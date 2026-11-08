// Keep authentication redirects on this site, including malformed/array queries.
function safeRedirect(value, fallback = null) {
 if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return fallback;
 try { const url = new URL(value, 'https://www.hilgod.com'); return url.origin === 'https://www.hilgod.com' ? url.pathname + url.search + url.hash : fallback; } catch { return fallback; }
}
module.exports = {safeRedirect};
