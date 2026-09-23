'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Gift } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import * as styles from '@/app/(customer)/customer.css';

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

  return (
    <div>
      <div className={styles.headerContainer}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h1 className={styles.heading}>Gifts</h1>
            <p className={styles.subheading}>Send and open gifts for friends.</p>
          </div>
          <Link href="/gifts/send" className={styles.buttonAddToCart} style={{ textDecoration: 'none' }}>
            <Gift size={15} aria-hidden />
            Send a gift
          </Link>
        </div>
      </div>
      {error ? <div className={styles.alertError} role="alert">{error}</div> : null}

      <section className={styles.sectionBlock}>
        <h2 className={styles.sectionLabel}>Sent</h2>
        {sent.length === 0 ? (
          <div className={styles.listCard}><p className={styles.listMeta}>No gifts sent yet.</p></div>
        ) : (
          <div className={styles.stack}>
            {sent.map((gift) => (
              <div key={gift.id} className={styles.listCard}>
                <Link className={styles.quietLink} href={`/gifts/${gift.id}`}>{gift.recipient_email ?? gift.id}</Link>
                <p className={styles.listMeta}>{gift.status}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.sectionBlock}>
        <h2 className={styles.sectionLabel}>Received</h2>
        {received.length === 0 ? (
          <div className={styles.listCard}><p className={styles.listMeta}>No gifts received yet.</p></div>
        ) : (
          <div className={styles.stack}>
            {received.map((gift) => (
              <div key={gift.id} className={styles.listCard}>
                <Link className={styles.quietLink} href={`/gifts/${gift.id}`}>Open gift</Link>
                <p className={styles.listMeta}>{gift.status}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
