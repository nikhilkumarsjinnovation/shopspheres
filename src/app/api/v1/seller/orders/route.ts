import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';

const ACTIONS = {
  packed: { status: 'packed', title: 'Packed' },
  shipped: { status: 'shipped', title: 'Shipped' },
  out_for_delivery: { status: 'out_for_delivery', title: 'Out for delivery' },
} as const;

export async function POST(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session || session.profile.role !== 'seller') {
    return NextResponse.json({ error: 'Seller access is required.' }, { status: 403 });
  }
  const body: unknown = await request.json();
  const orderId = body && typeof body === 'object' && 'orderId' in body && typeof body.orderId === 'string' ? body.orderId : '';
  const action = body && typeof body === 'object' && 'action' in body && typeof body.action === 'string' ? body.action : '';
  const step = action in ACTIONS ? ACTIONS[action as keyof typeof ACTIONS] : null;
  if (!orderId || !step) return NextResponse.json({ error: 'orderId and action are required.' }, { status: 400 });

  const { data: line } = await supabase
    .from('order_items')
    .select('id')
    .eq('order_id', orderId)
    .eq('seller_id', session.user.id)
    .limit(1)
    .maybeSingle();
  if (!line) return NextResponse.json({ error: 'This order is not yours.' }, { status: 404 });

  const { error } = await supabase.from('order_tracking_events').insert({
    order_id: orderId,
    status: step.status,
    title: step.title,
    description: `The shop marked this order ${step.title.toLowerCase()}.`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
