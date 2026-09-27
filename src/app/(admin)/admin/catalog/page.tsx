import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProductDecision from '@/components/admin/ProductDecision';
import { formatINR } from '@/lib/formatters';
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
    .select('id, title, price, stock, category, approval_status, rejection_reason, seller_id')
    .order('created_at', { ascending: false })
    .limit(50);
  if (status !== 'all') query = query.eq('approval_status', status);
  const { data: products, error } = await query;

  return (
    <div>
      <div>
        <h1>Catalog</h1>
        <p>Approve, reject with a reason, or pull a live product back to pending.</p>
      </div>
      <p>
        {FILTERS.map((item) => (
          <Link key={item} href={item === 'pending' ? '/admin/catalog' : `/admin/catalog?status=${item}`}>
            {item}
          </Link>
        ))}
      </p>
      {error ? <div>{error.message}</div> : null}
      <div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Status</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((product) => (
              <tr key={product.id}>
                <td>
                  <div><Link href={`/admin/catalog/${product.id}`}>{product.title}</Link></div>
                  <div>{product.category}</div>
                  {product.rejection_reason ? <div>Reason: {product.rejection_reason}</div> : null}
                </td>
                <td>{product.approval_status}</td>
                <td>{formatINR(product.price)}</td>
                <td>{product.stock}</td>
                <td>
                  <p><Link href={`/admin/catalog/${product.id}`}>View details</Link></p>
                  <ProductDecision productId={product.id} status={product.approval_status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(products ?? []).length === 0 ? <div>No products in this filter.</div> : null}
    </div>
  );
}
