'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';
import type { UserRole } from '@/types/database.types';
import * as styles from '@/app/(admin)/admin.css';

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
    <div className={styles.actionButtonGroup}>
      <select
        value={nextRole}
        disabled={busy}
        onChange={(event) => setNextRole(event.target.value as UserRole)}
        style={{ height: 32, borderRadius: 0, border: '1px solid #404040', background: '#161616', color: '#e6e6e6', padding: '0 0.5rem' }}
      >
        {ROLES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <button type="button" className={styles.approveBtn} disabled={busy || nextRole === role} onClick={() => void send({ role: nextRole })}>
        Save role
      </button>
      <button type="button" className={isActive ? styles.rejectBtn : styles.approveBtn} disabled={busy} onClick={() => void send({ is_active: !isActive })}>
        {isActive ? 'Suspend' : 'Restore'}
      </button>
      {message ? <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a8a8a' }}>{message}</span> : null}
    </div>
  );
}
