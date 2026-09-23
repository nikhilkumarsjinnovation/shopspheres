'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/types/database.types';

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load(user: User | null) {
      if (!user) {
        if (active) {
          setState({ user: null, profile: null, loading: false, error: null });
        }
        return;
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) {
        return;
      }

      setState({
        user,
        profile: profile ?? null,
        loading: false,
        error: error?.message ?? null,
      });
    }

    supabase.auth.getUser().then(({ data }) => load(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
