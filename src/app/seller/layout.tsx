import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
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

  return (
    <div className={styles.layout}>
      <SellerSidebar email={session.user.email} />
      <div className={styles.main}>
        {children}
      </div>
    </div>
  );
}
