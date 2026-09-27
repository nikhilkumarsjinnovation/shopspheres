'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Gift, Send, PackageOpen, ArrowRight, Sparkles } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';

interface GiftRow {
  id: string;
  status: string;
  recipient_email: string | null;
  message: string | null;
}

export default function GiftsPage() {
  const searchParams = useSearchParams();
  const [sent, setSent] = useState<GiftRow[]>([]);
  const [received, setReceived] = useState<GiftRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWithCsrf('/api/v1/gifts')
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== 'object') {
          setError('Could not load gifts.');
          return;
        }
        if ('sent' in payload && Array.isArray(payload.sent)) setSent(payload.sent as GiftRow[]);
        if ('received' in payload && Array.isArray(payload.received)) setReceived(payload.received as GiftRow[]);
      })
      .catch(() => setError('Could not load gifts.'));
  }, []);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const pool = searchParams.get('pool');
    if (searchParams.get('stripe') !== 'success' || !sessionId || !pool) return;
    void fetchWithCsrf(`/api/v1/group-gifts/${pool}/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutSessionId: sessionId }),
    }).then(async (response) => {
      const payload: unknown = await response.json();
      setError(response.ok ? 'Payment recorded on group gift!' : (
        payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not confirm payment.'
      ));
    });
  }, [searchParams]);

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Gifting Hub</h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Delight friends and family with surprise gifts, digital unwraps, and thank-you notes.
          </p>
        </div>

        <Link
          href="/gifts/send"
          className="btn-card-add"
          style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <Gift size={16} />
          <span>Send a Gift</span>
        </Link>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1.5rem' }} role="alert">
          {error}
        </div>
      )}

      {/* Gifts Received Section */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <PackageOpen size={20} style={{ color: 'var(--accent-electric)' }} />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Gifts Received for You</h2>
        </div>

        {received.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', color: 'var(--fg-muted)' }}>
            No gifts received yet. When a friend sends you a surprise, it will appear here ready to unwrap!
          </div>
        ) : (
          <div className="gifts-hub-grid">
            {received.map((gift) => (
              <div key={gift.id} className="gift-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🎁</span>
                    <span
                      style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: gift.status === 'revealed' ? 'var(--success-bg)' : 'var(--accent-glow)',
                        color: gift.status === 'revealed' ? 'var(--success)' : 'var(--accent-electric)',
                      }}
                    >
                      {gift.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>A gift awaits you!</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: '1.25rem' }}>
                    {gift.message ? `"${gift.message}"` : 'A friend sent you a curated marketplace item.'}
                  </p>
                </div>

                <Link
                  href={`/gifts/${gift.id}`}
                  className="btn-card-add"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.55rem 1rem' }}
                >
                  <Sparkles size={14} /> Open & Unwrap Gift
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Gifts Sent Section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Send size={18} style={{ color: 'var(--fg-secondary)' }} />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Gifts You Sent</h2>
        </div>

        {sent.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', color: 'var(--fg-muted)' }}>
            You haven&apos;t sent any gifts yet. Surprise a friend from our catalog today!
          </div>
        ) : (
          <div className="gifts-hub-grid">
            {sent.map((gift) => (
              <div key={gift.id} className="gift-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>✨</span>
                    <span
                      style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: 'var(--bg-subtle)',
                        color: 'var(--fg-primary)',
                      }}
                    >
                      {gift.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Recipient: {gift.recipient_email ?? 'Friend'}
                  </h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--fg-muted)', marginBottom: '1.25rem' }}>
                    {gift.message ? `Note: "${gift.message}"` : 'No custom note attached.'}
                  </p>
                </div>

                <Link
                  href={`/gifts/${gift.id}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg-primary)' }}
                >
                  <span>View Details & Reveal Control</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
