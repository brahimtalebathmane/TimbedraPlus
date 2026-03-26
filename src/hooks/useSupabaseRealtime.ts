import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type ChangeHandler = () => void;

type Options = {
  tables: string[];
  onChange: ChangeHandler;
  enabled?: boolean;
  debounceMs?: number;
  channelKey?: string;
  schema?: string;
};

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
}

/**
 * Subscribes to Postgres changes for one or more tables and calls `onChange`
 * (debounced) on any INSERT/UPDATE/DELETE.
 */
export function useSupabaseRealtime({
  tables,
  onChange,
  enabled = true,
  debounceMs = 250,
  channelKey,
  schema = 'public',
}: Options) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const timerRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const tableList = uniq(tables);
    if (tableList.length === 0) return;

    const key = channelKey ?? `rt:${tableList.join(',')}`;
    const channel = supabase.channel(key);
    channelRef.current = channel;

    const trigger = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        onChangeRef.current();
      }, debounceMs);
    };

    for (const table of tableList) {
      channel.on(
        'postgres_changes',
        { event: '*', schema, table },
        () => {
          trigger();
        }
      );
    }

    channel.subscribe();

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      const ch = channelRef.current;
      channelRef.current = null;
      if (ch) supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debounceMs, schema, channelKey, JSON.stringify(uniq(tables))]);
}

