'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
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
    setNotice(status === 'accepted' ? 'You are now friends.' : 'Request declined.');
    load();
  };

  return (
    <div>
      <div>
        <h1>Friends</h1>
        <p>Accept requests here. After that, both of you appear in each other&apos;s lists.</p>
      </div>
      {error ? <div role="alert">{error}</div> : null}
      {notice ? <div role="status">{notice}</div> : null}

      <section>
        <h2>Requests waiting for you</h2>
        {incoming.length === 0 ? (
          <div><p>No one is waiting on you.</p></div>
        ) : (
          <div>
            {incoming.map((row) => (
              <div key={row.id}>
                <strong>{row.label ?? 'ShopSphere user'}</strong>
                <p>Sent you a friend request</p>
                <div>
                  <button type="button" onClick={() => { void respond(row.id, 'accepted'); }}>Accept</button>
                  <button type="button" onClick={() => { void respond(row.id, 'blocked'); }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Requests you sent</h2>
        {outgoing.length === 0 ? (
          <div><p>You have not sent a request.</p></div>
        ) : (
          <div>
            {outgoing.map((row) => (
              <div key={row.id}>
                <div>
                  <UserPlus size={16} aria-hidden />
                  <strong>{row.label ?? 'ShopSphere user'}</strong>
                </div>
                <p>Waiting for them to accept</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Friends</h2>
        {friends.length === 0 ? (
          <div><p>No accepted friends yet.</p></div>
        ) : (
          <div>
            {friends.map((row) => (
              <div key={row.id}>
                <div>
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
