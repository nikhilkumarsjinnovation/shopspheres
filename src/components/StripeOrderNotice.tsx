'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function StripeOrderNotice() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order');
    if (searchParams.get('stripe') !== 'success' || !sessionId || !orderId) return;
    void fetchWithCsrf('/api/v1/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, checkoutSessionId: sessionId }),
    }).then(async (response) => {
      const payload: unknown = await response.json();
      setMessage(response.ok
        ? 'Stripe test payment recorded. This order is confirmed.'
        : (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not confirm Stripe payment.'));
    });
  }, [searchParams]);

  if (!message) return null;
  return <p role="status">{message}</p>;
}
