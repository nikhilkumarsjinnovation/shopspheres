import { createClient } from '@/lib/supabase/server';
import ResetBrandingButton from '@/components/admin/ResetBrandingButton';
import AdminPopulateControls from '@/components/admin/AdminPopulateControls';

export default async function AdminShopsPage() {
  const supabase = await createClient();
  const { data: shops, error } = await supabase
    .from('shops')
    .select('id, name, city, branding_edits_used, seller_id')
    .order('name', { ascending: true });
  const { data: products } = await supabase.from('products').select('shop_id');
  const counts = new Map<string, number>();
  for (const product of products ?? []) {
    if (!product.shop_id) continue;
    counts.set(product.shop_id, (counts.get(product.shop_id) ?? 0) + 1);
  }

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Merchant Storefronts & Quotas</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Overview of registered shops, active catalog volumes, and branding edit allowances.
        </p>
      </div>

      <AdminPopulateControls shops={(shops ?? []).map((s) => ({ id: s.id, name: s.name }))} />

      {error ? (
        <div style={{ padding: '1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error.message}
        </div>
      ) : null}

      {(shops ?? []).length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>
          No shops registered yet.
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Storefront Name</th>
                <th>Base City</th>
                <th>Catalog Items</th>
                <th>Branding Edits Used</th>
                <th style={{ textAlign: 'right' }}>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {(shops ?? []).map((shop) => (
                <tr key={shop.id}>
                  <td><strong>{shop.name}</strong></td>
                  <td style={{ color: 'var(--fg-secondary)' }}>{shop.city}</td>
                  <td>{counts.get(shop.id) ?? 0} listings</td>
                  <td>
                    <span style={{ fontWeight: 600, color: shop.branding_edits_used >= 2 ? 'var(--danger)' : 'var(--fg-primary)' }}>
                      {shop.branding_edits_used} / 2
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <ResetBrandingButton sellerId={shop.seller_id} />
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
