'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { formatINR } from '@/lib/formatters';
import * as styles from '@/app/(customer)/customer.css';

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
        <p className={styles.listMeta}>{error ?? 'Loading gift…'}</p>
        <Link className={styles.quietLink} href="/gifts">Back to gifts</Link>
      </div>
    );
  }

  const { gift, role, sealed, product } = view;

  return (
    <div>
      <p style={{ marginBottom: '1rem' }}><Link className={styles.quietLink} href="/gifts">Back to gifts</Link></p>
      <div className={styles.headerContainer}>
        <h1 className={styles.heading}>{sealed && role === 'recipient' ? 'A gift is waiting' : product?.title ?? 'Gift'}</h1>
      </div>
      {error ? <div className={styles.alertError} role="alert">{error}</div> : null}

      {sealed && role === 'sender' ? (
        <section className={styles.surfaceCard}>
          <p className={styles.listMeta}>This gift is still hidden from {gift.recipient_email ?? 'the recipient'}.</p>
          {product ? <p>You chose {product.title} at {formatINR(product.price)}. They cannot see it until you reveal it.</p> : null}
          {product?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" width={160} height={160} style={{ borderRadius: 0, objectFit: 'cover', margin: '0.75rem 0' }} />
          ) : null}
          <p className={styles.listMeta}>Reveal trigger: {gift.reveal_trigger}</p>
          <button type="button" className={styles.buttonAddToCart} disabled={pending} onClick={() => { void reveal(); }}>
            {pending ? 'Revealing…' : 'Reveal gift'}
          </button>
        </section>
      ) : null}

      {sealed && role === 'recipient' ? (
        <section className={styles.surfaceCard}>
          <p className={styles.listMeta}>
            The sender has not opened this gift yet. The product stays hidden until they reveal it, or until the agreed date or delivery.
          </p>
        </section>
      ) : null}

      {!sealed ? (
        <section className={styles.surfaceCard}>
          <p className={styles.listMeta}>This gift is open.</p>
          {product ? (
            <>
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt="" width={200} height={200} style={{ borderRadius: 0, objectFit: 'cover', margin: '0.75rem 0' }} />
              ) : null}
              <h2 className={styles.sectionLabel}>{product.title}</h2>
              <p>{formatINR(product.price)}</p>
            </>
          ) : <p className={styles.listMeta}>The product details are not on this gift.</p>}
          {gift.message ? <p>Note: {gift.message}</p> : null}
          {role === 'recipient' && gift.status !== 'thanked' ? (
            <form className={styles.stack} onSubmit={(event) => { void thank(event); }} style={{ marginTop: '1rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="thanks">Thank-you note</label>
                <textarea id="thanks" className={styles.input} value={thanks} onChange={(event) => setThanks(event.target.value)} required />
              </div>
              <button type="submit" className={styles.buttonAddToCart} disabled={pending}>Send thanks</button>
            </form>
          ) : null}
          {gift.status === 'thanked' ? <p className={styles.listMeta}>Thanks were sent.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
