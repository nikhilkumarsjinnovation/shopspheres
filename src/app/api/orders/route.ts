import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createOrder, type CreateOrderInput } from '@/services/order-service';

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfMiddleware(request);
    if (csrfError) {
      return csrfError;
    }

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to complete your purchase.' },
        { status: 401 },
      );
    }

    const body = await request.json() as CreateOrderInput;
    const { items, shippingAddress } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Your cart is empty. Please add items before placing an order.' },
        { status: 400 },
      );
    }

    if (!shippingAddress || !shippingAddress.recipient_name || !shippingAddress.recipient_phone || !shippingAddress.address_line) {
      return NextResponse.json(
        { error: 'Incomplete delivery address. Please provide recipient name, phone, and address.' },
        { status: 400 },
      );
    }

    const order = await createOrder(body, session.user.id);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        total: order.total,
        created_at: order.created_at,
        itemsCount: order.itemsCount,
        discountApplied: order.discountApplied,
      },
    });
  } catch (err: unknown) {
    console.error('[Create Order API] Exception:', err);
    const msg = err instanceof Error ? err.message : 'Server error while processing order.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
