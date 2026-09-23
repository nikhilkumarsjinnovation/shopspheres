import { NextRequest, NextResponse } from 'next/server';
import { invalidatePersonalizedFeed } from '@/lib/cache';

/**
 * Supabase database webhook target for ai_user_profiles updates.
 * Dashboard: Database → Webhooks → table ai_user_profiles → POST this URL
 * with header x-webhook-secret = SUPABASE_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SUPABASE_WEBHOOK_SECRET;
  const provided = request.headers.get('x-webhook-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
  }

  const body: unknown = await request.json();
  const record = body && typeof body === 'object' && 'record' in body ? body.record : null;
  const userId = record && typeof record === 'object' && 'user_id' in record ? record.user_id : null;
  if (typeof userId !== 'string' || userId.length === 0) {
    return NextResponse.json({ error: 'Missing record.user_id' }, { status: 400 });
  }

  await invalidatePersonalizedFeed(userId);
  return NextResponse.json({ ok: true });
}
