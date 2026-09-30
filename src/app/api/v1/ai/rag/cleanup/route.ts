import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { cleanupExpiredSoftDeleted, type RagUserContext } from '@/services/rag-service';

export async function POST(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;

    const csrfError = csrfMiddleware(request);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session || !session.profile.is_active) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const role = session.profile.role;
    if (role !== 'admin' && role !== 'seller') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userContext: RagUserContext = {
      userId: session.user.id,
      role: role as 'admin' | 'seller',
    };

    const result = await cleanupExpiredSoftDeleted(supabase, userContext);
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.purgedCount} expired products past the 1-week deadline.`,
      purgedCount: result.purgedCount,
    });
  } catch (error: unknown) {
    console.error('[RAG Cleanup API] Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to clean up expired products';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
