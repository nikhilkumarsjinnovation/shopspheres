import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';
import { queueNotification } from '@/services/notification-service';

export async function GET(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id');
  let query = supabase.from('group_gifts').select('id, organizer_id, title, target_amount, current_amount, deadline, product_id, status');
  if (id) query = query.eq('id', id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pools: data ?? [] });
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
  const title = 'title' in record && typeof record.title === 'string' ? record.title : '';
  const targetAmount = 'targetAmount' in record && typeof record.targetAmount === 'number' ? record.targetAmount : 0;
  const deadline = 'deadline' in record && typeof record.deadline === 'string' ? record.deadline : '';
  const productId = 'productId' in record && typeof record.productId === 'string' ? record.productId : null;
  if (!title || targetAmount <= 0 || !deadline) {
    return NextResponse.json({ error: 'title, targetAmount, and deadline are required.' }, { status: 400 });
  }
  const { data, error } = await supabase.from('group_gifts').insert({
    organizer_id: session.user.id,
    title,
    target_amount: targetAmount,
    deadline,
    product_id: productId,
  }).select('id, title, target_amount, current_amount, deadline, status').single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Could not create pool.' }, { status: 500 });
  await queueNotification({
    channel: 'email',
    userId: session.user.id,
    template: 'group_gift_created',
    payload: { groupGiftId: data.id },
  });
  return NextResponse.json({ pool: data });
}
