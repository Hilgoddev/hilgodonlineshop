import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Keep a list/view fresh without a manual refresh.
 * - Polls `callback` every `intervalMs` (the reliable mechanism today).
 * - Subscribes to Supabase realtime for `table` if given (kicks in once
 *   replication is enabled for that table; harmless otherwise).
 * - Re-fetches when the tab regains focus.
 *
 * The callback is held in a ref, so passing an inline function is fine.
 * NOTE: the callback should do a *silent* refresh (not toggle a full-page
 * loading spinner) — the admin list pages only set loading on first mount,
 * so passing their existing fetch fn is safe.
 */
export function useAutoRefresh(callback, { intervalMs = 20000, table = null, event = '*' } = {}) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const tick = () => { try { cbRef.current && cbRef.current(); } catch (_) {} };

    const id = setInterval(tick, intervalMs);

    let channel = null;
    if (table) {
      channel = supabase
        .channel(`auto-${table}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event, schema: 'public', table }, tick)
        .subscribe();
    }

    const onVis = () => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') tick(); };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);

    return () => {
      clearInterval(id);
      if (channel) supabase.removeChannel(channel);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
    };
  }, [intervalMs, table, event]);
}
