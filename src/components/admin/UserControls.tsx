'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';
import type { UserRole } from '@/types/database.types';

const ROLES: UserRole[] = ['customer', 'seller', 'admin'];

export default function UserControls({
  userId,
  role,
  isActive,
}: {
  userId: string;
  role: UserRole;
  isActive: boolean;
}) {
  const router = useRouter();
  const [nextRole, setNextRole] = useState<UserRole>(role);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(body: { role?: UserRole; is_active?: boolean }) {
    setBusy(true);
    setMessage(null);
    const response = await fetchWithCsrf(`/api/v1/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!response.ok) {
      setMessage(payload?.error ?? 'Could not update this user.');
      return;
    }
    setMessage('Saved.');
    router.refresh();
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
      <select
        value={nextRole}
        disabled={busy}
        onChange={(event) => setNextRole(event.target.value as UserRole)}
        className="custom-select"
        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', width: 'auto' }}
      >
        {ROLES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy || nextRole === role}
        onClick={() => void send({ role: nextRole })}
        className="btn-card-add"
        style={{
          padding: '0.35rem 0.75rem',
          fontSize: '0.78rem',
          opacity: nextRole === role ? 0.4 : 1,
          cursor: nextRole === role ? 'not-allowed' : 'pointer',
        }}
      >
        Save
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void send({ is_active: !isActive })}
        className="btn-card-toggle"
        style={{
          padding: '0.35rem 0.75rem',
          fontSize: '0.78rem',
          color: isActive ? 'var(--danger)' : 'var(--success)',
          borderColor: isActive ? 'var(--danger)' : 'var(--success-border)',
          background: isActive ? 'var(--danger-bg)' : 'var(--success-bg)',
        }}
      >
        {isActive ? 'Suspend' : 'Restore'}
      </button>
      {message ? (
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: message === 'Saved.' ? 'var(--success)' : 'var(--danger)' }}>
          {message}
        </span>
      ) : null}
    </div>
  );
}
