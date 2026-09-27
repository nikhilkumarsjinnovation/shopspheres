import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import AdminSidebar from '@/components/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);

  if (!session) {
    redirect('/login');
  }

  if (session.profile.role !== 'admin' || !session.profile.is_active) {
    redirect('/login?error=unauthorized');
  }

  return (
    <div>
      <AdminSidebar email={session.user.email} role={session.profile.role} />
      <main>{children}</main>
    </div>
  );
}
