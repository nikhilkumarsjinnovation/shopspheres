import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Store } from 'lucide-react';
import * as styles from '../customer.css';

export default async function ShopsPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  const { data: shops } = await supabase
    .from('shops')
    .select('id, name, city, state, rating, is_verified, description')
    .order('name');

  return (
    <div>
      <div className={styles.headerContainer}>
        <h1 className={styles.heading}>Shops</h1>
        <p className={styles.subheading}>Browse products by the shop that sells them.</p>
      </div>
      {(shops ?? []).length === 0 ? (
        <div className={styles.emptyState}>No shops are listed yet.</div>
      ) : (
        <div className={styles.shopGrid}>
          {(shops ?? []).map((shop) => (
            <Link key={shop.id} href={`/shops/${shop.id}`} className={styles.listCard} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={styles.inlineActions}>
                <Store size={16} aria-hidden />
                <strong>{shop.name}</strong>
                {shop.is_verified ? <span className={styles.listMeta}>Verified</span> : null}
              </div>
              <p className={styles.listMeta}>{shop.city}, {shop.state} · {shop.rating.toFixed(1)}</p>
              {shop.description ? <p className={styles.listMeta}>{shop.description}</p> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
