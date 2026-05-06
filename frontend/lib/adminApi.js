import { apiFetch } from './apiClient';

/**
 * Authenticated fetch for admin pages. Parses JSON safely and preserves status.
 */
export async function adminJson(path, options = {}) {
  const res = await apiFetch(path, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = {
      success: false,
      error: text?.slice(0, 240) || 'Non-JSON response',
    };
  }
  return { res, json };
}

export function errorMessage(json, fallback = 'Something went wrong') {
  if (!json) return fallback;
  return json.message || json.error || json.code || fallback;
}
