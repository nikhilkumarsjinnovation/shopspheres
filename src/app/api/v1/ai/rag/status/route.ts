import { NextRequest, NextResponse, after } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import {
  getTenantLearningStats,
  syncTenantKnowledge,
  type RagUserContext,
} from '@/services/rag-service';

export async function GET(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session || !session.profile.is_active) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const role = session.profile.role;
    if (role !== 'admin' && role !== 'seller') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

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

    const stats = await getTenantLearningStats(supabase, userContext);
    let autoSyncQueued = false;

    // Live sites: when the assistant opens status and rows lack embeddings, backfill
    // in the background so Sync is not required for every new product.
    if (stats.pendingProducts > 0) {
      autoSyncQueued = true;
      after(async () => {
        try {
          await syncTenantKnowledge(supabase, userContext, 40);
        } catch (err) {
          console.warn('[RAG Status] Background auto-sync failed:', err);
        }
      });
    }

    return NextResponse.json({
      stats,
      autoSyncQueued,
      userContext: {
        role: userContext.role,
        shopName: userContext.shopName,
        shopId: userContext.shopId,
      },
    });
  } catch (error: unknown) {
    console.error('[RAG Status API] Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to get RAG status';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
