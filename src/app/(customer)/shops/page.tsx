import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Store } from 'lucide-react';

export default async function ShopsPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  const { data: shops } = await supabase
    .from('shops')
    .select('id, name, city, state, rating, is_verified, description')
    .order('name');

  return (
    <div>
      <div>
        <h1>Shops</h1>
        <p>Browse products by the shop that sells them.</p>
      </div>
      {(shops ?? []).length === 0 ? (
        <div>No shops are listed yet.</div>
      ) : (
        <div>
          {(shops ?? []).map((shop) => (
            <Link key={shop.id} href={`/shops/${shop.id}`}>
              <div>
                <Store size={16} aria-hidden />
                <strong>{shop.name}</strong>
                {shop.is_verified ? <span>Verified</span> : null}
              </div>
              <p>{shop.city}, {shop.state} · {shop.rating.toFixed(1)}</p>
              {shop.description ? <p>{shop.description}</p> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
