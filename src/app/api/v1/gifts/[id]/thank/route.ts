import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';
import { thankSender } from '@/services/gift-service';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { id } = await context.params;
  const body: unknown = await request.json();
  const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : '';
  if (message.trim().length < 2) {
    return NextResponse.json({ error: 'A thank-you message is required.' }, { status: 400 });
  }
  try {
    const gift = await thankSender(supabase, id, session.user.id, message.trim());
    return NextResponse.json({ gift });
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : 'Could not send thanks.';
    return NextResponse.json({ error: text }, { status: 400 });
  }
}
