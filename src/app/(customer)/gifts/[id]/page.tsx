'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
      <div>
        <p>{error ?? 'Loading gift…'}</p>
        <Link href="/gifts">Back to gifts</Link>
      </div>
    );
  }

  const { gift, role, sealed, product } = view;

  return (
    <div>
      <p><Link href="/gifts">Back to gifts</Link></p>
      <div>
        <h1>{sealed && role === 'recipient' ? 'A gift is waiting' : product?.title ?? 'Gift'}</h1>
      </div>
      {error ? <div role="alert">{error}</div> : null}

      {sealed && role === 'sender' ? (
        <section>
          <p>This gift is still hidden from {gift.recipient_email ?? 'the recipient'}.</p>
          {product ? <p>You chose {product.title} at {formatINR(product.price)}. They cannot see it until you reveal it.</p> : null}
          {product?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" width={160} height={160} />
          ) : null}
          <p>Reveal trigger: {gift.reveal_trigger}</p>
          <button type="button" disabled={pending} onClick={() => { void reveal(); }}>
            {pending ? 'Revealing…' : 'Reveal gift'}
          </button>
        </section>
      ) : null}

      {sealed && role === 'recipient' ? (
        <section>
          <p>
            The sender has not opened this gift yet. The product stays hidden until they reveal it, or until the agreed date or delivery.
          </p>
        </section>
      ) : null}

      {!sealed ? (
        <section>
          <p>This gift is open.</p>
          {product ? (
            <>
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt="" width={200} height={200} />
              ) : null}
              <h2>{product.title}</h2>
              <p>{formatINR(product.price)}</p>
            </>
          ) : <p>The product details are not on this gift.</p>}
          {gift.message ? <p>Note: {gift.message}</p> : null}
          {role === 'recipient' && gift.status !== 'thanked' ? (
            <form onSubmit={(event) => { void thank(event); }}>
              <div>
                <label htmlFor="thanks">Thank-you note</label>
                <textarea id="thanks" value={thanks} onChange={(event) => setThanks(event.target.value)} required />
              </div>
              <button type="submit" disabled={pending}>Send thanks</button>
            </form>
          ) : null}
          {gift.status === 'thanked' ? <p>Thanks were sent.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
