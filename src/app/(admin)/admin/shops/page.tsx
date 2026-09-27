import { createClient } from '@/lib/supabase/server';
import ResetBrandingButton from '@/components/admin/ResetBrandingButton';

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
    <div>
      <div>
        <h1>Shops</h1>
        <p>Shop name, city, catalog size, and branding edits. Street addresses stay on the seller&apos;s own page.</p>
      </div>
      {error ? <div>{error.message}</div> : null}
      <div>
        <table>
          <thead>
            <tr>
              <th>Shop</th>
              <th>City</th>
              <th>Products</th>
              <th>Branding edits used</th>
              <th>Reset</th>
            </tr>
          </thead>
          <tbody>
            {(shops ?? []).map((shop) => (
              <tr key={shop.id}>
                <td>{shop.name}</td>
                <td>{shop.city}</td>
                <td>{counts.get(shop.id) ?? 0}</td>
                <td>{shop.branding_edits_used} / 2</td>
                <td><ResetBrandingButton sellerId={shop.seller_id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(shops ?? []).length === 0 ? <div>No shops yet.</div> : null}
    </div>
  );
}
