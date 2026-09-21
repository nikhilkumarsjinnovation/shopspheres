import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CartProvider } from '@/context/CartContext';
import CustomerNavbar from '@/components/CustomerNavbar';
import * as styles from './customer.css';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect('/login?error=account_inactive');
  }

  return (
    <CartProvider>
      <div className={styles.layout}>
        <CustomerNavbar email={user.email} />
        <main className={styles.mainContent}>{children}</main>
      </div>
    </CartProvider>
  );
}
