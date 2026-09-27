'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Sparkles, PackageCheck } from 'lucide-react';
import FriendSelector from '@/components/gifting/FriendSelector';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { formatINR } from '@/lib/formatters';

interface GiftProduct {
  id: string;
  title: string;
  price: number;
}

export default function GiftFlow({ products }: { products: GiftProduct[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [revealTrigger, setRevealTrigger] = useState<'manual' | 'date' | 'delivery'>('manual');
  const [revealDate, setRevealDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const chosen = products.find((product) => product.id === productId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!productId) {
      setError('Please choose a product to gift.');
      return;
    }
    if (!recipientEmail) {
      setError('Please select or specify who should receive the gift.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/v1/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          recipientEmail,
          message,
          revealTrigger,
          revealDate: revealDate || null,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== 'object' || !('gift' in payload) || !payload.gift || typeof payload.gift !== 'object' || !('id' in payload.gift)) {
        const text = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not create gift.';
        setError(text);
        setSubmitting(false);
        return;
      }
      router.push(`/gifts/${String(payload.gift.id)}`);
    } catch {
      setError('An unexpected error occurred while preparing your gift.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => { void submit(event); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Product Selection */}
      <div className="auth-form-group">
        <label htmlFor="gift-product" className="auth-label">
          1. Select Product to Gift
        </label>
        <select
          id="gift-product"
          className="custom-select"
          style={{ width: '100%', height: '2.85rem' }}
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          required
        >
          <option value="">Select a product from catalog</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.title} · {formatINR(product.price)}
            </option>
          ))}
        </select>
        {chosen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>
            <PackageCheck size={14} /> Selected: {chosen.title} ({formatINR(chosen.price)})
          </div>
        )}
      </div>

      {/* 2. Friend / Recipient Selection */}
      <div className="auth-form-group" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
        <label className="auth-label">2. Recipient Friend</label>
        <FriendSelector onSelect={setRecipientEmail} />
        {recipientEmail && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--fg-primary)', fontWeight: 600 }}>
            Target Recipient: <span style={{ color: 'var(--accent-electric)' }}>{recipientEmail}</span>
          </div>
        )}
      </div>

      {/* 3. Gift Note */}
      <div className="auth-form-group" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
        <label htmlFor="gift-message" className="auth-label">
          3. Personalized Message Note
        </label>
        <textarea
          id="gift-message"
          rows={3}
          className="auth-input"
          style={{ height: 'auto', padding: '0.75rem 1rem' }}
          placeholder="Write a sweet message, birthday wish, or congratulatory note..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>

      {/* 4. Reveal Trigger */}
      <div className="auth-form-group" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
        <label htmlFor="gift-reveal" className="auth-label">
          4. How Should the Gift Unfold?
        </label>
        <select
          id="gift-reveal"
          className="custom-select"
          style={{ width: '100%', height: '2.85rem' }}
          value={revealTrigger}
          onChange={(event) => setRevealTrigger(event.target.value as 'manual' | 'date' | 'delivery')}
        >
          <option value="manual">Manual Reveal (I will press reveal whenever ready)</option>
          <option value="date">Scheduled Reveal (Unwraps on specific date & time)</option>
          <option value="delivery">Doorstep Delivery (Unwraps automatically upon courier arrival)</option>
        </select>

        {revealTrigger === 'date' && (
          <div style={{ marginTop: '0.75rem' }}>
            <label className="auth-label">Scheduled Date & Time:</label>
            <input
              type="datetime-local"
              className="auth-input"
              value={revealDate}
              onChange={(event) => setRevealDate(event.target.value)}
              required
            />
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }} role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn-card-add"
        style={{ height: '3.1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
        disabled={submitting}
      >
        <Sparkles size={16} />
        <span>{submitting ? 'Creating Gift Package…' : 'Seal & Send Gift'}</span>
      </button>
    </form>
  );
}
