'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';

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
    setNotice(status === 'accepted' ? 'You are now friends. They will see you in their Friends list too.' : 'Request declined.');
    load();
  };

  return (
    <main>
      <h1>Friends</h1>
      <p>When someone sends you a request, accept it here. After that, both of you see each other under Friends.</p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}

      <section>
        <h2>Requests waiting for you</h2>
        {incoming.length === 0 ? <p>No one is waiting on you.</p> : (
          <ul>
            {incoming.map((row) => (
              <li key={row.id}>
                {row.label ?? 'ShopSphere user'} sent you a request.
                <button type="button" onClick={() => { void respond(row.id, 'accepted'); }}>Accept</button>
                <button type="button" onClick={() => { void respond(row.id, 'blocked'); }}>Decline</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Requests you sent</h2>
        {outgoing.length === 0 ? <p>You have not sent a request.</p> : (
          <ul>
            {outgoing.map((row) => (
              <li key={row.id}>{row.label ?? 'ShopSphere user'} · waiting for them to accept</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Friends</h2>
        {friends.length === 0 ? <p>No accepted friends yet.</p> : (
          <ul>
            {friends.map((row) => <li key={row.id}>{row.label ?? 'ShopSphere user'}</li>)}
          </ul>
        )}
      </section>
    </main>
  );
}
