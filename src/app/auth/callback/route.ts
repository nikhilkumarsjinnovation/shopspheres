import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRoleDashboardUrl } from '@/lib/auth/roles';
import type { UserRole } from '@/types/database.types';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Query user profile from public.users
        const { data: profile } = await supabase
          .from('users')
          .select('role, is_active')
          .eq('id', user.id)
          .single();

        let role: UserRole = 'customer';

        if (profile) {
          if (!profile.is_active) {
            await supabase.auth.signOut();
            return NextResponse.redirect(`${origin}/login?error=account_inactive`);
          }
          role = profile.role;
        } else {
          // If trigger did not run yet, insert default profile
          await supabase.from('users').insert({
            id: user.id,
            email: user.email ?? '',
            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
            role: 'customer',
          });
        }

        const destination = getRoleDashboardUrl(role);
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }
  }

  // Return to login with error if OAuth failed
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
