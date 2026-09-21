import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SellerSidebar from '@/components/SellerSidebar';
import styles from './seller.module.css';

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active || (profile.role !== 'seller' && profile.role !== 'admin')) {
    redirect('/login');
  }

  return (
    <div className={styles.layout}>
      <SellerSidebar email={user.email} />
      <div className={styles.main}>
        {children}
      </div>
    </div>
  );
}
