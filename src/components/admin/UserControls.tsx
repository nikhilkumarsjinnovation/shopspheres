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
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <select value={nextRole} disabled={busy} onChange={(event) => setNextRole(event.target.value as UserRole)}>
        {ROLES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <button type="button" disabled={busy || nextRole === role} onClick={() => void send({ role: nextRole })}>
        Save role
      </button>
      <button type="button" disabled={busy} onClick={() => void send({ is_active: !isActive })}>
        {isActive ? 'Suspend' : 'Restore'}
      </button>
      {message ? <span>{message}</span> : null}
    </div>
  );
}
