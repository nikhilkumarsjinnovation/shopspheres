import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { enforceRateLimit, chatLimiter, rateLimitKey } from '@/lib/rate-limiter';
import { executeRagChat, type RagUserContext } from '@/services/rag-service';

const RagChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000),
  isPersonalized: z.boolean().default(true),
  sessionId: z.string().optional(),
  targetShopId: z.string().optional().nullable(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system', 'model']),
        content: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;

    const limited = await enforceRateLimit(chatLimiter, await rateLimitKey(request));
    if (limited) return limited;

    const csrfError = csrfMiddleware(request);
    if (csrfError) return csrfError;

    const body = await request.json();
    const parsed = RagChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { message, isPersonalized, history, targetShopId } = parsed.data;
    const sessionId = parsed.data.sessionId || `rag_sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session || !session.profile.is_active) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const role = session.profile.role;
    if (role !== 'admin' && role !== 'seller') {
      return NextResponse.json(
        { error: 'Access restricted to administrators and shop owners.' },
        { status: 403 }
      );
    }

    // Resolve shop info for this user
    let userContext: RagUserContext = {
      userId: session.user.id,
      role: role as 'admin' | 'seller',
    };

    if (role === 'seller') {
      // Fetch seller's shop to bind context
      const { data: shop } = await supabase
        .from('shops')
        .select('id, name')
        .eq('seller_id', session.user.id)
        .maybeSingle();

      userContext.shopId = shop?.id || null;
      userContext.shopName = shop?.name || session.profile.full_name || 'My Store';
    } else if (role === 'admin') {
      if (targetShopId) {
        const { data: shop } = await supabase
          .from('shops')
          .select('id, name')
          .eq('id', targetShopId)
          .maybeSingle();
        userContext.shopId = targetShopId;
        userContext.shopName = shop?.name || 'Target Store';
      } else {
        userContext.shopName = 'Platform Wide';
      }
    }

    const result = await executeRagChat({
      message,
      isPersonalized,
      sessionId,
      history,
      userContext,
      supabase,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[RAG Chat API] Error:', error);
    const msg = error instanceof Error ? error.message : 'RAG engine error.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
