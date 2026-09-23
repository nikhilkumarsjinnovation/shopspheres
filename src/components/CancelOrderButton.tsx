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
    <div>
      <button
        type="button"
        disabled={pending}
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
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
