import { createClient } from '@/lib/supabase/server';
import CampaignPanel from '@/components/admin/CampaignPanel';
import { loadSegmentSnapshot } from '@/services/campaign-segments';
import { createOrderUserLoader } from '@/services/campaign-store';

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
    .select('id, name, segment, discount_percent, promo_code, status, created_at')
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

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Email campaigns</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Segment customers from paid orders (new / repeat / lapsed) and send a Resend promo. Discount max 15%.
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

      <CampaignPanel initialCounts={counts} />

      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Recent campaigns</h2>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
          Rows appear after a successful create. Apply the campaigns migration if this table is empty with errors.
        </p>
      </div>

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

      {!campaignsError && (campaigns ?? []).length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--fg-muted)',
          }}
        >
          No campaigns yet. Pick a segment above and send one.
        </div>
      ) : null}

      {!campaignsError && (campaigns ?? []).length > 0 ? (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <table className="portal-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Name</th>
                <th>Code</th>
                <th>Segment</th>
                <th>Discount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Sends</th>
              </tr>
            </thead>
            <tbody>
              {(campaigns ?? []).map((campaign) => {
                const stats = sendCounts.get(campaign.id) ?? { total: 0, sent: 0 };
                return (
                  <tr key={campaign.id}>
                    <td style={{ color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(campaign.created_at).toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 600 }}>{campaign.name}</td>
                    <td>
                      <code style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        {campaign.promo_code ?? '—'}
                      </code>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          background: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        {campaign.segment}
                      </span>
                    </td>
                    <td>{campaign.discount_percent}%</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{campaign.status}</td>
                    <td style={{ textAlign: 'right' }}>
                      {stats.sent}/{stats.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
