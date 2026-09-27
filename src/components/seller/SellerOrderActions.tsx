'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Truck, Navigation } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function SellerOrderActions({
  orderId,
  categories,
}: {
  orderId: string;
  categories: string[];
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const mark = async (action: 'packed' | 'shipped' | 'out_for_delivery') => {
    setLoadingAction(action);
    try {
      await fetchWithCsrf('/api/v1/seller/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action }),
      });
      router.refresh();
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
        Department: <span style={{ fontWeight: 600, color: 'var(--fg-primary)' }}>{categories.join(', ') || 'General'}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn-card-toggle"
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
          disabled={Boolean(loadingAction)}
          onClick={() => { void mark('packed'); }}
        >
          <Package size={13} /> {loadingAction === 'packed' ? 'Updating…' : 'Mark Packed'}
        </button>
        <button
          type="button"
          className="btn-card-toggle"
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
          disabled={Boolean(loadingAction)}
          onClick={() => { void mark('shipped'); }}
        >
          <Truck size={13} /> {loadingAction === 'shipped' ? 'Updating…' : 'Mark Shipped'}
        </button>
        <button
          type="button"
          className="btn-card-add"
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.95rem' }}
          disabled={Boolean(loadingAction)}
          onClick={() => { void mark('out_for_delivery'); }}
        >
          <Navigation size={13} /> {loadingAction === 'out_for_delivery' ? 'Updating…' : 'Out for Delivery'}
        </button>
      </div>
    </div>
  );
}
