import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { enforceRateLimit, integrationsLimiter, rateLimitKey } from '@/lib/rate-limiter';
import { createClient } from '@/lib/supabase/server';

const INBOX_WINDOW_DAYS = 14;

export type CampaignInboxItem = {
  sendId: string;
  campaignId: string;
  name: string;
  segment: string;
  discountPercent: number;
  promoCode: string | null;
  sentAt: string;
};

export async function GET(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const limited = await enforceRateLimit(integrationsLimiter, await rateLimitKey(request));
  if (limited) return limited;

  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const since = new Date(Date.now() - INBOX_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('campaign_sends')
    .select('id, campaign_id, sent_at, campaigns(name, segment, discount_percent, promo_code)')
    .eq('user_id', session.user.id)
    .not('sent_at', 'is', null)
    .is('opened_at', null)
    .gte('sent_at', since)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message.slice(0, 300) }, { status: 500 });
  }
  if (!data?.sent_at) {
    return NextResponse.json({ ok: true, item: null });
  }

  const joined = data.campaigns;
  const campaign = Array.isArray(joined) ? joined[0] : joined;
  if (!campaign || typeof campaign !== 'object') {
    return NextResponse.json({ ok: true, item: null });
  }

  const item: CampaignInboxItem = {
    sendId: data.id,
    campaignId: data.campaign_id,
    name: campaign.name,
    segment: campaign.segment,
    discountPercent: campaign.discount_percent,
    promoCode: campaign.promo_code ?? null,
    sentAt: data.sent_at,
  };
  return NextResponse.json({ ok: true, item });
}

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
  const record = body as { sendId?: unknown; action?: unknown };
  if (typeof record.sendId !== 'string' || !record.sendId) {
    return NextResponse.json({ error: 'sendId is required.' }, { status: 400 });
  }
  const action = record.action === 'convert' ? 'convert' : 'open';

  const patch =
    action === 'convert'
      ? { opened_at: new Date().toISOString(), converted_at: new Date().toISOString() }
      : { opened_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from('campaign_sends')
    .update(patch)
    .eq('id', record.sendId)
    .eq('user_id', session.user.id)
    .select('id, opened_at, converted_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message.slice(0, 300) }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Send not found.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, send: data });
}
