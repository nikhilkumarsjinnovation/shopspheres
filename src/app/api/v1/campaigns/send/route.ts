import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { requireActiveAdmin } from '@/lib/admin-guard';
import { csrfMiddleware } from '@/lib/csrf';
import { enforceRateLimit, integrationsLimiter, rateLimitKey } from '@/lib/rate-limiter';
import { createClient } from '@/lib/supabase/server';
import { isCampaignSegment } from '@/services/campaign-segments';
import { runCampaignSend } from '@/services/campaign-send';
import { createCampaignStore, createOrderUserLoader } from '@/services/campaign-store';
import { RESEND_ONBOARDING_FROM } from '@/services/resend-mail';

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
  const record = body as { segment?: unknown; discountPercent?: unknown; name?: unknown };
  if (!isCampaignSegment(record.segment)) {
    return NextResponse.json({ error: 'segment must be new, repeat, or lapsed.' }, { status: 400 });
  }
  if (typeof record.discountPercent !== 'number') {
    return NextResponse.json({ error: 'discountPercent is required.' }, { status: 400 });
  }
  const name = typeof record.name === 'string' ? record.name : undefined;

  const from = (process.env.RESEND_FROM_EMAIL ?? '').trim() || RESEND_ONBOARDING_FROM;

  const result = await runCampaignSend(
    {
      segment: record.segment,
      discountPercent: record.discountPercent,
      name,
      createdBy: gate.session.user.id,
      from,
      apiKey: process.env.RESEND_API_KEY ?? '',
    },
    createCampaignStore(supabase),
    createOrderUserLoader(supabase),
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { error: auditError } = await supabase.from('admin_audit_logs').insert({
    action: 'campaign_promo_send',
    admin_id: gate.session.user.id,
    target_entity: 'campaigns',
    target_id: result.campaignId,
    metadata: {
      segment: result.segment,
      discountPercent: record.discountPercent,
      promoCode: result.promoCode,
      attempted: result.attempted,
      sent: result.sent,
      emailed: result.emailed,
      emailFailures: result.emailFailures.slice(0, 5),
    },
  });

  return NextResponse.json({
    ok: true,
    campaignId: result.campaignId,
    segment: result.segment,
    promoCode: result.promoCode,
    discountPercent: result.discountPercent,
    attempted: result.attempted,
    sent: result.sent,
    emailed: result.emailed,
    emailFailures: result.emailFailures.slice(0, 5),
    auditSaved: !auditError,
  });
}
