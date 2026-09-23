import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import GiftFlow from '@/components/gifting/GiftFlow';
import * as styles from '../../customer.css';

export default async function SendGiftPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  const { data: products } = await supabase
    .from('products')
    .select('id, title, price')
    .eq('approval_status', 'approved')
    .order('title')
    .limit(100);

  return (
    <div>
      <p style={{ marginBottom: '1rem' }}><Link className={styles.quietLink} href="/gifts">Back to gifts</Link></p>
      <div className={styles.headerContainer}>
        <h1 className={styles.heading}>Send a gift</h1>
        <p className={styles.subheading}>Pick the product first, then the person who should receive it.</p>
      </div>
      <div className={styles.surfaceCard}>
        <GiftFlow products={products ?? []} />
      </div>
    </div>
  );
}
