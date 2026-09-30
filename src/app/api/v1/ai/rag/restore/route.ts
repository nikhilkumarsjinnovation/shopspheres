import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { restoreProduct, type RagUserContext } from '@/services/rag-service';

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

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const userContext: RagUserContext = {
      userId: session.user.id,
      role: role as 'admin' | 'seller',
    };

    const result = await restoreProduct(supabase, productId, userContext);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[RAG Restore API] Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to restore product';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
