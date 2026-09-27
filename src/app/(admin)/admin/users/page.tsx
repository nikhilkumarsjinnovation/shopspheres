import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ResetBrandingButton from '@/components/admin/ResetBrandingButton';
import UserControls from '@/components/admin/UserControls';

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
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>User Accounts & Roles</h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Audit marketplace accounts, adjust access privileges, or suspend non-compliant users.
          </p>
        </div>
        <Link
          href="/admin/logs"
          style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-electric)' }}
        >
          View audit log &rarr;
        </Link>
      </div>

      <form action="/admin/users" style={{ display: 'flex', gap: '0.75rem', maxWidth: '480px', marginBottom: '2rem' }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by email address or full name..."
          className="auth-input"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-card-add" style={{ padding: '0.65rem 1.4rem' }}>
          Search
        </button>
      </form>

      {error ? (
        <div style={{ padding: '1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error.message}
        </div>
      ) : null}

      {(users ?? []).length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>
          No accounts found matching search &quot;{q}&quot;.
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Account Holder</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Role & Access Controls</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{user.full_name || 'Anonymous User'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{user.email}</div>
                  </td>
                  <td>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.825rem', color: user.role === 'admin' ? 'var(--accent-electric)' : user.role === 'seller' ? 'var(--warning)' : 'var(--fg-secondary)' }}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`portal-badge ${user.is_active ? 'active' : 'rejected'}`}>
                      {user.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <UserControls userId={user.id} role={user.role} isActive={user.is_active} />
                      {user.role === 'seller' ? <ResetBrandingButton sellerId={user.id} /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
