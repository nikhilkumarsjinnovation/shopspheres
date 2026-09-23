import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { csrfMiddleware } from '@/lib/csrf';
import { requireActiveAdmin, writeAdminAudit } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import type { ApprovalStatus } from '@/types/database.types';

const STATUSES: ApprovalStatus[] = ['pending', 'approved', 'rejected'];

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
  const record = body as { approval_status?: unknown; rejection_reason?: unknown };
  const status = record.approval_status;
  if (typeof status !== 'string' || !STATUSES.includes(status as ApprovalStatus)) {
    return NextResponse.json({ error: 'approval_status must be pending, approved, or rejected.' }, { status: 400 });
  }
  const reason = typeof record.rejection_reason === 'string' ? record.rejection_reason.trim() : '';
  if (status === 'rejected' && !reason) {
    return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 });
  }

  const { data: product, error: readError } = await supabase.from('products').select('id').eq('id', id).maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  const { error: updateError } = await supabase
    .from('products')
    .update({
      approval_status: status as ApprovalStatus,
      rejection_reason: status === 'rejected' ? reason : null,
    })
    .eq('id', id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  const action = status === 'approved' ? 'product_approve' : status === 'rejected' ? 'product_reject' : 'product_pending';
  const { error: auditError } = await writeAdminAudit(supabase, gate.session.user.id, action, 'products', id);
  if (auditError) return NextResponse.json({ error: auditError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
