import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { syncTenantKnowledge, type RagUserContext } from '@/services/rag-service';

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

    let shopId: string | null = null;
    try {
      const body = await request.json();
      shopId = body.shopId || null;
    } catch {
      // no body
    }

    const userContext: RagUserContext = {
      userId: session.user.id,
      role: role as 'admin' | 'seller',
      shopId: role === 'admin' ? shopId : null,
    };

    if (role === 'seller') {
      const { data: shop } = await supabase
        .from('shops')
        .select('id, name')
        .eq('seller_id', session.user.id)
        .maybeSingle();
      userContext.shopId = shop?.id || null;
      userContext.shopName = shop?.name || null;
    }

    const result = await syncTenantKnowledge(supabase, userContext, 40);

    return NextResponse.json({
      success: true,
      message: `Learned and embedded ${result.learnedCount} new product nodes.`,
      learnedCount: result.learnedCount,
      stats: result.stats,
    });
  } catch (error: unknown) {
    console.error('[RAG Sync API] Error:', error);
    const msg = error instanceof Error ? error.message : 'Knowledge sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
