'use client';

import { useEffect, useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';

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
    <section aria-label="Choose a friend">
      <div>
        <label htmlFor="friend-email">Friend email</label>
        <input id="friend-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
      </div>
      <div>
        <button type="button" onClick={() => { void send(email); }}>Send request</button>
      </div>
      <div>
        <label htmlFor="import-contacts">Import contacts</label>
        <input
          id="import-contacts"
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
      {notice ? <p role="status">{notice}</p> : null}
      <h3>Requests you sent</h3>
      <div>
        {outgoing.length === 0 ? <p>None yet.</p> : outgoing.map((row) => (
          <div key={row.id}>{row.label} · {row.status}</div>
        ))}
      </div>
      <h3>Friends</h3>
      <div>
        {friends.length === 0 ? <p>No friends yet.</p> : friends.map((row) => (
          <div key={row.id}>{row.label}</div>
        ))}
      </div>
    </section>
  );
}
