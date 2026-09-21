import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';
import * as styles from '../../admin.css';

type UserRow = Database['public']['Tables']['users']['Row'];

export default async function UsersAuditPage() {
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

  const { data: usersData } = await supabase
    .from('users')
    .select('id, email, full_name, role, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  const users = (usersData || []) as UserRow[];

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Users Audit & Governance</h1>
        <p className={styles.headerSubtitle}>
          Platform user directory, security roles, and active authentication status records.
        </p>
      </div>

      <div className={styles.sectionTitle}>
        <span>Registered User Accounts ({users.length})</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>User ID</th>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Role</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Registered</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={styles.tr}>
                <td className={styles.td}>
                  <span className={styles.uuidCell} title={u.id}>
                    {u.id.slice(0, 8)}...{u.id.slice(-4)}
                  </span>
                </td>
                <td className={styles.td} style={{ color: '#f8fafc', fontWeight: 500 }}>
                  {u.email}
                </td>
                <td className={styles.td}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      backgroundColor:
                        u.role === 'admin'
                          ? 'rgba(244, 63, 94, 0.15)'
                          : u.role === 'seller'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                      color:
                        u.role === 'admin'
                          ? '#f43f5e'
                          : u.role === 'seller'
                          ? '#60a5fa'
                          : '#34d399',
                    }}
                  >
                    {u.role}
                  </span>
                </td>
                <td className={styles.td}>
                  <span
                    className={`${styles.statusBadge} ${
                      u.is_active ? styles.statusDelivered : styles.statusCancelled
                    }`}
                  >
                    {u.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className={styles.td} style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
