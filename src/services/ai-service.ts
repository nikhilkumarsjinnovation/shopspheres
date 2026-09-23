import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { feedWeightsToJson, parseFeedWeights, type FeedWeights } from '@/lib/feed-weights';
import { buildChatPrompt, sanitizeInput } from '@/lib/prompt-templates';
import type { Database, Json } from '@/types/database.types';

const AiOutputSchema = z.object({
  reply: z.string().min(1),
  recommendedProductIds: z.array(z.string()).default([]),
  extractedIntents: z.object({
    category: z.string().nullable().default(null),
    keywords: z.array(z.string()).default([]),
    priceMax: z.number().nullable().default(null),
    sentiment: z.string().optional(),
  }).default({
    category: null,
    keywords: [],
    priceMax: null,
  }),
});

export type AiChatOutput = z.infer<typeof AiOutputSchema>;

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

type Db = SupabaseClient<Database>;

export async function mutateFeed(
  supabase: Db,
  userId: string,
  current: FeedWeights,
  intents: AiChatOutput['extractedIntents'],
): Promise<boolean> {
  let changed = false;
  if (intents.category) {
    current.category_weights[intents.category] = (current.category_weights[intents.category] || 0) + 2;
    changed = true;
  }
  if (intents.keywords.length > 0) {
    current.recent_chat_intents = Array.from(
      new Set([...intents.keywords, ...current.recent_chat_intents]),
    ).slice(0, 15);
    changed = true;
  }
  current.last_updated = Date.now();

  const { error } = await supabase
    .from('ai_user_profiles')
    .update({
      feed_weights: feedWeightsToJson(current),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
  return changed;
}

export function getRecommendations<T extends { id: string }>(products: T[], ids: string[]): T[] {
  const wanted = new Set(ids);
  return products.filter((product) => wanted.has(product.id)).slice(0, 4);
}

export function summarizeConversation(turns: Array<{ role: string; content: string }>): string {
  const facts = turns
    .filter((turn) => turn.role === 'user')
    .map((turn) => turn.content.trim())
    .filter((content) => content.length > 0)
    .slice(-10);
  if (facts.length === 0) {
    return '';
  }
  return `Shopper mentioned: ${facts.join(' | ')}`.slice(0, 500);
}

export async function chat(input: {
  message: string;
  persona: string;
  catalog: CatalogItem[];
  accessibilityNote?: string;
  apiKey?: string;
}): Promise<AiChatOutput> {
  const safeMessage = sanitizeInput(input.message);
  if (!input.apiKey) {
    return generateResilientFallback(safeMessage, input.catalog);
  }

  try {
    const systemPrompt = buildChatPrompt({
      persona: input.persona,
      catalog: JSON.stringify(input.catalog, null, 2),
      accessibility: input.accessibilityNote,
      userQuery: input.message,
    });
    const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${input.apiKey}`;
    const aiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.3,
        },
      }),
    });
    if (!aiRes.ok) {
      throw new Error(`Gemini API returned status ${aiRes.status}`);
    }
    const rawOutput = readGeminiText(await aiRes.json());
    if (!rawOutput) {
      throw new Error('No candidate content received from Gemini');
    }
    const cleanedJson = rawOutput.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return AiOutputSchema.parse(JSON.parse(cleanedJson));
  } catch (error) {
    console.warn('[Personal AI] Gemini inference fallback triggered:', error);
    return generateResilientFallback(safeMessage, input.catalog);
  }
}

function readGeminiText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || !('candidates' in payload)) {
    return null;
  }
  const candidates = payload.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }
  const first = candidates[0];
  if (!first || typeof first !== 'object' || !('content' in first)) {
    return null;
  }
  const content = first.content;
  if (!content || typeof content !== 'object' || !('parts' in content) || !Array.isArray(content.parts)) {
    return null;
  }
  const part = content.parts[0];
  if (!part || typeof part !== 'object' || !('text' in part) || typeof part.text !== 'string') {
    return null;
  }
  return part.text;
}

function generateResilientFallback(message: string, catalog: CatalogItem[]): AiChatOutput {
  const lower = message.toLowerCase();
  const matched = catalog.filter((product) => {
    const text = `${product.title} ${product.category} ${product.sub_category || ''} ${(product.tags || []).join(' ')}`.toLowerCase();
    return lower.split(/\s+/).some((word) => word.length > 2 && text.includes(word));
  });
  const topItem = matched[0];
  const reply = topItem
    ? `Namaste! I found verified items in our local marketplace that match your request. For example, check out **${topItem.title}** priced at ₹${topItem.priceINR.toLocaleString('en-IN')}. It's currently in stock and eligible for fast doorstep delivery. I have also customized your explore feed with these picks!`
    : `Namaste! I've searched our Indian marketplace catalog. Tell me what product, budget range in ₹, or festival occasion you're shopping for, and I'll find the best rated options and tune your discovery feed in real-time!`;

  let keywords: string[] = [];
  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('electronics')) {
    keywords = ['smartphones', 'electronics', 'accessories'];
  } else if (lower.includes('earbuds') || lower.includes('headphone') || lower.includes('audio')) {
    keywords = ['audio', 'earbuds', 'music'];
  } else if (lower.includes('kurta') || lower.includes('fashion') || lower.includes('clothes')) {
    keywords = ['ethnic', 'fashion', 'apparel'];
  } else if (lower.includes('kitchen') || lower.includes('cooker') || lower.includes('home')) {
    keywords = ['kitchen', 'home essentials', 'cookware'];
  } else {
    keywords = lower.split(/\s+/).filter((word) => word.length > 3).slice(0, 4);
  }

  return {
    reply,
    recommendedProductIds: matched.slice(0, 3).map((product) => product.id),
    extractedIntents: {
      category: topItem?.category || null,
      keywords,
      priceMax: null,
    },
  };
}

export function intentsToJson(intents: AiChatOutput['extractedIntents']): Json {
  return {
    category: intents.category,
    keywords: intents.keywords,
    priceMax: intents.priceMax,
    ...(intents.sentiment ? { sentiment: intents.sentiment } : {}),
  };
}

export { parseFeedWeights };
