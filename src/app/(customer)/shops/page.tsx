import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function ShopsPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  const { data: shops } = await supabase
    .from('shops')
    .select('id, name, city, state, rating, is_verified, description')
    .order('name');

  return (
    <main>
      <h1>Shops</h1>
      <p>Browse products by the shop that sells them.</p>
      <ul>
        {(shops ?? []).map((shop) => (
          <li key={shop.id}>
            <Link href={`/shops/${shop.id}`}>
              {shop.name} · {shop.city}, {shop.state} · {shop.rating.toFixed(1)}
              {shop.is_verified ? ' · Verified' : ''}
            </Link>
            {shop.description ? <p>{shop.description}</p> : null}
          </li>
        ))}
      </ul>
      {(shops ?? []).length === 0 ? <p>No shops are listed yet.</p> : null}
    </main>
  );
}
