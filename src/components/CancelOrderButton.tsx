'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function CancelOrderButton({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (status === 'cancelled' || status === 'delivered' || status === 'shipped' || status === 'out_for_delivery') {
    return null;
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        type="button"
        disabled={pending}
        className="btn-card-toggle"
        style={{
          padding: '0.35rem 0.75rem',
          fontSize: '0.75rem',
          color: 'var(--danger)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
        }}
        onClick={() => {
          setPending(true);
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
            router.refresh();
          });
        }}
      >
        {pending ? 'Cancelling…' : 'Cancel order'}
      </button>
      {error ? <span role="alert" style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>{error}</span> : null}
    </div>
  );
}
