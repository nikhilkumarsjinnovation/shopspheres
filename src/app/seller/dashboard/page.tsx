import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';

export default async function SellerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile && profile.role !== 'seller' && profile.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Seller Dashboard</h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>Manage Your Shop & Inventory</p>
        </div>
        <SignOutButton />
      </header>

      <section style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', color: '#1e293b' }}>Active Merchant Session</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', fontSize: '0.95rem' }}>
          <strong>Email:</strong> <span>{user.email}</span>
          <strong>Role:</strong> <span style={{ textTransform: 'capitalize', color: '#059669', fontWeight: 600 }}>{profile?.role ?? 'seller'}</span>
          <strong>User ID:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{user.id}</span>
          <strong>Merchant:</strong> <span>{profile?.full_name || 'Store Owner'}</span>
        </div>
      </section>
    </div>
  );
}
