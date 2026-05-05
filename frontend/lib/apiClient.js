import { supabase } from './supabaseClient';

export async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(path, { ...options, headers });
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
