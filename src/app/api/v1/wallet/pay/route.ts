import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createAdminClient } from '@/lib/supabase/admin';
import { debitWallet } from '@/services/wallet-service';

export async function POST(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const csrfError = csrfMiddleware(request);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, amount } = body;

    if (!orderId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid orderId and amount are required.' }, { status: 400 });
    }

    const adminDb = createAdminClient();

    // Verify order belongs to this customer
    const { data: order, error: orderErr } = await adminDb
      .from('orders')
      .select('id, customer_id, total_amount, status')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (order.customer_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized to pay for this order.' }, { status: 403 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ error: `Order is already ${order.status}.` }, { status: 400 });
    }

    // Debit the wallet
    const debitResult = await debitWallet(session.user.id, amount, orderId);

    if (!debitResult.success) {
      return NextResponse.json({ error: debitResult.error || 'Payment failed.' }, { status: 400 });
    }

    // Update order status to confirmed
    await adminDb
      .from('orders')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Record tracking event
    await adminDb.from('order_tracking_events').insert({
      order_id: orderId,
      status: 'confirmed',
      title: 'Payment Successful',
      description: 'Order paid in full via ShopSphere In-App Wallet.',
    });

    return NextResponse.json({
      success: true,
      orderId,
      remaining_balance: debitResult.remaining_balance,
      transaction_id: debitResult.transaction_id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Wallet payment processing error.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
