/**
 * ShopSphere Customer AI Agent — Memory & Cache Layer
 * 
 * Implements Section 8 ("Memory, caching and token optimisation") from the Finance Architecture:
 * 
 * 1. Structured Session Memory: Carries forward structured intent parameters (budget, category,
 *    current product, current order ID) rather than replaying raw transcripts containing old numbers.
 *    This completely prevents LLM "number recycling" across turns!
 * 
 * 2. User-Scoped Result Cache: Keyed by `userId + canonical_query_hash + data_watermark`.
 *    Cache hits skip the LLM round-trip entirely and return previously verified data.
 *    Crucial Rule: Share the query structure, NEVER share the result across different users.
 */

import { Redis } from '@upstash/redis';
import type { StructuredIntent } from '@/services/agent-router';
import type { ValidatedOutputResult } from '@/services/agent-validator';

function redisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    return null;
  }
  return Redis.fromEnv();
}

const localCache = new Map<string, { value: ValidatedOutputResult; expiresAt: number }>();
const sessionMemoryStore = new Map<string, StructuredIntent>();

/**
 * Normalizes query string to a canonical hashable representation
 */
export function canonicalQueryHash(query: string, mode: string, category?: string | null): string {
  const clean = query
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
  const cat = (category || 'all').toLowerCase();
  return `${mode}:${cat}:${clean}`;
}

/**
 * Gets cached verified result for user
 */
export async function getCachedAgentResult(
  userId: string | null,
  queryHash: string,
  watermark: string
): Promise<ValidatedOutputResult | null> {
  const effectiveUser = userId || 'anonymous';
  const key = `agent_cache:${effectiveUser}:${queryHash}:${watermark}`;

  const redis = redisClient();
  if (redis) {
    try {
      const raw = await redis.get<ValidatedOutputResult>(key);
      if (raw) return raw;
    } catch {
      // ignore
    }
  }

  const local = localCache.get(key);
  if (local && local.expiresAt > Date.now()) {
    return local.value;
  }

  return null;
}

/**
 * Caches verified result
 */
export async function setCachedAgentResult(
  userId: string | null,
  queryHash: string,
  watermark: string,
  result: ValidatedOutputResult,
  ttlSeconds = 120
): Promise<void> {
  const effectiveUser = userId || 'anonymous';
  const key = `agent_cache:${effectiveUser}:${queryHash}:${watermark}`;

  const redis = redisClient();
  if (redis) {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(result));
    } catch {
      // ignore
    }
  }

  localCache.set(key, {
    value: result,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Structured Session Memory: remembers intent without bloated text containing past numbers.
 * Carries forward slots (recipient email, product title, gift message, category) across turns.
 */
export function recordSessionIntent(sessionId: string, intent: StructuredIntent): void {
  const existing = sessionMemoryStore.get(sessionId);
  const merged: StructuredIntent = {
    ...existing,
    ...intent,
    recipient_email: intent.recipient_email || existing?.recipient_email || null,
    selected_product_title: intent.selected_product_title || existing?.selected_product_title || null,
    gift_message: intent.gift_message || existing?.gift_message || null,
    category: intent.category || existing?.category || null,
    price_range: (intent.price_range?.max || intent.price_range?.min) ? intent.price_range : (existing?.price_range || intent.price_range),
  };
  sessionMemoryStore.set(sessionId, merged);
}

export function getSessionIntent(sessionId: string): StructuredIntent | null {
  return sessionMemoryStore.get(sessionId) || null;
}

export function clearSessionIntent(sessionId: string): void {
  sessionMemoryStore.delete(sessionId);
}
