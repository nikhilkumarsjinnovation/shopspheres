import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductDecision from '@/components/admin/ProductDecision';
import ProductThumbnail from '@/components/ProductThumbnail';
import { formatINR } from '@/lib/formatters';
import type { Json } from '@/types/database.types';
import * as styles from '../../../admin.css';

function asRecord(value: Json): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = entry == null ? '' : String(entry);
  }
  return out;
}

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
    return <div className={styles.emptyState}>{error.message}</div>;
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

  const attributes = asRecord(product.attributes);
  const images = product.image_urls ?? [];

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>{product.title}</h1>
        <p className={styles.headerSubtitle}>
          {product.approval_status} · {formatINR(product.price)} · stock {product.stock}
        </p>
      </div>
      <p><Link href="/admin/catalog">Back to catalog</Link></p>

      <div className={styles.sectionTitle}><span>Decision</span></div>
      <ProductDecision productId={product.id} status={product.approval_status} />
      {product.rejection_reason ? <p>Current rejection reason: {product.rejection_reason}</p> : null}
      <p>Resubmits used: {product.resubmit_count}</p>

      <div className={styles.sectionTitle}><span>Listing</span></div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <tbody>
            <tr className={styles.tr}><td className={styles.td}>Description</td><td className={styles.td}>{product.description}</td></tr>
            <tr className={styles.tr}><td className={styles.td}>Condition</td><td className={styles.td}>{product.condition}</td></tr>
            <tr className={styles.tr}><td className={styles.td}>Category</td><td className={styles.td}>{product.category}{product.sub_category ? ` / ${product.sub_category}` : ''}</td></tr>
            <tr className={styles.tr}><td className={styles.td}>Compare at</td><td className={styles.td}>{product.compare_at_price != null ? formatINR(product.compare_at_price) : '—'}</td></tr>
            <tr className={styles.tr}><td className={styles.td}>Tags</td><td className={styles.td}>{(product.tags ?? []).join(', ') || '—'}</td></tr>
            <tr className={styles.tr}><td className={styles.td}>AI categorized</td><td className={styles.td}>{product.ai_categorized ? 'Yes' : 'No'}</td></tr>
            <tr className={styles.tr}><td className={styles.td}>Rating</td><td className={styles.td}>{product.average_rating} ({product.review_count} reviews)</td></tr>
            <tr className={styles.tr}><td className={styles.td}>Seller</td><td className={styles.td}>{seller?.full_name || '—'} · {seller?.email || product.seller_id.slice(0, 8)}</td></tr>
            <tr className={styles.tr}><td className={styles.td}>Shop</td><td className={styles.td}>{shop ? `${shop.name}, ${shop.city}` : '—'}</td></tr>
            <tr className={styles.tr}><td className={styles.td}>Created</td><td className={styles.td}>{new Date(product.created_at).toLocaleString('en-IN')}</td></tr>
            <tr className={styles.tr}><td className={styles.td}>Updated</td><td className={styles.td}>{new Date(product.updated_at).toLocaleString('en-IN')}</td></tr>
          </tbody>
        </table>
      </div>

      <div className={styles.sectionTitle}><span>Images</span></div>
      {images.length === 0 ? (
        <p>No images uploaded.</p>
      ) : (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {images.map((url) => (
            <div key={url}>
              <ProductThumbnail src={url} alt={product.title} />
              <div style={{ maxWidth: 160, wordBreak: 'break-all', fontSize: '0.75rem' }}>{url}</div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.sectionTitle}><span>Specifications</span></div>
      {Object.keys(attributes).length === 0 ? (
        <p>No technical specifications.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Attribute</th>
                <th className={styles.th}>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(attributes).map(([key, value]) => (
                <tr key={key} className={styles.tr}>
                  <td className={styles.td}>{key}</td>
                  <td className={styles.td}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
