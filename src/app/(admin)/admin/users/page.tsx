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
    <div>
      <div>
        <h1>Users</h1>
        <p>Search accounts, change roles, and suspend access. Passwords stay in the auth system.</p>
      </div>
      <form action="/admin/users">
        <input name="q" defaultValue={q} placeholder="Email or name" />
        <button type="submit">Search</button>
      </form>
      {error ? <div>{error.message}</div> : null}
      <div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((user) => (
              <tr key={user.id}>
                <td>{user.full_name || '—'}</td>
                <td>{user.email}</td>
                <td>{user.is_active ? 'Active' : 'Suspended'}</td>
                <td>
                  <UserControls userId={user.id} role={user.role} isActive={user.is_active} />
                  {user.role === 'seller' ? <ResetBrandingButton sellerId={user.id} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(users ?? []).length === 0 ? <div>No accounts match this search.</div> : null}
      <p><Link href="/admin/logs">Open the audit log</Link></p>
    </div>
  );
}
