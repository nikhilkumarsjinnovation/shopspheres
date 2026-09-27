import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlusCircle, ExternalLink, TrendingUp, Package, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { buildShopHealth } from '@/lib/seller-health';
import { formatINR } from '@/lib/formatters';
import type { Product } from '@/types/database.types';

export default async function SellerDashboardPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, branding_edits_used')
    .eq('seller_id', session.user.id)
    .maybeSingle();

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', session.user.id);
  const { data: sales } = await supabase
    .from('order_items')
    .select('order_id, quantity, unit_price, product:products(category)')
    .eq('seller_id', session.user.id);

  const saleRows = (sales ?? []).map((item) => {
    const linked = item.product;
    const details = Array.isArray(linked) ? linked[0] : linked;
    const category = details && typeof details === 'object' && 'category' in details && typeof details.category === 'string'
      ? details.category
      : 'General';
    return {
      category,
      quantity: item.quantity,
      revenue: Number(item.unit_price) * item.quantity,
      orderId: item.order_id,
    };
  });
  const health = buildShopHealth((products ?? []) as Product[], saleRows);
  const editsLeft = Math.max(0, 2 - (shop?.branding_edits_used ?? 0));

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{shop?.name ?? 'Merchant Portal'}</h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {editsLeft} branding edit{editsLeft === 1 ? '' : 's'} remaining
            {shop && (
              <> · <Link href={`/shops/${shop.id}`} style={{ color: 'var(--accent-electric)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>View Public Storefront <ExternalLink size={12} /></Link></>
            )}
          </p>
        </div>

        <Link
          href="/seller/add-product"
          className="btn-card-add"
          style={{ padding: '0.65rem 1.4rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <PlusCircle size={16} />
          <span>Add New Listing</span>
        </Link>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error.message}
        </div>
      )}

      {/* KPI Metrics Cards */}
      <div className="stat-cards-grid">
        <div className="stat-kpi-card">
          <div className="stat-kpi-label">Gross Revenue</div>
          <div className="stat-kpi-value" style={{ color: 'var(--success)' }}>{formatINR(health.revenue)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>From {health.orders} completed orders</div>
        </div>

        <div className="stat-kpi-card">
          <div className="stat-kpi-label">Live Listings</div>
          <div className="stat-kpi-value">{health.live}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>Approved and visible in feed</div>
        </div>

        <div className="stat-kpi-card">
          <div className="stat-kpi-label">Pending Review</div>
          <div className="stat-kpi-value" style={{ color: 'var(--warning)' }}>{health.pending}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>Under marketplace moderation</div>
        </div>

        <div className="stat-kpi-card">
          <div className="stat-kpi-label">Inventory Alert</div>
          <div className="stat-kpi-value" style={{ color: health.lowStock > 0 ? 'var(--danger)' : 'var(--fg-primary)' }}>{health.lowStock}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>Items low in stock (&lt; 5)</div>
        </div>
      </div>

      {/* Category Performance Breakdown */}
      <section style={{ marginTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Category Department Inventory</h2>
        {health.categories.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>
            No products listed yet. Click &quot;Add New Listing&quot; to publish your first product.
          </div>
        ) : (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total Listings</th>
                  <th>Live / Active</th>
                  <th>Under Review</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {health.categories.map((row) => (
                  <tr key={row.category}>
                    <td>
                      <strong>{row.category}</strong>
                    </td>
                    <td>{row.products}</td>
                    <td>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>{row.live}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{row.pending}</span>
                    </td>
                    <td>{row.unitsSold}</td>
                    <td>
                      <strong>{formatINR(row.revenue)}</strong>
                    </td>
                    <td>
                      <Link
                        href={`/seller/inventory/${encodeURIComponent(row.category)}`}
                        style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-electric)' }}
                      >
                        Manage &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
