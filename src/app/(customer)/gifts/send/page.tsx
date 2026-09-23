import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import GiftFlow from '@/components/gifting/GiftFlow';

export default async function SendGiftPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  const { data: products } = await supabase
    .from('products')
    .select('id, title, price')
    .eq('approval_status', 'approved')
    .order('title')
    .limit(100);

  return (
    <main>
      <h1>Send a gift</h1>
      <p>Pick the product first, then the person who should receive it.</p>
      <GiftFlow products={products ?? []} />
    </main>
  );
}
