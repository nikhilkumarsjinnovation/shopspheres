import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';
import { createGift } from '@/services/gift-service';
import { createOrder } from '@/services/order-service';

export async function GET(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { data, error } = await supabase
    .from('gifts')
    .select('id, sender_id, recipient_id, recipient_email, status, reveal_trigger, reveal_date, revealed_at, message, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const sent = (data ?? []).filter((gift) => gift.sender_id === session.user.id);
  const received = (data ?? []).filter((gift) => gift.recipient_id === session.user.id);
  return NextResponse.json({ sent, received });
}

export async function POST(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const body: unknown = await request.json();
  const record = body && typeof body === 'object' ? body : {};
  const recipientEmail = 'recipientEmail' in record && typeof record.recipientEmail === 'string' ? record.recipientEmail : null;
  const productId = 'productId' in record && typeof record.productId === 'string' ? record.productId : '';
  if (!productId) {
    return NextResponse.json({ error: 'Choose a product to gift.' }, { status: 400 });
  }
  if (!recipientEmail) {
    return NextResponse.json({ error: 'Choose a recipient email.' }, { status: 400 });
  }
  let recipientId: string | null = null;
  const { data } = await supabase.rpc('lookup_user_id_by_email', { target_email: recipientEmail });
  recipientId = data;
  const revealTrigger = 'revealTrigger' in record && (record.revealTrigger === 'date' || record.revealTrigger === 'delivery' || record.revealTrigger === 'manual')
    ? record.revealTrigger
    : 'manual';
  try {
    const order = await createOrder({
      items: [{ id: productId, quantity: 1, title: 'Gift' }],
      shippingAddress: {
        recipient_name: recipientEmail,
        recipient_phone: '0000000000',
        address_line: 'Gift address confirmed with the recipient',
        city: 'Pending',
        state: 'Pending',
        postal_code: '000000',
        country: 'India',
      },
      paymentMethod: 'gift',
      isGift: true,
      giftRecipientEmail: recipientEmail,
    }, session.user.id);
    const gift = await createGift(supabase, {
      senderId: session.user.id,
      recipientId,
      recipientEmail,
      revealTrigger,
      revealDate: 'revealDate' in record && typeof record.revealDate === 'string' ? record.revealDate : null,
      message: 'message' in record && typeof record.message === 'string' ? record.message : null,
      wrappingOptionId: 'wrappingOptionId' in record && typeof record.wrappingOptionId === 'string' ? record.wrappingOptionId : null,
      orderId: order.id,
    });
    return NextResponse.json({ gift, orderId: order.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not create gift.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
