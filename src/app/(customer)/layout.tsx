import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { CartProvider } from '@/context/CartContext';
import CustomerNavbar from '@/components/CustomerNavbar';
import PersonalAiAssistant from '@/components/PersonalAiAssistant';
import BehaviorTracker from '@/components/BehaviorTracker';
import * as styles from './customer.css';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);

  if (!session) {
    redirect('/login');
  }

  if (!session.profile.is_active) {
    redirect('/login?error=account_inactive');
  }

  return (
    <CartProvider key={session.user.id} userId={session.user.id}>
      <div className={styles.layout}>
        <CustomerNavbar email={session.user.email} />
        <main className={styles.mainContent}>{children}</main>
        <PersonalAiAssistant />
        <BehaviorTracker userId={session.user.id} />
      </div>
    </CartProvider>
  );
}
