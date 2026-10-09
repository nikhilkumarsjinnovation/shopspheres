'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { useCart } from '@/context/CartContext';

export default function StripeOrderNotice() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order');
    if (searchParams.get('stripe') !== 'success' || !sessionId || !orderId || started.current) return;
    started.current = true;
    void fetchWithCsrf('/api/v1/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, checkoutSessionId: sessionId }),
    }).then(async (response) => {
      const payload: unknown = await response.json();
      if (response.ok) clearCart();
      setMessage(response.ok
        ? 'Stripe test payment recorded. This order is confirmed.'
        : (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not confirm Stripe payment.'));
    });
  }, [searchParams, clearCart]);

  if (!message) return null;
  const isSuccess = message.includes('confirmed');
  return (
    <div
      role="status"
      style={{
        padding: '0.85rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.875rem',
        fontWeight: 600,
        marginBottom: '1.5rem',
        background: isSuccess ? 'var(--success-bg)' : 'var(--danger-bg)',
        color: isSuccess ? 'var(--success)' : 'var(--danger)',
        border: `1px solid ${isSuccess ? 'var(--success-border)' : 'var(--danger)'}`,
      }}
    >
      {message}
    </div>
  );
}
