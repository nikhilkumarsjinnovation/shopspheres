'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Users, Check, X, Clock, UserCheck } from 'lucide-react';
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
    setNotice(status === 'accepted' ? 'You are now connected!' : 'Request declined.');
    setTimeout(() => setNotice(null), 4000);
    load();
  };

  return (
    <div className="friends-container animate-slide-up">
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Friends & Social Circle</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Connect with friends to send surprises, coordinate group gifts, and share favorite finds.
        </p>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }} role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600 }} role="status">
          ✓ {notice}
        </div>
      )}

      {/* 1. Incoming Requests */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Connection Requests Waiting</h2>
          {incoming.length > 0 && <span className="bag-badge">{incoming.length}</span>}
        </div>

        {incoming.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', color: 'var(--fg-muted)', fontSize: '0.9rem' }}>
            No incoming connection requests right now.
          </div>
        ) : (
          <div className="friend-requests-grid">
            {incoming.map((row) => {
              const name = row.label ?? 'ShopSphere User';
              const initial = name.charAt(0).toUpperCase();

              return (
                <div key={row.id} className="friend-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div className="friend-avatar">{initial}</div>
                    <div>
                      <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--fg-primary)' }}>{name}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>Sent you a friend request</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-card-add"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      onClick={() => { void respond(row.id, 'accepted'); }}
                    >
                      <Check size={14} /> Accept
                    </button>
                    <button
                      type="button"
                      className="btn-card-toggle"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => { void respond(row.id, 'blocked'); }}
                    >
                      <X size={14} /> Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. Outgoing Sent Requests */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>Sent Requests</h2>
        {outgoing.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', color: 'var(--fg-muted)', fontSize: '0.9rem' }}>
            No pending outgoing requests.
          </div>
        ) : (
          <div className="friend-requests-grid">
            {outgoing.map((row) => (
              <div key={row.id} className="friend-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div className="friend-avatar" style={{ background: 'var(--accent-glow)', color: 'var(--accent-electric)' }}>
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', display: 'block' }}>{row.label ?? 'ShopSphere User'}</strong>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>
                      <Clock size={12} /> Awaiting confirmation
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. My Friends Circle */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Your Friends Circle</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', fontWeight: 600 }}>({friends.length})</span>
        </div>

        {friends.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👥</div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>No friends added yet</h3>
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', maxWidth: '380px', margin: '0 auto' }}>
              Connect with fellow shoppers to send secret gifts and share curated collections.
            </p>
          </div>
        ) : (
          <div className="friend-requests-grid">
            {friends.map((row) => {
              const name = row.label ?? 'ShopSphere User';
              const initial = name.charAt(0).toUpperCase();

              return (
                <div key={row.id} className="friend-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div className="friend-avatar" style={{ background: 'var(--fg-primary)', color: 'var(--fg-inverted)' }}>
                      {initial}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.95rem', display: 'block' }}>{name}</strong>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                        <UserCheck size={12} /> Active Friend
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
