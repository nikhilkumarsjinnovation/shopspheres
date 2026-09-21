import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminSidebar from '@/components/AdminSidebar';
import * as styles from './admin.css';

export default async function AdminLayout({
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

  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    redirect('/login?error=unauthorized');
  }

  return (
    <div className={styles.layoutContainer}>
      <AdminSidebar email={user.email} role={profile.role} />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
