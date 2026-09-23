'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';
import type { ApprovalStatus } from '@/types/database.types';

export default function ProductDecision({
  productId,
  status,
}: {
  productId: string;
  status: ApprovalStatus;
}) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(next: ApprovalStatus) {
    if (next === 'rejected' && !reason.trim()) {
      setMessage('A rejection reason is required.');
      return;
    }
    setBusy(true);
    setMessage(null);
    const response = await fetchWithCsrf(`/api/v1/admin/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approval_status: next, rejection_reason: reason.trim() }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!response.ok) {
      setMessage(payload?.error ?? 'Could not update this product.');
      return;
    }
    setMessage('Saved.');
    router.refresh();
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {status !== 'approved' ? (
        <button type="button" disabled={busy} onClick={() => void send('approved')}>Approve</button>
      ) : (
        <button type="button" disabled={busy} onClick={() => void send('pending')}>Pull back to pending</button>
      )}
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Rejection reason"
        disabled={busy}
      />
      <button type="button" disabled={busy} onClick={() => void send('rejected')}>Reject</button>
      {message ? <span>{message}</span> : null}
    </div>
  );
}
