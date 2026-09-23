'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';
import layoutStyles from '@/app/seller/seller.module.css';

export default function SellerOrderActions({
  orderId,
  categories,
}: {
  orderId: string;
  categories: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  void searchParams.get('category');

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
      <p className={layoutStyles.muted}>Mini-shop: {categories.join(', ') || 'General'}</p>
      <div className={layoutStyles.actionRow}>
        <button type="button" className={layoutStyles.buttonGhost} onClick={() => { void mark('packed'); }}>Mark packed</button>
        <button type="button" className={layoutStyles.buttonGhost} onClick={() => { void mark('shipped'); }}>Mark shipped</button>
        <button type="button" className={layoutStyles.buttonGhost} onClick={() => { void mark('out_for_delivery'); }}>Out for delivery</button>
      </div>
    </div>
  );
}
