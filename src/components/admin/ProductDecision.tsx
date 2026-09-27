'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';
import type { ApprovalStatus } from '@/types/database.types';
import { Check, X, RotateCcw } from 'lucide-react';

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
      setMessage('Rejection reason required.');
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
      setMessage(payload?.error ?? 'Could not update.');
      return;
    }
    setMessage('Saved.');
    router.refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.45rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {status !== 'approved' ? (
          <button
            type="button"
            className="btn-card-add"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'var(--success)' }}
            disabled={busy}
            onClick={() => void send('approved')}
          >
            <Check size={12} /> Approve
          </button>
        ) : (
          <button
            type="button"
            className="btn-card-toggle"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            disabled={busy}
            onClick={() => void send('pending')}
          >
            <RotateCcw size={12} /> Pull to Pending
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.35rem' }}>
        <input
          className="auth-input"
          style={{ height: '2rem', fontSize: '0.75rem', padding: '0 0.5rem' }}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Rejection reason…"
          disabled={busy}
        />
        <button
          type="button"
          className="btn-card-toggle"
          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: 'var(--danger)' }}
          disabled={busy}
          onClick={() => void send('rejected')}
        >
          <X size={12} /> Reject
        </button>
      </div>
      {message && <span style={{ fontSize: '0.75rem', color: message === 'Saved.' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{message}</span>}
    </div>
  );
}
