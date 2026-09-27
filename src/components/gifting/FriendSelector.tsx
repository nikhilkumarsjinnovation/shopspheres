'use client';

import { useEffect, useState } from 'react';
import { UserCheck, Send, Upload } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function FriendSelector({
  onSelect,
}: {
  onSelect: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [selectedFriendEmail, setSelectedFriendEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [friends, setFriends] = useState<Array<{ id: string; label?: string; status: string }>>([]);

  useEffect(() => {
    fetchWithCsrf('/api/v1/friends')
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== 'object') return;
        if ('friends' in payload && Array.isArray(payload.friends)) setFriends(payload.friends as Array<{ id: string; label?: string; status: string }>);
      })
      .catch(() => undefined);
  }, [notice]);

  const handleManualEmail = (val: string) => {
    setEmail(val);
    setSelectedFriendEmail(val);
    onSelect(val);
  };

  const handleSelectFriend = (friendEmail: string) => {
    setSelectedFriendEmail(friendEmail);
    setEmail(friendEmail);
    onSelect(friendEmail);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Quick Select from Connected Friends */}
      {friends.length > 0 && (
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: '0.4rem' }}>
            Quick Pick from Your Friends:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {friends.map((friend) => {
              const friendEmail = friend.label || '';
              const isSelected = selectedFriendEmail === friendEmail;

              return (
                <button
                  key={friend.id}
                  type="button"
                  className={`variant-option-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectFriend(friendEmail)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <UserCheck size={13} />
                  <span>{friend.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Or Type Email Directly */}
      <div>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: '0.4rem' }}>
          Or enter recipient email address:
        </span>
        <input
          id="friend-email"
          type="email"
          className="auth-input"
          placeholder="friend@example.com"
          value={email}
          onChange={(event) => handleManualEmail(event.target.value)}
          required
        />
      </div>

      {notice && (
        <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
          {notice}
        </div>
      )}
    </div>
  );
}
