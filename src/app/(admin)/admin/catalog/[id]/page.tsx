import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductDecision from '@/components/admin/ProductDecision';
import ProductThumbnail from '@/components/ProductThumbnail';
import { formatINR } from '@/lib/formatters';
import { readModerationResult, sellerSpecEntries } from '@/lib/moderation-display';

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id,
      title,
      description,
      price,
      compare_at_price,
      stock,
      condition,
      category,
      sub_category,
      tags,
      attributes,
      image_urls,
      approval_status,
      rejection_reason,
      resubmit_count,
      ai_categorized,
      average_rating,
      review_count,
      seller_id,
      shop_id,
      created_at,
      updated_at
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return <div>{error.message}</div>;
  }
  if (!product) notFound();

  const { data: seller } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', product.seller_id)
    .maybeSingle();
  const { data: shop } = product.shop_id
    ? await supabase.from('shops').select('name, city').eq('id', product.shop_id).maybeSingle()
    : { data: null };

  const attributes = sellerSpecEntries(product.attributes);
  const moderation = readModerationResult(product.attributes);
  const images = product.image_urls ?? [];

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <Link
        href="/admin/catalog"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--fg-muted)',
          marginBottom: '1.5rem',
        }}
      >
        &larr; Back to catalog
      </Link>

      <div className="checkout-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <span className={`portal-badge ${product.approval_status}`} style={{ marginBottom: '0.65rem' }}>
              {product.approval_status}
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{product.title}</h1>
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Listed in <strong>{product.category}{product.sub_category ? ` / ${product.sub_category}` : ''}</strong> · Stock: {product.stock} units
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--fg-primary)' }}>{formatINR(product.price)}</div>
            {product.compare_at_price ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', textDecoration: 'line-through' }}>
                MSRP {formatINR(product.compare_at_price)}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--fg-muted)', marginBottom: '0.25rem' }}>
              Moderation Controls
            </div>
            {product.rejection_reason ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--danger)', margin: 0 }}>Rejection Reason: {product.rejection_reason}</p>
            ) : null}
            <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>Resubmits used: {product.resubmit_count}</span>
            <div style={{ marginTop: '0.45rem', fontSize: '0.85rem' }}>
              {moderation ? (
                <>
                  <strong>AI confidence {moderation.score}%</strong>
                  <span style={{ color: 'var(--fg-muted)' }}>
                    {' '}· {moderation.score >= 90
                      ? product.approval_status === 'approved'
                        ? 'meets the 90% auto-approve gate'
                        : `score is at the 90% gate, status is still ${product.approval_status}`
                      : 'below the 90% auto-approve gate'}
                    {moderation.model ? ` · ${moderation.model}` : ''}
                  </span>
                  {moderation.reasons[0] ? (
                    <div style={{ color: 'var(--fg-secondary)', marginTop: '0.2rem' }}>{moderation.reasons[0]}</div>
                  ) : null}
                </>
              ) : (
                <span style={{ color: 'var(--fg-muted)' }}>No AI confidence score stored for this listing.</span>
              )}
            </div>
          </div>
          <ProductDecision productId={product.id} status={product.approval_status} />
        </div>
      </div>

      <div className="checkout-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Listing Details</h2>
        <table className="portal-table">
          <tbody>
            <tr><td style={{ width: '200px', fontWeight: 600 }}>Description</td><td>{product.description}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Condition</td><td><span style={{ textTransform: 'capitalize' }}>{product.condition}</span></td></tr>
            <tr><td style={{ fontWeight: 600 }}>Category</td><td>{product.category}{product.sub_category ? ` / ${product.sub_category}` : ''}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Tags</td><td>{(product.tags ?? []).join(', ') || '—'}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>AI Categorized</td><td>{product.ai_categorized ? 'Yes (Automated)' : 'Manual'}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Rating</td><td>{product.average_rating} ★ ({product.review_count} reviews)</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Seller</td><td>{seller?.full_name || '—'} · {seller?.email || product.seller_id.slice(0, 8)}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Shop</td><td>{shop ? `${shop.name}, ${shop.city}` : '—'}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Created</td><td>{new Date(product.created_at).toLocaleString('en-IN')}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Updated</td><td>{new Date(product.updated_at).toLocaleString('en-IN')}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="checkout-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Product Images</h2>
        {images.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}>No images uploaded.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {images.map((url) => (
              <div key={url} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-canvas)', padding: '0.5rem' }}>
                <ProductThumbnail src={url} alt={product.title} />
                <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', marginTop: '0.4rem', wordBreak: 'break-all' }}>{url}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="checkout-card">
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Technical Specifications</h2>
        {attributes.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}>No technical specifications specified.</p>
        ) : (
          <table className="portal-table">
            <thead>
              <tr>
                <th>Attribute</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {attributes.map(([key, value]) => (
                <tr key={key}>
                  <td style={{ fontWeight: 600, width: '200px' }}>{key}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
