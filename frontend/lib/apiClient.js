import { supabase } from './supabaseClient';

export async function apiFetch(path, options = {}) {
  const { accessToken, ...fetchOptions } = options;
  const { data } = await supabase.auth.getSession();
  const token = accessToken || data?.session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {}),
  };

  if (token) {
    // Strip BOM / zero-width chars that can contaminate localStorage-stored tokens
    // and cause "Invalid character in header content" fetch errors.
    const cleanToken = String(token).replace(/[^\x20-\x7E]/g, '').trim();
    if (cleanToken) headers.Authorization = `Bearer ${cleanToken}`;
  }

  return await fetch(path, { ...fetchOptions, headers });
}

/**
 * Parse a Response as JSON safely.
 * If the body is not valid JSON (e.g. Vercel HTML error page on timeout),
 * returns { success: false, message, _status } instead of throwing.
 */
export async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error(`[safeJson] Non-JSON response (${res.status}):`, text.slice(0, 200));
    return {
      success: false,
      message: res.status === 504 || res.status === 524
        ? 'Request timed out. Please try again.'
        : res.status >= 500
          ? 'Server error. Please try again in a moment.'
          : 'Unexpected response from server.',
      _status: res.status,
    };
  }
}

export async function syncProfile(overrides = {}) {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  if (!session?.access_token) return;

  await apiFetch('/api/auth/sync-profile', {
    method: 'POST',
    body: JSON.stringify({
      full_name:
        overrides.full_name ||
        session.user?.user_metadata?.full_name ||
        session.user?.user_metadata?.name ||
        '',
      avatar_url: overrides.avatar_url || session.user?.user_metadata?.avatar_url || '',
    }),
  });
}
