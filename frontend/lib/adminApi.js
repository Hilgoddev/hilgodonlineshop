import { apiFetch } from './apiClient';

export async function adminJson(path, options = {}) {
  const res = await apiFetch(path, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response (e.g. Render 502 HTML page) — return a friendly error
    const isHtml = text?.trimStart().startsWith('<');
    json = {
      success: false,
      error: isHtml
        ? res.status === 502
          ? 'The server is starting up. Please wait a moment and try again.'
          : `Server error (${res.status}). Please try again.`
        : text?.slice(0, 240) || 'Non-JSON response',
    };
  }
  return { res, json };
}

export function errorMessage(json, fallback = 'Something went wrong') {
  if (!json) return fallback;
  return json.message || json.error || json.code || fallback;
}
