import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { id } = await context.params;

  const { data: gift, error } = await supabase
    .from('gifts')
    .select('id, sender_id, recipient_id, recipient_email, status, message, reveal_trigger, reveal_date, revealed_at, order_id')
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!gift) return NextResponse.json({ error: 'Gift was not found.' }, { status: 404 });

  const role = gift.sender_id === session.user.id ? 'sender' : 'recipient';
  const sealed = !gift.revealed_at && gift.status === 'pending';
  let product: { title: string; price: number; imageUrl: string | null } | null = null;

  if (gift.order_id && (!sealed || role === 'sender')) {
    const admin = createAdminClient();
    const { data: item } = await admin
      .from('order_items')
      .select('unit_price, product:products(title, price, image_urls)')
      .eq('order_id', gift.order_id)
      .limit(1)
      .maybeSingle();
    const linked = item?.product;
    const details = Array.isArray(linked) ? linked[0] : linked;
    if (details && typeof details === 'object' && 'title' in details && typeof details.title === 'string') {
      const images = 'image_urls' in details && Array.isArray(details.image_urls) ? details.image_urls : [];
      product = {
        title: details.title,
        price: typeof details.price === 'number' ? details.price : Number(item?.unit_price ?? 0),
        imageUrl: typeof images[0] === 'string' ? images[0] : null,
      };
    }
  }

  return NextResponse.json({
    gift,
    role,
    sealed,
    product,
  });
}
