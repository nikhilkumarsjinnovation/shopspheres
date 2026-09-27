'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Gift, Sparkles, Send, Check } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { formatINR } from '@/lib/formatters';

interface GiftView {
  gift: {
    id: string;
    status: string;
    message: string | null;
    recipient_email: string | null;
    reveal_trigger: string;
    revealed_at: string | null;
  };
  role: 'sender' | 'recipient';
  sealed: boolean;
  product: { title: string; price: number; imageUrl: string | null } | null;
}

export default function GiftDetailPage() {
  const params = useParams<{ id: string }>();
  const [view, setView] = useState<GiftView | null>(null);
  const [thanks, setThanks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = () => {
    fetchWithCsrf(`/api/v1/gifts/${params.id}`)
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== 'object' || !('gift' in payload)) {
          setError(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not load this gift.');
          return;
        }
        setView(payload as GiftView);
      })
      .catch(() => setError('Could not load this gift.'));
  };

  useEffect(() => {
    load();
  }, [params.id]);

  const reveal = async () => {
    setPending(true);
    setError(null);
    const response = await fetchWithCsrf(`/api/v1/gifts/${params.id}/reveal`, { method: 'POST' });
    const payload: unknown = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not reveal.');
      return;
    }
    load();
  };

  const thank = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetchWithCsrf(`/api/v1/gifts/${params.id}/thank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: thanks }),
    });
    const payload: unknown = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not send thanks.');
      return;
    }
    load();
  };

  if (!view) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--fg-muted)', marginBottom: '1rem' }}>{error ?? 'Loading gift package…'}</p>
        <Link href="/gifts" className="btn-card-toggle" style={{ display: 'inline-flex' }}>
          Back to gifts
        </Link>
      </div>
    );
  }

  const { gift, role, sealed, product } = view;

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '4rem' }}>
      <Link
        href="/gifts"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg-muted)', marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={14} /> Back to gifts hub
      </Link>

      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1.5rem' }} role="alert">
          {error}
        </div>
      )}

      {/* Case 1: Sealed & Recipient (Unopened Mystery Box) */}
      {sealed && role === 'recipient' && (
        <div className="gift-reveal-box">
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }} className="pulse-badge">🎁</div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>A Secret Gift Is Waiting For You!</h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 1.5rem' }}>
            The sender has sealed this surprise. It will automatically unwrap on the reveal date or when delivered to your doorstep!
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem', background: 'var(--accent-glow)', color: 'var(--accent-electric)', borderRadius: 'var(--radius-full)', fontSize: '0.825rem', fontWeight: 600 }}>
            <Sparkles size={14} /> Reveal trigger: {gift.reveal_trigger}
          </div>
        </div>
      )}

      {/* Case 2: Sealed & Sender (Sender Controls) */}
      {sealed && role === 'sender' && (
        <div className="gift-reveal-box">
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📦</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Gift Sent to {gift.recipient_email ?? 'Recipient'}</h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            This item is currently hidden and will stay a mystery until revealed.
          </p>

          {product && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem', textAlign: 'left' }}>
              {product.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt="" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
              )}
              <div>
                <strong style={{ display: 'block', fontSize: '1rem' }}>{product.title}</strong>
                <span style={{ fontSize: '0.875rem', color: 'var(--fg-muted)' }}>{formatINR(product.price)}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn-card-add"
            style={{ width: '100%', height: '3rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            disabled={pending}
            onClick={() => { void reveal(); }}
          >
            <Sparkles size={18} />
            <span>{pending ? 'Revealing Surprise…' : 'Reveal Surprise Now'}</span>
          </button>
        </div>
      )}

      {/* Case 3: Revealed Gift (Unwrapped Box) */}
      {!sealed && (
        <div className="gift-reveal-box" style={{ maxWidth: '640px' }}>
          <div style={{ display: 'inline-flex', padding: '0.35rem 0.95rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-full)', fontSize: '0.825rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            ✓ Surprise Unwrapped & Revealed!
          </div>

          {product && (
            <div style={{ marginBottom: '1.75rem' }}>
              {product.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: 'var(--radius-lg)', background: 'var(--bg-canvas)', marginBottom: '1rem' }}
                />
              )}
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.35rem' }}>{product.title}</h2>
              <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--fg-primary)' }}>{formatINR(product.price)}</p>
            </div>
          )}

          {gift.message && (
            <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', fontStyle: 'italic', color: 'var(--fg-secondary)', marginBottom: '1.75rem' }}>
              &quot;{gift.message}&quot;
            </div>
          )}

          {/* Thank-you note form for recipient */}
          {role === 'recipient' && gift.status !== 'thanked' && (
            <form onSubmit={(event) => { void thank(event); }} style={{ textAlign: 'left', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <label htmlFor="thanks" className="auth-label">
                Send a Thank-You Note to the Sender
              </label>
              <textarea
                id="thanks"
                rows={3}
                required
                className="auth-input"
                style={{ height: 'auto', padding: '0.75rem 1rem', marginBottom: '0.75rem' }}
                placeholder="Thank you so much for this wonderful gift! I love it..."
                value={thanks}
                onChange={(event) => setThanks(event.target.value)}
              />
              <button
                type="submit"
                className="btn-card-add"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.4rem' }}
                disabled={pending}
              >
                <Send size={14} />
                <span>{pending ? 'Sending Note…' : 'Send Thank You'}</span>
              </button>
            </form>
          )}

          {gift.status === 'thanked' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
              <Check size={16} /> Thank-you note was received by the sender.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
