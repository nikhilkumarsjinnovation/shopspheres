import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { requireActiveAdmin } from '@/lib/admin-guard';
import { csrfMiddleware } from '@/lib/csrf';
import { enforceRateLimit, integrationsLimiter, rateLimitKey } from '@/lib/rate-limiter';
import { createClient } from '@/lib/supabase/server';
import { sendPromoEmail } from '@/services/resend-mail';

export async function POST(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const limited = await enforceRateLimit(integrationsLimiter, await rateLimitKey(request));
  if (limited) return limited;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;

  const supabase = await createClient();
  const gate = await requireActiveAdmin(supabase);
  if (gate.error || !gate.session) return gate.error;

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'A JSON body is required.' }, { status: 400 });
  }
  const record = body as { to?: unknown; customerName?: unknown; discountPercent?: unknown };
  if (typeof record.to !== 'string' || typeof record.customerName !== 'string' || typeof record.discountPercent !== 'number') {
    return NextResponse.json({ error: 'to, customerName, and discountPercent are required.' }, { status: 400 });
  }

  const sent = await sendPromoEmail(
    { to: record.to, customerName: record.customerName, discountPercent: record.discountPercent },
    process.env.RESEND_FROM_EMAIL ?? '',
    process.env.RESEND_API_KEY ?? '',
  );
  if (!sent.ok) {
    const status = sent.status === 501 ? 501 : sent.status === 400 ? 400 : 502;
    return NextResponse.json({ error: sent.error }, { status });
  }

  const { error: auditError } = await supabase.from('admin_audit_logs').insert({
    action: 'resend_promo_send',
    admin_id: gate.session.user.id,
    target_entity: 'users',
    target_id: gate.session.user.id,
    metadata: { to: record.to.trim().toLowerCase(), discountPercent: record.discountPercent, resendId: sent.id },
  });

  return NextResponse.json({ ok: true, id: sent.id, auditSaved: !auditError });
}
