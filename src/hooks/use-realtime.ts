'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

type TableName = keyof Database['public']['Tables'];
type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];

export interface RealtimeChange<T extends TableName> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new: Row<T> | null;
  old: Partial<Row<T>> | null;
}

/**
 * Subscribe to one Supabase realtime table. `filter` uses the realtime syntax,
 * for example `user_id=eq.<uuid>`.
 */
export function useRealtime<T extends TableName>(
  table: T,
  filter: string | undefined,
  onChange: (change: RealtimeChange<T>) => void,
): void {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`realtime:${table}:${filter ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload) => {
          onChange({
            eventType: payload.eventType,
            new: (payload.new ?? null) as Row<T> | null,
            old: (payload.old ?? null) as Partial<Row<T>> | null,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, filter, onChange]);
}
