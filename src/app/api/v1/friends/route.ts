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

  const { data, error } = await supabase
    .from('friend_relationships')
    .select('id, user_id, friend_id, status, created_at')
    .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const friends = (data ?? []).filter((row) => row.status === 'accepted');
  const incoming = (data ?? []).filter((row) => row.status === 'pending' && row.friend_id === session.user.id);
  const outgoing = (data ?? []).filter((row) => row.status === 'pending' && row.user_id === session.user.id);
  const ids = Array.from(new Set((data ?? []).flatMap((row) => [row.user_id, row.friend_id])));
  let labels = new Map<string, string>();
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const { data: people } = await admin.from('users').select('id, email, full_name').in('id', ids);
    labels = new Map((people ?? []).map((person) => [person.id, person.full_name || person.email]));
  } catch {
    labels = new Map();
  }
  const withLabel = (row: { id: string; user_id: string; friend_id: string; status: string }) => ({
    ...row,
    label: labels.get(row.user_id === session.user.id ? row.friend_id : row.user_id) ?? 'ShopSphere user',
  });
  return NextResponse.json({
    friends: friends.map(withLabel),
    incoming: incoming.map(withLabel),
    outgoing: outgoing.map(withLabel),
  });
}

export async function POST(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const csrfError = csrfMiddleware(request);
    if (csrfError) return csrfError;
    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const body: unknown = await request.json();
    const email = body && typeof body === 'object' && 'email' in body && typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : '';
    if (!email) {
      return NextResponse.json({ error: 'An email is required. Phone and username are not stored on users.' }, { status: 400 });
    }
    const { data: friendId, error: lookupError } = await supabase.rpc('lookup_user_id_by_email', { target_email: email });
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
    if (!friendId || friendId === session.user.id) {
      return NextResponse.json({ error: 'No ShopSphere account was found for that email.' }, { status: 404 });
    }
    const { data, error } = await supabase.from('friend_relationships').insert({
      user_id: session.user.id,
      friend_id: friendId,
      initiated_by: session.user.id,
      status: 'pending',
    }).select('id, status').single();
    if (error) {
      const duplicate = error.code === '23505' || error.message.includes('friend_relationships_user_id_friend_id_key');
      return NextResponse.json({
        error: duplicate
          ? 'You already sent a request to this email, or you are already friends.'
          : error.message,
      }, { status: 409 });
    }
    await queueNotification({
      channel: 'email',
      userId: friendId,
      template: 'friend_request',
      payload: { from: session.user.id },
    });
    return NextResponse.json({ request: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not send friend request.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const body: unknown = await request.json();
  const id = body && typeof body === 'object' && 'id' in body && typeof body.id === 'string' ? body.id : '';
  const status = body && typeof body === 'object' && 'status' in body && (body.status === 'accepted' || body.status === 'blocked')
    ? body.status
    : null;
  if (!id || !status) return NextResponse.json({ error: 'id and status are required.' }, { status: 400 });
  const { data, error } = await supabase
    .from('friend_relationships')
    .update({ status })
    .eq('id', id)
    .eq('friend_id', session.user.id)
    .select('id, status')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Request was not found.' }, { status: 404 });
  return NextResponse.json({ request: data });
}

export async function DELETE(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  const { error } = await supabase.from('friend_relationships').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
