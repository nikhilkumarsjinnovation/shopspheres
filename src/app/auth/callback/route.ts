import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRoleDashboardUrl } from '@/lib/auth/roles';
import type { UserRole } from '@/types/database.types';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const isVerified = searchParams.get('verified') === 'true';
  const requestedRole = searchParams.get('role') as UserRole | null;

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
          // If trigger did not run yet, insert profile with requested role (default to customer)
          const assignedRole: UserRole =
            requestedRole === 'seller' || requestedRole === 'admin' ? requestedRole : 'customer';

          await supabase.from('users').insert({
            id: user.id,
            email: user.email ?? '',
            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
            role: assignedRole,
          });

          role = assignedRole;
        }

        // If this callback was triggered by email verification link
        if (isVerified) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?verified=true`);
        }

        const next = searchParams.get('next');
        const type = searchParams.get('type');

        if (next) {
          return NextResponse.redirect(`${origin}${next}`);
        }

        if (type === 'recovery') {
          return NextResponse.redirect(`${origin}/reset-password`);
        }

        const destination = getRoleDashboardUrl(role);
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }
  }

  // Return to login with error if OAuth or verification exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
