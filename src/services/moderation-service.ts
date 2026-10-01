import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { generateEmbedding, toVectorLiteral } from '@/lib/embeddings';
import { generateProductKnowledgeChunk } from '@/services/rag-service';

export interface ModerationInput {
  id?: string;
  title: string;
  description: string;
  category: string;
  sub_category?: string | null;
  price: number;
  condition?: string;
  tags?: string[];
  attributes?: Record<string, any>;
  image_urls?: string[];
}

export interface ModerationResult {
  automated: boolean;
  score: number; // 0 - 100
  decision: 'approved' | 'rejected' | 'pending';
  reasons: string[];
  suggested_corrections: string[];
  evaluated_at: string;
  model: string;
}

const PROHIBITED_KEYWORDS = [
  'counterfeit', 'fake replica', 'stolen', 'cocaine', 'heroin', 'firearm',
  'weapon', 'explosive', 'credit card fraud', 'ssn', 'pirated', 'malware',
  'hack tool', 'prescription drug', 'illegal'
];

/**
 * Heuristic baseline evaluation for speed and zero-dependency fallback.
 */
function heuristicEvaluate(input: ModerationInput): { score: number; reasons: string[]; suggestions: string[] } {
  let score = 95;
  const reasons: string[] = [];
  const suggestions: string[] = [];

  const textToScan = `${input.title} ${input.description} ${(input.tags || []).join(' ')}`.toLowerCase();

  // Check prohibited words
  for (const word of PROHIBITED_KEYWORDS) {
    if (textToScan.includes(word)) {
      score -= 60;
      reasons.push(`Contains prohibited or high-risk keyword: "${word}"`);
      suggestions.push(`Remove references to restricted goods or prohibited materials.`);
    }
  }

  // Title checks
  if (input.title.trim().length < 5) {
    score -= 25;
    reasons.push('Title is too short or lacking descriptive details.');
    suggestions.push('Provide a clear, descriptive title with brand and key specs.');
  }

  if (input.title === input.title.toUpperCase() && input.title.length > 10) {
    score -= 10;
    reasons.push('Title is all uppercase (screaming caps).');
    suggestions.push('Use standard title casing instead of all capital letters.');
  }

  // Description checks
  if (input.description.trim().length < 20) {
    score -= 15;
    reasons.push('Description is minimal or missing technical specifications.');
    suggestions.push('Add comprehensive product specs, dimensions, and usage instructions.');
  }

  // Price checks
  if (input.price <= 0) {
    score -= 50;
    reasons.push('Price must be greater than zero.');
    suggestions.push('Set a valid positive price.');
  } else if (input.price > 500000) {
    score -= 20;
    reasons.push('Price is exceptionally high and requires verification.');
    suggestions.push('Verify that the price matches marketplace standards.');
  }

  // Images check
  if (!input.image_urls || input.image_urls.length === 0) {
    score -= 15;
    reasons.push('No product images provided.');
    suggestions.push('Upload at least one high-resolution product image.');
  }

  if (reasons.length === 0) {
    reasons.push('Passed catalog quality standards: clear description, valid pricing, and appropriate category.');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
    suggestions,
  };
}

/** Score gate: >= 90 auto-approves, < 70 rejects, otherwise stays pending. */
export function decisionFromScore(score: number): 'approved' | 'rejected' | 'pending' {
  if (score >= 90) return 'approved';
  if (score < 70) return 'rejected';
  return 'pending';
}

