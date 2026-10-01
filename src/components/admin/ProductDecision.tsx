'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';
import type { ApprovalStatus } from '@/types/database.types';
import { recheckListing, recheckSummary } from '@/lib/recheck-listing';
import { Check, X, RotateCcw, RefreshCw } from 'lucide-react';

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
  const [busyKind, setBusyKind] = useState<'status' | 'recheck' | null>(null);

  async function send(next: ApprovalStatus) {
    if (next === 'rejected' && !reason.trim()) {
      setMessage('Rejection reason required.');
      return;
    }
    setBusy(true);
    setBusyKind('status');
    setMessage(null);
    const response = await fetchWithCsrf(`/api/v1/admin/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approval_status: next, rejection_reason: reason.trim() }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    setBusyKind(null);
    if (!response.ok) {
      setMessage(payload?.error ?? 'Could not update.');
      return;
    }
    setMessage('Saved.');
    router.refresh();
  }

  async function recheck() {
    setBusy(true);
    setBusyKind('recheck');
    setMessage(null);
    try {
      const moderation = await recheckListing(productId);
      setMessage(recheckSummary(moderation));
      router.refresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'AI re-check failed.');
    } finally {
      setBusy(false);
      setBusyKind(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.45rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-card-toggle"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
          disabled={busy}
          onClick={() => void recheck()}
          title="Run the AI quality gate again. 90% or higher publishes the listing."
        >
          <RefreshCw size={12} /> {busyKind === 'recheck' ? 'Re-checking…' : 'Re-check'}
        </button>
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
      {message && (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color:
              message === 'Saved.' || message.startsWith('AI re-check approved') || message.startsWith('AI re-check left')
                ? 'var(--success)'
                : 'var(--danger)',
          }}
        >
          {message}
        </span>
      )}
    </div>
  );
}
