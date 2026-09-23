import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { UserProfile } from '@/types/database.types';

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type AuthenticatedUser = {
  user: User;
  profile: UserProfile;
};

/**
 * Cookie session + public.users row, read through the anon client so RLS applies.
 * Returns null when there is no session or no matching users row.
 */
export async function getAuthenticatedUser(
  existingClient?: ServerSupabase,
): Promise<AuthenticatedUser | null> {
  const supabase = existingClient ?? (await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!profile) {
    return null;
  }

  return { user, profile };
}
