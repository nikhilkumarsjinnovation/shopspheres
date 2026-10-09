import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { requireActiveAdmin } from '@/lib/admin-guard';
import { adminApiLimiter, enforceRateLimit, rateLimitKey } from '@/lib/rate-limiter';
import { captureRouteError } from '@/lib/sentry';
import { createClient } from '@/lib/supabase/server';

export type CampaignListItem = {
  id: string;
  name: string;
  segment: string;
  discountPercent: number;
  promoCode: string | null;
  status: string;
  createdAt: string;
  createdBy: string | null;
  source: 'ai' | 'manual';
  sent: number;
  total: number;
};

export async function GET(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const limited = await enforceRateLimit(adminApiLimiter, await rateLimitKey(request));
    if (limited) return limited;

    const supabase = await createClient();
    const gate = await requireActiveAdmin(supabase);
    if (gate.error || !gate.session) return gate.error;

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, name, segment, discount_percent, promo_code, status, created_at, created_by')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ids = (campaigns ?? []).map((c) => c.id);
    const sendCounts = new Map<string, { total: number; sent: number }>();
    if (ids.length > 0) {
      const { data: sends } = await supabase
        .from('campaign_sends')
        .select('campaign_id, sent_at')
        .in('campaign_id', ids);
      for (const row of sends ?? []) {
        const current = sendCounts.get(row.campaign_id) ?? { total: 0, sent: 0 };
        current.total += 1;
        if (row.sent_at) current.sent += 1;
        sendCounts.set(row.campaign_id, current);
      }
    }

    const items: CampaignListItem[] = (campaigns ?? []).map((campaign) => {
      const stats = sendCounts.get(campaign.id) ?? { total: 0, sent: 0 };
      const isAi = campaign.name.trim().toUpperCase().startsWith('[AI]');
      return {
        id: campaign.id,
        name: campaign.name,
        segment: campaign.segment,
        discountPercent: campaign.discount_percent,
        promoCode: campaign.promo_code,
        status: campaign.status,
        createdAt: campaign.created_at,
        createdBy: campaign.created_by,
        source: isAi ? 'ai' : 'manual',
        sent: stats.sent,
        total: stats.total,
      };
    });

    return NextResponse.json({ ok: true, campaigns: items });
  } catch (error: unknown) {
    captureRouteError(error, { route: '/api/v1/campaigns', method: 'GET' });
    const message = error instanceof Error ? error.message : 'Failed to list campaigns.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
