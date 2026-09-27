import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { buildShopHealth, categoryKey } from '@/lib/seller-health';
import { formatINR } from '@/lib/formatters';
import type { Product } from '@/types/database.types';

export default async function MiniShopPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const name = decodeURIComponent(category);
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');

  const { data: products } = await supabase.from('products').select('*').eq('seller_id', session.user.id);
  const { data: sales } = await supabase
    .from('order_items')
    .select('order_id, quantity, unit_price, product:products(category)')
    .eq('seller_id', session.user.id);

  const saleRows = (sales ?? []).map((item) => {
    const linked = item.product;
    const details = Array.isArray(linked) ? linked[0] : linked;
    return {
      category: details && typeof details === 'object' && 'category' in details && typeof details.category === 'string' ? details.category : 'General',
      quantity: item.quantity,
      revenue: Number(item.unit_price) * item.quantity,
      orderId: item.order_id,
    };
  });

  const health = buildShopHealth((products ?? []) as Product[], saleRows);
  const row = health.categories.find((item) => item.category === name);
  const list = ((products ?? []) as Product[]).filter((product) => categoryKey(product.category) === name);

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <Link
            href="/seller/dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--fg-muted)', fontWeight: 600, marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={14} /> Back to All Departments
          </Link>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{name} Department</h1>
        </div>

        <Link
          href={`/seller/add-product?category=${encodeURIComponent(name)}`}
          className="btn-card-add"
          style={{ padding: '0.65rem 1.4rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <PlusCircle size={16} />
          <span>Add Product to {name}</span>
        </Link>
      </div>

      {/* KPI Stats */}
      {row ? (
        <div className="stat-cards-grid" style={{ marginBottom: '2.5rem' }}>
          <div className="stat-kpi-card">
            <div className="stat-kpi-label">Total Listings</div>
            <div className="stat-kpi-value">{row.products}</div>
          </div>
          <div className="stat-kpi-card">
            <div className="stat-kpi-label">Active / Live</div>
            <div className="stat-kpi-value" style={{ color: 'var(--success)' }}>{row.live}</div>
          </div>
          <div className="stat-kpi-card">
            <div className="stat-kpi-label">Pending Approval</div>
            <div className="stat-kpi-value" style={{ color: 'var(--warning)' }}>{row.pending}</div>
          </div>
          <div className="stat-kpi-card">
            <div className="stat-kpi-label">Total Revenue</div>
            <div className="stat-kpi-value" style={{ color: 'var(--success)' }}>{formatINR(row.revenue)}</div>
          </div>
        </div>
      ) : null}

      {/* Products Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <table className="portal-table">
          <thead>
            <tr>
              <th>Product Title</th>
              <th>Status</th>
              <th>Inventory</th>
              <th>Price</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map((product) => (
              <tr key={product.id}>
                <td>
                  <strong style={{ color: 'var(--fg-primary)' }}>{product.title}</strong>
                </td>
                <td>
                  <span
                    className={`portal-badge ${product.approval_status === 'approved' ? 'active' : product.approval_status === 'rejected' ? 'rejected' : 'pending'}`}
                  >
                    {product.approval_status}
                  </span>
                </td>
                <td>{product.stock} in stock</td>
                <td>
                  <strong>{formatINR(Number(product.price))}</strong>
                </td>
                <td>
                  <Link
                    href={`/seller/products/${product.id}`}
                    className="btn-card-toggle"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--fg-muted)' }}>
                  No products in this department yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
