import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getRoleDashboardUrl } from '@/lib/auth/roles';

export default async function HomePage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);

  if (session) {
    redirect(getRoleDashboardUrl(session.profile.role));
  }

  return (
    <main>
      <section>
        <h1>ShopSphere</h1>
        <p>
          An Indian marketplace. Sign in to browse products and shop.
        </p>
        <p>
          <Link href="/login">Log in</Link>
          {' · '}
          <Link href="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
