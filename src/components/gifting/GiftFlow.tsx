'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import FriendSelector from '@/components/gifting/FriendSelector';
import { fetchWithCsrf } from '@/lib/csrf-client';

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
  const chosen = products.find((product) => product.id === productId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!productId) {
      setError('Choose the product you want to gift.');
      return;
    }
    if (!recipientEmail) {
      setError('Choose who receives the gift.');
      return;
    }
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
      return;
    }
    router.push(`/gifts/${String(payload.gift.id)}`);
  };

  return (
    <form onSubmit={(event) => { void submit(event); }}>
      <div>
        <label htmlFor="gift-product">Product to gift</label>
        <select id="gift-product" value={productId} onChange={(event) => setProductId(event.target.value)} required>
          <option value="">Select a product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.title} · ₹{product.price}</option>
          ))}
        </select>
      </div>
      {chosen ? <p>You are gifting {chosen.title}.</p> : null}
      <FriendSelector onSelect={setRecipientEmail} />
      <p>Recipient: {recipientEmail || 'not chosen'}</p>
      <div>
        <label htmlFor="gift-message">Message</label>
        <textarea id="gift-message" value={message} onChange={(event) => setMessage(event.target.value)} />
      </div>
      <div>
        <label htmlFor="gift-reveal">Reveal</label>
        <select id="gift-reveal" value={revealTrigger} onChange={(event) => setRevealTrigger(event.target.value as 'manual' | 'date' | 'delivery')}>
          <option value="manual">When I choose</option>
          <option value="date">On a date</option>
          <option value="delivery">When the order is delivered</option>
        </select>
      </div>
      {revealTrigger === 'date' ? (
        <input type="datetime-local" value={revealDate} onChange={(event) => setRevealDate(event.target.value)} />
      ) : null}
      {error ? <div role="alert">{error}</div> : null}
      <button type="submit">Create gift</button>
    </form>
  );
}
