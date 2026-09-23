import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, type AuthenticatedUser } from '@/lib/auth';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;

export async function requireActiveAdmin(supabase: Db): Promise<
  | { session: AuthenticatedUser; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getAuthenticatedUser(supabase);
  if (!session || session.profile.role !== 'admin' || !session.profile.is_active) {
    return { session: null, error: NextResponse.json({ error: 'Admin access is required.' }, { status: 403 }) };
  }
  return { session, error: null };
}

export async function writeAdminAudit(
  supabase: Db,
  adminId: string,
  action: string,
  targetEntity: string,
  targetId: string,
) {
  return supabase.from('admin_audit_logs').insert({
    action,
    admin_id: adminId,
    target_entity: targetEntity,
    target_id: targetId,
  });
}
