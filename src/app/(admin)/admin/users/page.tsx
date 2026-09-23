import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ResetBrandingButton from '@/components/admin/ResetBrandingButton';
import UserControls from '@/components/admin/UserControls';
import * as styles from '../../admin.css';

function safeQuery(raw: string | undefined): string {
  return (raw ?? '').replace(/[%_,()]/g, '').trim().slice(0, 80);
}

export default async function UsersAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQuery } = await searchParams;
  const q = safeQuery(rawQuery);
  const supabase = await createClient();
  let query = supabase
    .from('users')
    .select('id, email, full_name, role, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (q) {
    query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }
  const { data: users, error } = await query;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Users</h1>
        <p className={styles.headerSubtitle}>Search accounts, change roles, and suspend access. Passwords stay in the auth system.</p>
      </div>
      <form action="/admin/users" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input name="q" defaultValue={q} placeholder="Email or name" />
        <button type="submit">Search</button>
      </form>
      {error ? <div className={styles.emptyState}>{error.message}</div> : null}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((user) => (
              <tr key={user.id} className={styles.tr}>
                <td className={styles.td}>{user.full_name || '—'}</td>
                <td className={styles.td}>{user.email}</td>
                <td className={styles.td}>{user.is_active ? 'Active' : 'Suspended'}</td>
                <td className={styles.td}>
                  <UserControls userId={user.id} role={user.role} isActive={user.is_active} />
                  {user.role === 'seller' ? <ResetBrandingButton sellerId={user.id} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(users ?? []).length === 0 ? <div className={styles.emptyState}>No accounts match this search.</div> : null}
      <p><Link href="/admin/logs">Open the audit log</Link></p>
    </div>
  );
}
