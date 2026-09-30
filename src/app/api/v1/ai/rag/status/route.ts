import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getTenantLearningStats, type RagUserContext } from '@/services/rag-service';

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

    return NextResponse.json({
      stats,
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
