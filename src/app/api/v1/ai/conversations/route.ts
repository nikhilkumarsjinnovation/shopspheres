import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);
    const userId = session?.user.id;

    if (!userId) {
      return NextResponse.json({ sessions: [], messages: [] });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // 1. If requesting a specific session's messages
    if (sessionId) {
      const { data: turns, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Collect all recommended product IDs
      const allProductIds = Array.from(
        new Set(
          (turns || [])
            .flatMap((t: any) => t.recommended_product_ids || [])
            .filter(Boolean)
        )
      );

      let productsById: Record<string, any> = {};
      if (allProductIds.length > 0) {
        const { data: prods } = await supabase
          .from('products')
          .select('id, title, price, compare_at_price, category, sub_category, image_urls, stock, average_rating')
          .in('id', allProductIds);

        if (prods) {
          productsById = Object.fromEntries(prods.map((p) => [p.id, p]));
        }
      }

      const messages = (turns || []).map((t: any) => {
        const turnProds = (t.recommended_product_ids || [])
          .map((id: string) => productsById[id])
          .filter(Boolean);

        return {
          id: t.id,
          role: t.role as 'user' | 'assistant',
          content: t.content,
          createdAt: t.created_at,
          recommendedProducts: turnProds,
          actionCards: turnProds.length > 0 ? [{ type: 'PRODUCT_CAROUSEL', data: { products: turnProds } }] : [],
        };
      });

      return NextResponse.json({ sessionId, messages });
    }

    // 2. Otherwise return list of conversation threads grouped by session_id
    const { data: allTurns, error } = await supabase
      .from('ai_conversations')
      .select('id, session_id, role, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sessionMap = new Map<string, {
      id: string;
      title: string;
      lastMessage: string;
      messageCount: number;
      createdAt: string;
      updatedAt: string;
    }>();

    for (const turn of allTurns || []) {
      const sid = turn.session_id;
      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, {
          id: sid,
          title: turn.role === 'user' ? turn.content.slice(0, 50) : 'Shopping Session',
          lastMessage: turn.content.slice(0, 80),
          messageCount: 1,
          createdAt: turn.created_at,
          updatedAt: turn.created_at,
        });
      } else {
        const item = sessionMap.get(sid)!;
        item.messageCount++;
        if (turn.role === 'user' && item.title === 'Shopping Session') {
          item.title = turn.content.slice(0, 50);
        }
        if (new Date(turn.created_at) < new Date(item.createdAt)) {
          item.createdAt = turn.created_at;
          if (turn.role === 'user') {
            item.title = turn.content.slice(0, 50);
          }
        }
      }
    }

    const sessions = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json({ sessions });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch conversations';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);
    const userId = session?.user.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      try {
        const body = await request.json();
        sessionId = body.sessionId;
      } catch {
        // no body
      }
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedSessionId: sessionId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete conversation';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
