'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';

export default function SellerOrderActions({
  orderId,
  categories,
}: {
  orderId: string;
  categories: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get('category') ?? '';

  const mark = async (action: 'packed' | 'shipped' | 'out_for_delivery') => {
    await fetchWithCsrf('/api/v1/seller/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, action }),
    });
    router.refresh();
  };

  return (
    <div>
      <p>Mini-shop: {categories.join(', ') || 'General'}</p>
      {selected ? null : null}
      <button type="button" onClick={() => { void mark('packed'); }}>Mark packed</button>
      <button type="button" onClick={() => { void mark('shipped'); }}>Mark shipped</button>
      <button type="button" onClick={() => { void mark('out_for_delivery'); }}>Out for delivery</button>
    </div>
  );
}
