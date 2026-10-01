const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export type MetricBar = {
  label: string;
  value: number;
};

export function bucketByDay(
  rows: Array<{ at: string; amount: number }>,
  limit = 14,
): MetricBar[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const parsed = new Date(row.at);
    if (Number.isNaN(parsed.getTime())) continue;
    const key = new Date(parsed.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
    totals.set(key, (totals.get(key) ?? 0) + row.amount);
  }
  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([key, value]) => {
      const [, month, day] = key.split('-');
      const monthLabel = MONTHS[Number(month) - 1] ?? month;
      return { label: `${day} ${monthLabel}`, value };
    });
}

export default function MetricBars({
  title,
  caption,
  items,
  formatValue = (value) => String(value),
  empty,
}: {
  title: string;
  caption?: string;
  items: MetricBar[];
  formatValue?: (value: number) => string;
  empty: string;
}) {
  const max = items.reduce((peak, item) => Math.max(peak, item.value), 0);
  const summary = items.map((item) => `${item.label} ${formatValue(item.value)}`).join(', ');

  return (
    <section className="stat-kpi-card" aria-label={title}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{title}</h2>
      {caption && (
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--fg-muted)' }}>{caption}</p>
      )}
      {items.length === 0 || max <= 0 ? (
        <p style={{ margin: '1.25rem 0 0', color: 'var(--fg-muted)', fontSize: '0.875rem' }}>{empty}</p>
      ) : (
        <div
          role="img"
          aria-label={`${title}. ${summary}`}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '1.1rem' }}
        >
          {items.map((item) => (
            <div key={item.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.8rem', marginBottom: '0.28rem' }}>
                <span style={{ color: 'var(--fg-secondary)' }}>{item.label}</span>
                <strong>{formatValue(item.value)}</strong>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-muted)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(item.value / max) * 100}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: 'var(--accent-electric)',
                    minWidth: item.value > 0 ? 4 : 0,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
