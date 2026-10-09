'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Loader2, Megaphone, RefreshCw } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { CAMPAIGN_SEGMENTS, type CampaignSegment } from '@/services/campaign-segments';
import { MAX_PROMO_DISCOUNT_PERCENT } from '@/services/resend-mail';

type SegmentCounts = Record<CampaignSegment, number>;

type Props = {
  initialCounts?: SegmentCounts | null;
};

export default function CampaignPanel({ initialCounts = null }: Props) {
  const [counts, setCounts] = useState<SegmentCounts | null>(initialCounts);
  const [segment, setSegment] = useState<CampaignSegment>('new');
  const [discountPercent, setDiscountPercent] = useState('15');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [pending, startTransition] = useTransition();

  const refreshCounts = useCallback(async () => {
    setLoadingCounts(true);
    setMessage(null);
    try {
      const res = await fetchWithCsrf('/api/v1/campaigns/segments');
      const data = (await res.json()) as { ok?: boolean; counts?: SegmentCounts; error?: string };
      if (!res.ok || !data.counts) {
        throw new Error(data.error || 'Failed to load segment counts.');
      }
      setCounts(data.counts);
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to load segments.',
        isError: true,
      });
    } finally {
      setLoadingCounts(false);
    }
  }, []);

  useEffect(() => {
    if (!initialCounts) {
      void refreshCounts();
    }
  }, [initialCounts, refreshCounts]);

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    const discount = Number.parseInt(discountPercent, 10);
    if (!Number.isInteger(discount) || discount < 1 || discount > MAX_PROMO_DISCOUNT_PERCENT) {
      setMessage({
        text: `Discount must be an integer from 1 to ${MAX_PROMO_DISCOUNT_PERCENT}.`,
        isError: true,
      });
      return;
    }

    startTransition(async () => {
      setMessage(null);
      try {
        const res = await fetchWithCsrf('/api/v1/campaigns/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segment,
            discountPercent: discount,
            name: name.trim() || undefined,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          campaignId?: string;
          promoCode?: string;
          discountPercent?: number;
          attempted?: number;
          sent?: number;
          emailed?: number;
          emailFailures?: Array<{ email: string; error: string }>;
        };
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Campaign send failed.');
        }
        const failHint =
          data.emailFailures && data.emailFailures.length > 0
            ? ` Email failures: ${data.emailFailures
                .slice(0, 2)
                .map((f) => `${f.email} (${f.error})`)
                .join('; ')}.`
            : ' With onboarding@resend.dev, mail is redirected to RESEND_SANDBOX_TO (no domain needed).';
        const emailed = data.emailed ?? 0;
        const codeHint = data.promoCode ? ` Code ${data.promoCode} (${data.discountPercent ?? discount}%).` : '';
        setMessage({
          text: `Campaign ${data.campaignId?.slice(0, 8)} — in-app ${data.sent ?? 0}/${data.attempted ?? 0}, emailed ${emailed}.${codeHint}${failHint}`,
          isError: emailed === 0 && (data.attempted ?? 0) > 0,
        });
        setTimeout(() => {
          window.location.reload();
        }, emailed === 0 ? 4000 : 1200);
      } catch (err: unknown) {
        setMessage({
          text: err instanceof Error ? err.message : 'Campaign send failed.',
          isError: true,
        });
      }
    });
  };

  const busy = pending || loadingCounts;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Megaphone size={18} />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Send promo campaign</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--fg-muted)' }}>
              One segment per send. Discount capped at {MAX_PROMO_DISCOUNT_PERCENT}%.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refreshCounts()}
          disabled={busy}
          className="portal-quiet"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            opacity: busy ? 0.6 : 1,
          }}
        >
          {loadingCounts ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh counts
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        {CAMPAIGN_SEGMENTS.map((key) => (
          <div
            key={key}
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              border: segment === key ? '1px solid var(--accent-electric)' : '1px solid transparent',
            }}
          >
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>
              {key}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '0.25rem' }}>
              {counts ? counts[key] : '—'}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} style={{ display: 'grid', gap: '1rem', maxWidth: '520px' }}>
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Segment</span>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value as CampaignSegment)}
            disabled={busy}
            style={{
              padding: '0.65rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              color: 'var(--fg-primary)',
            }}
          >
            {CAMPAIGN_SEGMENTS.map((key) => (
              <option key={key} value={key}>
                {key} {counts ? `(${counts[key]})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Discount %</span>
          <input
            type="number"
            min={1}
            max={MAX_PROMO_DISCOUNT_PERCENT}
            step={1}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            disabled={busy}
            required
            style={{
              padding: '0.65rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              color: 'var(--fg-primary)',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Campaign name (optional)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            placeholder="e.g. October new-buyer thank you"
            maxLength={120}
            style={{
              padding: '0.65rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              color: 'var(--fg-primary)',
            }}
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'var(--fg-primary)',
            color: 'var(--fg-inverted)',
            fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.7 : 1,
          }}
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
          {pending ? 'Sending…' : 'Send campaign'}
        </button>
      </form>

      {message ? (
        <div
          role="status"
          style={{
            marginTop: '1rem',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: message.isError ? 'var(--danger-bg)' : 'var(--bg-subtle)',
            color: message.isError ? 'var(--danger)' : 'var(--fg-primary)',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
