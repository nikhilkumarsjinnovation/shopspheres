import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRoleDashboardUrl } from '@/lib/auth/roles';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const targetUrl = getRoleDashboardUrl(profile?.role);
    redirect(targetUrl);
  }

  redirect('/login');
}
