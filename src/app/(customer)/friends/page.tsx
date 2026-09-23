'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import * as styles from '@/app/(customer)/customer.css';

interface FriendRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  label?: string;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [incoming, setIncoming] = useState<FriendRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchWithCsrf('/api/v1/friends')
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) {
          setError(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not load friends.');
          return;
        }
        if (!payload || typeof payload !== 'object') return;
        if ('friends' in payload && Array.isArray(payload.friends)) setFriends(payload.friends as FriendRow[]);
        if ('incoming' in payload && Array.isArray(payload.incoming)) setIncoming(payload.incoming as FriendRow[]);
        if ('outgoing' in payload && Array.isArray(payload.outgoing)) setOutgoing(payload.outgoing as FriendRow[]);
      })
      .catch(() => setError('Could not load friends.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (id: string, status: 'accepted' | 'blocked') => {
    setError(null);
    const response = await fetchWithCsrf('/api/v1/friends', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      setError(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not update the request.');
      return;
    }
    setNotice(status === 'accepted' ? 'You are now friends.' : 'Request declined.');
    load();
  };

  return (
    <div>
      <div className={styles.headerContainer}>
        <h1 className={styles.heading}>Friends</h1>
        <p className={styles.subheading}>Accept requests here. After that, both of you appear in each other&apos;s lists.</p>
      </div>
      {error ? <div className={styles.alertError} role="alert">{error}</div> : null}
      {notice ? <div className={styles.alertSuccess} role="status">{notice}</div> : null}

      <section className={styles.sectionBlock}>
        <h2 className={styles.sectionLabel}>Requests waiting for you</h2>
        {incoming.length === 0 ? (
          <div className={styles.listCard}><p className={styles.listMeta}>No one is waiting on you.</p></div>
        ) : (
          <div className={styles.stack}>
            {incoming.map((row) => (
              <div key={row.id} className={styles.listCard}>
                <strong>{row.label ?? 'ShopSphere user'}</strong>
                <p className={styles.listMeta}>Sent you a friend request</p>
                <div className={styles.inlineActions}>
                  <button type="button" className={styles.buttonAddToCart} onClick={() => { void respond(row.id, 'accepted'); }}>Accept</button>
                  <button type="button" className={styles.buttonSecondary} onClick={() => { void respond(row.id, 'blocked'); }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.sectionBlock}>
        <h2 className={styles.sectionLabel}>Requests you sent</h2>
        {outgoing.length === 0 ? (
          <div className={styles.listCard}><p className={styles.listMeta}>You have not sent a request.</p></div>
        ) : (
          <div className={styles.stack}>
            {outgoing.map((row) => (
              <div key={row.id} className={styles.listCard}>
                <div className={styles.inlineActions}>
                  <UserPlus size={16} aria-hidden />
                  <strong>{row.label ?? 'ShopSphere user'}</strong>
                </div>
                <p className={styles.listMeta}>Waiting for them to accept</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.sectionBlock}>
        <h2 className={styles.sectionLabel}>Friends</h2>
        {friends.length === 0 ? (
          <div className={styles.listCard}><p className={styles.listMeta}>No accepted friends yet.</p></div>
        ) : (
          <div className={styles.stack}>
            {friends.map((row) => (
              <div key={row.id} className={styles.listCard}>
                <div className={styles.inlineActions}>
                  <Users size={16} aria-hidden />
                  <strong>{row.label ?? 'ShopSphere user'}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
