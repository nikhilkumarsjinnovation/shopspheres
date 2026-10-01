import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProductDecision from '@/components/admin/ProductDecision';
import { formatINR } from '@/lib/formatters';
import { readModerationResult } from '@/lib/moderation-display';
import type { ApprovalStatus } from '@/types/database.types';

const FILTERS: Array<ApprovalStatus | 'all'> = ['pending', 'approved', 'rejected', 'all'];

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = FILTERS.includes(rawStatus as ApprovalStatus | 'all') ? (rawStatus as ApprovalStatus | 'all') : 'pending';
  const supabase = await createClient();
  let query = supabase
    .from('products')
    .select('id, title, price, stock, category, approval_status, rejection_reason, seller_id, attributes')
    .order('created_at', { ascending: false })
    .limit(50);
  if (status !== 'all') query = query.eq('approval_status', status);
  const { data: products, error } = await query;

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Catalog Moderation</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Approve, reject with feedback reasons, or review active and pending merchant listings.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {FILTERS.map((item) => {
          const isActive = status === item;
          return (
            <Link
              key={item}
              href={item === 'pending' ? '/admin/catalog' : `/admin/catalog?status=${item}`}
              className={`persona-pill ${isActive ? 'active' : ''}`}
              style={{ textTransform: 'capitalize' }}
            >
              {item}
            </Link>
          );
        })}
      </div>

      {error ? (
        <div style={{ padding: '1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error.message}
        </div>
      ) : null}

      {(products ?? []).length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>
          No products found with status &quot;{status}&quot;.
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Status</th>
                <th>AI confidence</th>
                <th>Price</th>
                <th>Stock</th>
                <th style={{ textAlign: 'right' }}>Actions & Decision</th>
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((product) => {
                const moderation = readModerationResult(product.attributes);
                return (
                <tr key={product.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      <Link href={`/admin/catalog/${product.id}`} style={{ color: 'var(--fg-primary)' }}>
                        {product.title}
                      </Link>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>{product.category}</div>
                    {product.rejection_reason ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                        Reason: {product.rejection_reason}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className={`portal-badge ${product.approval_status}`}>
                      {product.approval_status}
                    </span>
                  </td>
                  <td>
                    {moderation ? (
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {moderation.score}%
                        <span style={{ display: 'block', fontWeight: 500, fontSize: '0.72rem', color: 'var(--fg-muted)' }}>
                          {moderation.score >= 90
                            ? product.approval_status === 'approved'
                              ? 'auto-approve gate'
                              : '90%+ still ' + product.approval_status
                            : 'below 90%'}
                        </span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>No score</span>
                    )}
                  </td>
                  <td><strong>{formatINR(product.price)}</strong></td>
                  <td>{product.stock}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <Link
                        href={`/admin/catalog/${product.id}`}
                        style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-electric)' }}
                      >
                        View details &rarr;
                      </Link>
                      <ProductDecision productId={product.id} status={product.approval_status} />
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
