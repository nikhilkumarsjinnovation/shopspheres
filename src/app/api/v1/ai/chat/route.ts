import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { chatLimiter, enforceRateLimit, rateLimitKey } from '@/lib/rate-limiter';
import { chat, getRecommendations, intentsToJson, mutateFeed, parseFeedWeights, summarizeConversation } from '@/services/ai-service';
import { invalidatePersonalizedFeed } from '@/lib/cache';
import { getUserBehavioralProfile, formatBehavioralMemoryPrompt, type UserBehavioralProfile } from '@/services/agent-memory-service';
import type { AiUserProfile, UserAccessibilityProfile } from '@/types/database.types';

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000),
  sessionId: z.string().optional(),
  persona: z.enum(['everyday', 'tech', 'fashion', 'gourmet', 'beauty', 'accessibility']).optional().default('everyday'),
  mode: z.enum(['chat', 'agent']).optional().default('agent'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'model']),
    content: z.string(),
  })).optional(),
});

type CatalogItem = {
  id: string;
  title: string;
  priceINR: number;
  category: string;
  sub_category: string | null;
  tags: string[];
  stock: number;
  rating: number;
};

export async function POST(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const limited = await enforceRateLimit(chatLimiter, await rateLimitKey(request));
    if (limited) {
      return limited;
    }
    const csrfError = csrfMiddleware(request);
    if (csrfError) {
      return csrfError;
    }

    const body = await request.json();
    const validatedBody = ChatRequestSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: validatedBody.error.flatten() },
        { status: 400 }
      );
    }

    const { message, persona, mode } = validatedBody.data;
    const sessionId = validatedBody.data.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);
    const userId = session?.user.id ?? null;

    let userProfile: AiUserProfile | null = null;
    let accessibilityProfile: UserAccessibilityProfile | null = null;

    if (userId) {
      const { data: aiProfile, error: aiProfileError } = await supabase
        .from('ai_user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (aiProfileError) {
        throw new Error(aiProfileError.message);
      }

      if (!aiProfile) {
        const { data: newProfile, error: insertError } = await supabase
          .from('ai_user_profiles')
          .insert({
            user_id: userId,
            persona_preference: persona,
            feed_weights: {
              category_weights: {},
              recent_chat_intents: [],
              boosted_keywords: [],
              last_updated: Date.now(),
            },
          })
          .select()
          .single();

        if (insertError || !newProfile) {
          throw new Error(insertError?.message ?? 'Failed to create AI profile.');
        }
        userProfile = newProfile;
      } else {
        userProfile = aiProfile;
      }

      const { data: accProfile, error: accError } = await supabase
        .from('user_accessibility_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (accError) {
        throw new Error(accError.message);
      }
      accessibilityProfile = accProfile;
    }

    const { data: catalogProducts, error: catalogError } = await supabase
      .from('products')
      .select('id, title, description, price, compare_at_price, category, sub_category, tags, stock, average_rating, image_urls')
      .eq('approval_status', 'approved')
      .limit(30);

    if (catalogError) {
      throw new Error(catalogError.message);
    }

    const catalogContext: CatalogItem[] = (catalogProducts ?? []).map((product) => ({
      id: product.id,
      title: product.title,
      priceINR: product.price,
      category: product.category,
      sub_category: product.sub_category,
      tags: product.tags,
      stock: product.stock,
      rating: product.average_rating,
    }));

    let memories = '';
    let priorTurns: Array<{ role: string; content: string; created_at: string }> = [];
    let behavioralProfile: UserBehavioralProfile | null = null;

    if (userId) {
      try {
        behavioralProfile = await getUserBehavioralProfile(userId);
        memories = formatBehavioralMemoryPrompt(behavioralProfile);
      } catch (profileErr) {
        console.warn('[Personal AI Assistant] Failed to load behavioral profile:', profileErr);
      }

      const { data: turns, error: turnsError } = await supabase
        .from('ai_conversations')
        .select('role, content, created_at')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(40);

      if (!turnsError && turns && turns.length > 0) {
        priorTurns = [...turns].reverse();
      }
    }

    const clientHistory = validatedBody.data.history || [];
    let combinedHistory: Array<{ role: string; content: string }> = [];

    // Prioritize client in-thread history as it reflects the live conversation state,
    // fallback to DB turns if clientHistory is empty
    if (clientHistory.length > 0) {
      combinedHistory = clientHistory;
    } else if (priorTurns.length > 0) {
      combinedHistory = priorTurns.map((t) => ({ role: t.role, content: t.content }));
    }

    const validatedOutput = await chat({
      message,
      persona,
      catalog: catalogContext,
      memories,
      accessibilityNote: accessibilityProfile?.cognitive_simplified_ui
        ? 'NOTE: User has simplified mode enabled. Keep your reply direct, clear, using bullet points and simple language.'
        : undefined,
      apiKey,
      userId,
      history: combinedHistory,
      mode,
      sessionId,
      isAdmin: Boolean(
        session && session.profile.role === 'admin' && session.profile.is_active,
      ),
    });

    let feedMutated = false;
    if (userId && userProfile) {
      feedMutated = await mutateFeed(
        supabase,
        userId,
        parseFeedWeights(userProfile.feed_weights),
        validatedOutput.extractedIntents,
      );
      await invalidatePersonalizedFeed(userId);
    }

    const recommendedProductDetails = getRecommendations(catalogProducts ?? [], validatedOutput.recommendedProductIds);

    if (userId) {
      const { error: conversationError } = await supabase.from('ai_conversations').insert([
        {
          user_id: userId,
          session_id: sessionId,
          role: 'user',
          content: message,
        },
        {
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          content: validatedOutput.reply,
          extracted_intents: intentsToJson(validatedOutput.extractedIntents),
          recommended_product_ids: validatedOutput.recommendedProductIds || [],
        },
      ]);

      if (conversationError) {
        throw new Error(conversationError.message);
      }

      const nextTurns = [
        ...priorTurns,
        { role: 'user', content: message, created_at: new Date().toISOString() },
        { role: 'assistant', content: validatedOutput.reply, created_at: new Date().toISOString() },
      ];
      const oldest = priorTurns[0]?.created_at;
      const olderThanDay = oldest ? Date.now() - new Date(oldest).getTime() > 24 * 60 * 60 * 1000 : false;
      if (nextTurns.length >= 10 || olderThanDay) {
        await summarizeConversation({
          turns: nextTurns,
          userId,
          sessionId,
          supabase,
          apiKey,
        });
      }
    }

    return NextResponse.json({
      reply: validatedOutput.reply,
      recommendedProducts: recommendedProductDetails,
      feedUpdated: feedMutated,
      intents: validatedOutput.extractedIntents,
      clientActions: validatedOutput.clientActions || [],
      actionCards: validatedOutput.actionCards || [],
      toolExecutions: validatedOutput.toolExecutions || [],
      behavioralProfile,
      sessionId,
      mode: validatedOutput.mode || mode,
      validationReport: validatedOutput.validationReport,
      provenance: validatedOutput.provenance,
      quickReplies: validatedOutput.quickReplies || [],
      needsClarification: validatedOutput.needsClarification || false,
    });
  } catch (err: unknown) {
    console.error('[Personal AI Assistant] Error:', err);
    const msg = err instanceof Error ? err.message : 'AI engine error.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
