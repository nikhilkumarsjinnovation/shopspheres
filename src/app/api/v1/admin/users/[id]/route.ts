import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { csrfMiddleware } from '@/lib/csrf';
import { requireActiveAdmin, writeAdminAudit } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database.types';

const ROLES: UserRole[] = ['customer', 'seller', 'admin'];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;

  const supabase = await createClient();
  const gate = await requireActiveAdmin(supabase);
  if (gate.error || !gate.session) return gate.error;

  const { id } = await context.params;
  const body: unknown = await request.json();
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'A JSON body is required.' }, { status: 400 });
  }
  const record = body as { role?: unknown; is_active?: unknown };
  const role = record.role === undefined ? undefined : record.role;
  const isActive = record.is_active === undefined ? undefined : record.is_active;
  if (role === undefined && isActive === undefined) {
    return NextResponse.json({ error: 'role or is_active is required.' }, { status: 400 });
  }
  if (role !== undefined && (typeof role !== 'string' || !ROLES.includes(role as UserRole))) {
    return NextResponse.json({ error: 'role must be customer, seller, or admin.' }, { status: 400 });
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'is_active must be true or false.' }, { status: 400 });
  }

  const { data: target, error: readError } = await supabase
    .from('users')
    .select('id, role, is_active')
    .eq('id', id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const nextRole = (role as UserRole | undefined) ?? target.role;
  const nextActive = (isActive as boolean | undefined) ?? target.is_active;
  const removesAdmin = target.role === 'admin' && target.is_active && (nextRole !== 'admin' || !nextActive);
  if (removesAdmin && target.id === gate.session.user.id) {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true)
      .neq('id', target.id);
    if ((count ?? 0) === 0) {
      return NextResponse.json({ error: 'The last active admin cannot be demoted or deactivated.' }, { status: 409 });
    }
  }

  const patch: { role?: UserRole; is_active?: boolean } = {};
  if (role !== undefined) patch.role = role as UserRole;
  if (isActive !== undefined) patch.is_active = isActive as boolean;

  const { error: updateError } = await supabase.from('users').update(patch).eq('id', id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  const action = isActive === false ? 'user_suspend' : isActive === true ? 'user_restore' : 'user_role';
  const { error: auditError } = await writeAdminAudit(supabase, gate.session.user.id, action, 'users', id);
  if (auditError) return NextResponse.json({ error: auditError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
