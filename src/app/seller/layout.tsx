import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { ensureSellerShop } from '@/lib/seller-shop';
import SellerSidebar from '@/components/SellerSidebar';
import styles from './seller.module.css';

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);

  if (!session || !session.profile.is_active || (session.profile.role !== 'seller' && session.profile.role !== 'admin')) {
    redirect('/login');
  }

  if (session.profile.role === 'seller') {
    try {
      await ensureSellerShop(supabase, session.user.id, session.profile.full_name, session.user.email ?? 'shop');
    } catch (error) {
      console.error('[seller shop]', error);
    }
  }

  return (
    <div className={styles.layout}>
      <SellerSidebar email={session.user.email} />
      <div className={styles.main}>
        {children}
      </div>
    </div>
  );
}
