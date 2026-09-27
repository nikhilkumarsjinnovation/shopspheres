import { redirect } from 'next/navigation';
import Link from 'next/link';
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
    <div>
      <p><Link href="/gifts">Back to gifts</Link></p>
      <div>
        <h1>Send a gift</h1>
        <p>Pick the product first, then the person who should receive it.</p>
      </div>
      <div>
        <GiftFlow products={products ?? []} />
      </div>
    </div>
  );
}
