import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';
import { revealGift } from '@/services/gift-service';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { id } = await context.params;
  try {
    const gift = await revealGift(supabase, id, session.user.id);
    return NextResponse.json({ gift, unboxing: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not reveal gift.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
