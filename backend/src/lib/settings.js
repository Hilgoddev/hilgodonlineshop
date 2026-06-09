const supabase = require('../config/supabase');

// Small cached accessor for the platform_settings key/value table.
// Tolerates the table not existing yet (before migration 010) by returning the
// provided fallback, so callers never crash on a fresh database.
const cache = new Map(); // key -> { value, expires }
const TTL_MS = 30 * 1000;

async function getSetting(key, fallback = null) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    const value = data ? data.value : fallback;
    cache.set(key, { value, expires: Date.now() + TTL_MS });
    return value;
  } catch (_) {
    return fallback; // table/row may not exist yet — non-fatal
  }
}

async function setSetting(key, value) {
  const { data, error } = await supabase
    .from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
    .single();
  if (error) throw error;
  cache.set(key, { value, expires: Date.now() + TTL_MS });
  return data;
}

module.exports = { getSetting, setSetting };
