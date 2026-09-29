'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function CancelOrderButton({
  orderId,
  status,
  placedBy,
}: {
  orderId: string;
  status: string;
  placedBy?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isAgent = placedBy === 'agent';
  const nonCancellable = isAgent
    ? ['cancelled', 'delivered', 'shipped', 'out_for_delivery']
    : ['cancelled', 'delivered', 'shipped', 'out_for_delivery', 'processing', 'packed'];

  if (nonCancellable.includes(status)) {
    return null;
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        type="button"
        disabled={pending}
        className="btn-card-toggle"
        title={isAgent ? 'AI Agent purchase: Cancellable through packed status with instant 100% wallet refund' : 'Cancel order'}
        style={{
          padding: '0.35rem 0.75rem',
          fontSize: '0.75rem',
          color: 'var(--danger)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          background: isAgent ? 'rgba(239, 68, 68, 0.04)' : undefined,
        }}
        onClick={() => {
          setPending(true);
          setError(null);
          void fetchWithCsrf('/api/v1/orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId }),
          }).then(async (response) => {
            if (!response.ok) {
              const payload: unknown = await response.json();
              setError(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not cancel.');
              setPending(false);
              return;
            }
            if (isAgent && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('shopsphere:order-cancelled', { detail: { orderId } }));
            }
            router.refresh();
          });
        }}
      >
        {pending ? 'Refunding…' : isAgent ? '🤖 Cancel & Refund' : 'Cancel order'}
      </button>
      {error ? <span role="alert" style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>{error}</span> : null}
    </div>
  );
}
