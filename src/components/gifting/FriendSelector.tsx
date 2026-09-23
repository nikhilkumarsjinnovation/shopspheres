'use client';

import { useEffect, useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import * as styles from '@/app/(customer)/customer.css';

export default function FriendSelector({
  onSelect,
}: {
  onSelect: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [outgoing, setOutgoing] = useState<Array<{ id: string; label?: string; status: string }>>([]);
  const [friends, setFriends] = useState<Array<{ id: string; label?: string; status: string }>>([]);

  useEffect(() => {
    fetchWithCsrf('/api/v1/friends')
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== 'object') return;
        if ('outgoing' in payload && Array.isArray(payload.outgoing)) setOutgoing(payload.outgoing as Array<{ id: string; label?: string; status: string }>);
        if ('friends' in payload && Array.isArray(payload.friends)) setFriends(payload.friends as Array<{ id: string; label?: string; status: string }>);
      })
      .catch(() => undefined);
  }, [notice]);

  const send = async (value: string) => {
    const response = await fetchWithCsrf('/api/v1/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: value }),
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Could not send request.';
      setNotice(message);
      return;
    }
    onSelect(value);
    setNotice(`Request sent to ${value}`);
    setEmail('');
  };

  return (
    <section className={styles.stack} aria-label="Choose a friend">
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="friend-email">Friend email</label>
        <input id="friend-email" className={styles.input} value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
      </div>
      <div className={styles.inlineActions}>
        <button type="button" className={styles.buttonSecondary} onClick={() => { void send(email); }}>Send request</button>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="import-contacts">Import contacts</label>
        <input
          id="import-contacts"
          className={styles.input}
          type="file"
          accept=".txt,.csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void file.text().then((text) => {
              const emails = text.split(/[\s,;]+/).filter((item) => item.includes('@'));
              for (const item of emails) void send(item);
            });
          }}
        />
      </div>
      {notice ? <p role="status" className={styles.listMeta}>{notice}</p> : null}
      <h3 className={styles.sectionLabel} style={{ fontSize: '1rem' }}>Requests you sent</h3>
      <div className={styles.stack}>
        {outgoing.length === 0 ? <p className={styles.listMeta}>None yet.</p> : outgoing.map((row) => (
          <div key={row.id} className={styles.listMeta}>{row.label} · {row.status}</div>
        ))}
      </div>
      <h3 className={styles.sectionLabel} style={{ fontSize: '1rem' }}>Friends</h3>
      <div className={styles.stack}>
        {friends.length === 0 ? <p className={styles.listMeta}>No friends yet.</p> : friends.map((row) => (
          <div key={row.id} className={styles.listMeta}>{row.label}</div>
        ))}
      </div>
    </section>
  );
}
