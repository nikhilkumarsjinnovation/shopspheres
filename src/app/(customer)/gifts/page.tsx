'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
      setError(response.ok ? 'Stripe test payment recorded on the group gift.' : (
        payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not confirm Stripe payment.'
      ));
    });
  }, [searchParams]);

  const payWithStripe = async (poolId: string, amount: number) => {
    const response = await fetchWithCsrf(`/api/v1/group-gifts/${poolId}/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    const payload: unknown = await response.json();
    if (!response.ok || !payload || typeof payload !== 'object' || !('checkoutUrl' in payload) || typeof payload.checkoutUrl !== 'string') {
      setError(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not start Stripe checkout.');
      return;
    }
    window.location.assign(payload.checkoutUrl);
  };

  return (
    <main>
      <h1>Gifts</h1>
      <p><Link href="/gifts/send">Send a gift</Link></p>
      {error ? <p role="alert">{error}</p> : null}
      <h2>Sent</h2>
      <ul>
        {sent.map((gift) => (
          <li key={gift.id}><Link href={`/gifts/${gift.id}`}>{gift.recipient_email ?? gift.id}</Link> · {gift.status}</li>
        ))}
      </ul>
      <h2>Received</h2>
      <ul>
        {received.map((gift) => (
          <li key={gift.id}><Link href={`/gifts/${gift.id}`}>{gift.status}</Link></li>
        ))}
      </ul>
      {false && (
        <>
          <h2>Group gift, pay with Stripe test card</h2>
          <GroupGiftPay onPay={payWithStripe} />
        </>
      )}
    </main>
  );
}

function GroupGiftPay({ onPay }: { onPay: (poolId: string, amount: number) => Promise<void> }) {
  const [pools, setPools] = useState<Array<{ id: string; title: string; status: string }>>([]);
  const [poolId, setPoolId] = useState('');
  const [amount, setAmount] = useState(500);

  useEffect(() => {
    fetchWithCsrf('/api/v1/group-gifts')
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (payload && typeof payload === 'object' && 'pools' in payload && Array.isArray(payload.pools)) {
          const rows = payload.pools.filter((pool): pool is { id: string; title: string; status: string } => {
            return Boolean(pool) && typeof pool === 'object' && 'id' in pool && 'title' in pool && 'status' in pool;
          });
          setPools(rows);
          const first = rows[0];
          if (first) setPoolId(first.id);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <form onSubmit={(event) => { event.preventDefault(); void onPay(poolId, amount); }}>
      <label>
        Pool
        <select value={poolId} onChange={(event) => setPoolId(event.target.value)}>
          {pools.map((pool) => <option key={pool.id} value={pool.id}>{pool.title} · {pool.status}</option>)}
        </select>
      </label>
      <label>
        Amount in ₹
        <input type="number" min={1} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
      </label>
      <button type="submit">Pay with Stripe</button>
      <p>Use test card 4242 4242 4242 4242. This only works after you create a group gift pool.</p>
    </form>
  );
}
