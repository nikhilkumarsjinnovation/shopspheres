import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/formatters';
import { parsePlatformStats } from '@/lib/platform-stats';
import { getCommittedChurnArtifacts } from '@/services/churn-model-artifacts';

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ padding: '1.1rem 1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '0.35rem' }}>{value}</div>
      {note ? <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: '0.35rem' }}>{note}</div> : null}
    </div>
  );
}

function readF1(metrics: unknown): string {
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) return '—';
  const f1 = (metrics as { f1?: unknown }).f1;
  return typeof f1 === 'number' && Number.isFinite(f1) ? f1.toFixed(4) : '—';
}

export default async function AdminMetricsPage() {
  const supabase = await createClient();
  const { data: statsRaw, error: statsError } = await supabase.rpc('admin_platform_stats');
  const stats = parsePlatformStats(statsRaw);
  const orderTotal = stats
    ? Object.values(stats.orders_by_status).reduce((sum, count) => sum + count, 0)
    : 0;

  const { data: modelRows, error: modelsError } = await supabase
    .from('ml_models')
    .select('name, version, artifact_uri, is_active, metrics')
    .in('name', ['next_purchase_predictor', 'churn_scorer', 'category_affinity_ranker'])
    .order('name');

  const { count: campaignCount } = await supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true });

  const { count: sendCount } = await supabase
    .from('campaign_sends')
    .select('id', { count: 'exact', head: true })
    .not('sent_at', 'is', null);

  const committed = getCommittedChurnArtifacts();
  const sentryConfigured = Boolean(process.env.SENTRY_DSN);

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Platform Metrics</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Ops snapshot: marketplace totals, campaign volume, ML registry F1, and Sentry status.
        </p>
      </div>

      {statsError || !stats ? (
        <div style={{ padding: '1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          Platform stats unavailable. {statsError?.message ?? ''}
        </div>
      ) : (
        <div className="stat-cards-grid" style={{ marginBottom: '2rem' }}>
          <Metric label="GMV" value={formatINR(stats.gmv)} note="Sum of order totals" />
          <Metric label="Orders" value={String(orderTotal)} note={`${stats.users_active} active accounts`} />
          <Metric label="Campaigns" value={String(campaignCount ?? 0)} note={`${sendCount ?? 0} sends with sent_at`} />
          <Metric label="Sentry" value={sentryConfigured ? 'On' : 'Off'} note={sentryConfigured ? 'SENTRY_DSN set' : 'Set SENTRY_DSN to capture route errors'} />
        </div>
      )}

      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>ML model registry</h2>
        <Link href="/admin/dashboard" className="portal-quiet" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Back to dashboard
        </Link>
      </div>

      {modelsError ? (
        <div style={{ padding: '1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)' }}>
          {modelsError.message}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '2rem' }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Version</th>
                <th>Artifact</th>
                <th>Active</th>
                <th style={{ textAlign: 'right' }}>F1 (DB)</th>
              </tr>
            </thead>
            <tbody>
              {(modelRows ?? []).map((row) => (
                <tr key={row.name}>
                  <td style={{ fontWeight: 600 }}>{row.name}</td>
                  <td><code style={{ fontSize: '0.8rem' }}>{row.version}</code></td>
                  <td><code style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{row.artifact_uri}</code></td>
                  <td>{row.is_active ? 'yes' : 'no'}</td>
                  <td style={{ textAlign: 'right' }}>{readF1(row.metrics)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.75rem' }}>Committed churn artifacts (offline fixture)</h2>
      <div className="stat-cards-grid">
        <Metric
          label="next_purchase_predictor F1"
          value={committed.nextPurchase.metrics.f1.toFixed(4)}
          note={committed.nextPurchase.artifactUri}
        />
        <Metric
          label="churn_scorer F1"
          value={committed.churn.metrics.f1.toFixed(4)}
          note={committed.churn.artifactUri}
        />
      </div>
    </div>
  );
}
