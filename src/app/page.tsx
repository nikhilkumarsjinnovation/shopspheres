import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getRoleDashboardUrl } from '@/lib/auth/roles';
import styles from './auth.module.css';

export default async function HomePage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);

  if (session) {
    redirect(getRoleDashboardUrl(session.profile.role));
  }

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <h1 className={styles.title}>ShopSphere</h1>
        <p className={styles.subtitle}>
          An Indian marketplace. Sign in to browse products and shop.
        </p>
        <p className={styles.footerText}>
          <Link className={styles.link} href="/login">Log in</Link>
          {' · '}
          <Link className={styles.link} href="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