/** Models sometimes return 0.93 instead of 93. Values strictly between 0 and 1 are fractions. */
export function normalizeModerationScore(raw: number, fallback: number): number {
  if (!Number.isFinite(raw)) return fallback;
  const scaled = raw > 0 && raw < 1 ? raw * 100 : raw;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

/**
 * Evaluates listing using Gemini if API key is present, with heuristic safety net.
 */
export async function evaluateListing(input: ModerationInput): Promise<ModerationResult> {
  const evaluated_at = new Date().toISOString();
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  const heuristic = heuristicEvaluate(input);

  // If prohibited items were found in basic heuristics, reject immediately
  if (heuristic.score < 50) {
    return {
      automated: true,
      score: heuristic.score,
      decision: 'rejected',
      reasons: heuristic.reasons,
      suggested_corrections: heuristic.suggestions,
      evaluated_at,
      model: 'heuristic-rules-v1',
    };
  }

  if (!apiKey) {
    const decision = decisionFromScore(heuristic.score);
    return {
      automated: true,
      score: heuristic.score,
      decision,
      reasons: heuristic.reasons,
      suggested_corrections: heuristic.suggestions,
      evaluated_at,
      model: 'heuristic-rules-v1',
    };
  }

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are the Autonomous Catalog Quality & Moderation Inspector for ShopSphere e-commerce marketplace.
Inspect this newly submitted product listing:
- Title: ${input.title}
- Category: ${input.category} / ${input.sub_category || 'N/A'}
- Price: ₹${input.price}
- Condition: ${input.condition || 'New'}
- Description: ${input.description}
- Tags: ${(input.tags || []).join(', ')}

Evaluate on:
1. Category Match: Does title and description belong in ${input.category}?
2. Title & Description Quality: Clear, professional, informative, no spam keyword stuffing.
3. Pricing Sanity: Does ₹${input.price} appear realistic for this product?
4. Safety & Policy: Prohibit counterfeit goods, illicit items, weapons, offensive or scam listings.

Respond ONLY with valid JSON matching this exact schema:
{
  "score": number (0-100),
  "decision": "approved" | "rejected" | "pending",
  "reasons": ["short bullet explanation"],
  "suggested_corrections": ["actionable advice for seller if any"]
}
Guideline: If score >= 90, decision MUST be "approved". If score < 70, decision MUST be "rejected". Otherwise "pending".`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (response.ok) {
      const payload: any = await response.json();
      const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        const score = typeof parsed.score === 'number'
          ? normalizeModerationScore(parsed.score, heuristic.score)
          : heuristic.score;
        // Model text can return "pending" with a score >= 90. The score gate wins.
        const decision = decisionFromScore(score);

        return {
          automated: true,
          score,
          decision,
          reasons: Array.isArray(parsed.reasons) && parsed.reasons.length > 0 ? parsed.reasons : heuristic.reasons,
          suggested_corrections: Array.isArray(parsed.suggested_corrections) ? parsed.suggested_corrections : heuristic.suggestions,
          evaluated_at,
          model,
        };
      }
    }
  } catch (err) {
    console.warn('[Moderation Service] Gemini evaluation fallback to heuristic:', err);
  }

  const decision = decisionFromScore(heuristic.score);
  return {
    automated: true,
    score: heuristic.score,
    decision,
    reasons: heuristic.reasons,
    suggested_corrections: heuristic.suggestions,
    evaluated_at,
    model: 'heuristic-rules-v1',
  };
}

/**
 * Evaluates listing and applies the decision to Supabase.
 * If approved, automatically indexes the product into RAG embeddings immediately.
 */
export async function evaluateAndApplyModeration(
  supabase: SupabaseClient<Database>,
  productId: string,
  input: ModerationInput
): Promise<ModerationResult> {
  const result = await evaluateListing(input);

  const existingAttrs: Record<string, any> = (input.attributes && typeof input.attributes === 'object' && !Array.isArray(input.attributes))
    ? { ...input.attributes }
    : {};

  const updatedAttrs: Record<string, any> = {
    ...existingAttrs,
    moderation_result: result,
  };

  const updatePayload: Database['public']['Tables']['products']['Update'] = {
    approval_status: result.decision,
    attributes: updatedAttrs,
  };

  // If auto-approved, immediately generate embedding for real-time RAG discovery
  if (result.decision === 'approved') {
    try {
      const chunk = generateProductKnowledgeChunk({
        title: input.title,
        description: input.description,
        price: input.price,
        stock: 10,
        condition: input.condition || 'New',
        category: input.category,
        sub_category: input.sub_category,
        tags: input.tags || [],
        attributes: updatedAttrs,
      });

      const vector = await generateEmbedding(chunk);
      updatePayload.embedding = toVectorLiteral(vector);
      updatedAttrs.rag_indexed_at = new Date().toISOString();
      updatedAttrs.rag_status = 'indexed';
    } catch (embErr) {
      console.warn(`[Moderation] RAG auto-indexing failed for ${productId}:`, embErr);
    }
  }

  const { error } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', productId);

  if (error) {
    throw new Error(`[Moderation] Failed to update product ${productId}: ${error.message}`);
  }

  return result;
}
