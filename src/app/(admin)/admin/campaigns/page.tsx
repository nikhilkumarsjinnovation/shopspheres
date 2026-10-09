import { createClient } from '@/lib/supabase/server';
import CampaignsWorkspace from '@/components/admin/CampaignsWorkspace';
import type { CampaignHistoryRow } from '@/components/admin/CampaignPanel';
import { loadSegmentSnapshot } from '@/services/campaign-segments';
import { createOrderUserLoader } from '@/services/campaign-store';
import { MAX_PROMO_DISCOUNT_PERCENT } from '@/services/resend-mail';

export default async function CampaignsPage() {
  const supabase = await createClient();

  let counts: { new: number; repeat: number; lapsed: number } | null = null;
  let countsError: string | null = null;
  try {
    const snapshot = await loadSegmentSnapshot(createOrderUserLoader(supabase));
    counts = snapshot.counts;
  } catch (err) {
    countsError = err instanceof Error ? err.message : 'Failed to load segments.';
  }

  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id, name, segment, discount_percent, promo_code, status, created_at, created_by')
    .order('created_at', { ascending: false })
    .limit(50);

  const campaignIds = (campaigns ?? []).map((c) => c.id);
  const sendCounts = new Map<string, { total: number; sent: number }>();
  if (campaignIds.length > 0) {
    const { data: sends } = await supabase
      .from('campaign_sends')
      .select('campaign_id, sent_at')
      .in('campaign_id', campaignIds);
    for (const row of sends ?? []) {
      const current = sendCounts.get(row.campaign_id) ?? { total: 0, sent: 0 };
      current.total += 1;
      if (row.sent_at) current.sent += 1;
      sendCounts.set(row.campaign_id, current);
    }
  }

  const initialCampaigns: CampaignHistoryRow[] = (campaigns ?? []).map((campaign) => {
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
      source: isAi ? 'ai' : 'manual',
      sent: stats.sent,
      total: stats.total,
    };
  });

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Email campaigns</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Marketing AI agent + manual send live here (not under Platform RAG &amp; AI). Segments: new /
          repeat / lapsed. Discount max {MAX_PROMO_DISCOUNT_PERCENT}%.
        </p>
      </div>

      {countsError ? (
        <div
          style={{
            padding: '1rem',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
          }}
        >
          Segment load failed: {countsError}. You can still try Refresh in the panel after the migration is applied.
        </div>
      ) : null}

      {campaignsError ? (
        <div
          style={{
            padding: '1rem',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
          }}
        >
          {campaignsError.message.includes('does not exist') || campaignsError.code === '42P01'
            ? 'campaigns table is missing — apply migration *_create_campaigns_and_sends.sql first.'
            : campaignsError.message}
        </div>
      ) : null}

      <CampaignsWorkspace initialCounts={counts} initialCampaigns={initialCampaigns} />
    </div>
  );
}
