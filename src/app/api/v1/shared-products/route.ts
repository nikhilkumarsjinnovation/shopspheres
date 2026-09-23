import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const body: unknown = await request.json();
  const productId = body && typeof body === 'object' && 'productId' in body && typeof body.productId === 'string' ? body.productId : '';
  const shareChannel = body && typeof body === 'object' && 'shareChannel' in body && typeof body.shareChannel === 'string' ? body.shareChannel : 'link';
  const recipientEmail = body && typeof body === 'object' && 'recipientEmail' in body && typeof body.recipientEmail === 'string' ? body.recipientEmail : null;
  const shareMessage = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : null;
  if (!productId) return NextResponse.json({ error: 'productId is required.' }, { status: 400 });

  const token = crypto.randomUUID();
  const { data, error } = await supabase.from('shared_products').insert({
    product_id: productId,
    sharer_id: session.user.id,
    recipient_email: recipientEmail,
    share_channel: shareChannel,
    share_message: shareMessage,
    deep_link_token: token,
  }).select('id, deep_link_token').single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Could not create share.' }, { status: 500 });

  const link = `/product/${productId}?ref=${token}`;
  return NextResponse.json({ token: data.deep_link_token, link });
}
