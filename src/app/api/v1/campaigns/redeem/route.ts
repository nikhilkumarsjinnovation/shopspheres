import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { enforceRateLimit, integrationsLimiter, rateLimitKey } from '@/lib/rate-limiter';
import { createClient } from '@/lib/supabase/server';
import {
  calculateCampaignDiscount,
  campaignPromoTitle,
  isCampaignPromoCodeShape,
  normalizePromoCode,
} from '@/services/campaign-promo';

export async function POST(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const limited = await enforceRateLimit(integrationsLimiter, await rateLimitKey(request));
  if (limited) return limited;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;

  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'A JSON body is required.' }, { status: 400 });
  }
  const record = body as { code?: unknown; subtotal?: unknown };
  if (typeof record.code !== 'string') {
    return NextResponse.json({ error: 'code is required.' }, { status: 400 });
  }
  if (typeof record.subtotal !== 'number' || !Number.isFinite(record.subtotal) || record.subtotal < 0) {
    return NextResponse.json({ error: 'subtotal must be a non-negative number.' }, { status: 400 });
  }

  const code = normalizePromoCode(record.code);
  if (!isCampaignPromoCodeShape(code)) {
    return NextResponse.json({ error: 'Not a campaign promo code.', code: 'not_campaign' }, { status: 404 });
  }

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, name, discount_percent, promo_code')
    .eq('promo_code', code)
    .maybeSingle();

  if (campaignError) {
    return NextResponse.json({ error: campaignError.message.slice(0, 300) }, { status: 500 });
  }
  if (!campaign?.promo_code) {
    return NextResponse.json({ error: `Unknown campaign code "${code}".` }, { status: 404 });
  }

  const { data: send, error: sendError } = await supabase
    .from('campaign_sends')
    .select('id, sent_at, converted_at')
    .eq('campaign_id', campaign.id)
    .eq('user_id', session.user.id)
    .not('sent_at', 'is', null)
    .maybeSingle();

  if (sendError) {
    return NextResponse.json({ error: sendError.message.slice(0, 300) }, { status: 500 });
  }
  if (!send) {
    return NextResponse.json(
      { error: `Code ${code} is not assigned to your account. Check the email or in-app banner for your code.` },
      { status: 403 },
    );
  }
  if (send.converted_at) {
    return NextResponse.json({ error: `Code ${code} was already used.` }, { status: 409 });
  }

  const calc = calculateCampaignDiscount(campaign.discount_percent, record.subtotal);
  if (!calc.valid) {
    return NextResponse.json({ error: calc.reason ?? 'Discount could not be applied.' }, { status: 400 });
  }

  const redeemedAt = new Date().toISOString();
  const { error: convertError } = await supabase
    .from('campaign_sends')
    .update({
      opened_at: redeemedAt,
      converted_at: redeemedAt,
    })
    .eq('id', send.id)
    .eq('user_id', session.user.id)
    .is('converted_at', null);

  if (convertError) {
    return NextResponse.json({ error: convertError.message.slice(0, 300) }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    code: campaign.promo_code,
    discountPercent: campaign.discount_percent,
    discountAmount: calc.discountAmount,
    title: campaignPromoTitle(campaign.discount_percent, campaign.promo_code),
    campaignId: campaign.id,
    sendId: send.id,
    minOrderAmount: 299,
  });
}
