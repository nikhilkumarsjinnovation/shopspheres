import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { generateEmbedding, toVectorLiteral } from '@/lib/embeddings';
import { generateProductKnowledgeChunk, isProductSoftDeleted, getProductGracePeriodInfo } from '@/services/rag-service';

export interface JanitorResult {
  purgedCount: number;
  purgedProductIds: string[];
  executedAt: string;
}

export interface RagLearnerResult {
  indexedCount: number;
  failedCount: number;
  totalUnindexedRemaining: number;
  executedAt: string;
}

export interface RagJanitorSyncResult {
  janitor: JanitorResult;
  learner: RagLearnerResult;
  durationMs: number;
}

/**
 * 1. Grace Period Janitor:
 * Permanently deletes products whose 7-day soft-delete grace period has expired.
 * Also cleans up their vector embeddings and database rows completely.
 */
export async function runGracePeriodJanitor(
  supabase: SupabaseClient<Database>
): Promise<JanitorResult> {
  const executedAt = new Date().toISOString();
  const now = Date.now();

  // Query products that are marked as soft-deleted
  const { data: softDeleted, error } = await supabase
    .from('products')
    .select('id, attributes')
    .eq('attributes->>is_soft_deleted', 'true')
    .limit(500);

  if (error || !softDeleted) {
    console.warn('[RAG Janitor] Failed to query soft-deleted products:', error?.message);
    return { purgedCount: 0, purgedProductIds: [], executedAt };
  }

  const toPurgeIds: string[] = [];

  for (const item of softDeleted) {
    const info = getProductGracePeriodInfo(item);
    if (info.isDeleted && info.restoreDeadline) {
      const deadlineTime = new Date(info.restoreDeadline).getTime();
      if (!Number.isNaN(deadlineTime) && deadlineTime <= now) {
        toPurgeIds.push(item.id);
      }
    }
  }

  if (toPurgeIds.length === 0) {
    return { purgedCount: 0, purgedProductIds: [], executedAt };
  }

  // Delete in batches of 50 to prevent payload overflow
  const batchSize = 50;
  const successfullyPurged: string[] = [];

  for (let i = 0; i < toPurgeIds.length; i += batchSize) {
    const batch = toPurgeIds.slice(i, i + batchSize);
    const { error: delError } = await supabase
      .from('products')
      .delete()
      .in('id', batch);

    if (delError) {
      console.error('[RAG Janitor] Error purging expired products batch:', delError.message);
    } else {
      successfullyPurged.push(...batch);
    }
  }

  return {
    purgedCount: successfullyPurged.length,
    purgedProductIds: successfullyPurged,
    executedAt,
  };
}

/**
 * 2. Background Incremental RAG Learner:
 * Discovers approved active products without vector embeddings and indexes them.
 */
export async function runIncrementalRagLearner(
  supabase: SupabaseClient<Database>,
  batchLimit = 30
): Promise<RagLearnerResult> {
  const executedAt = new Date().toISOString();

  // Query unindexed approved products
  const { data: unindexed, error } = await supabase
    .from('products')
    .select('id, title, description, category, sub_category, price, compare_at_price, stock, condition, tags, attributes, image_urls')
    .eq('approval_status', 'approved')
    .is('embedding', null)
    .limit(batchLimit);

  if (error || !unindexed) {
    console.warn('[RAG Learner] Failed to query unindexed products:', error?.message);
    return { indexedCount: 0, failedCount: 0, totalUnindexedRemaining: 0, executedAt };
  }

  let indexedCount = 0;
  let failedCount = 0;

  for (const product of unindexed) {
    if (isProductSoftDeleted(product)) {
      continue;
    }

    try {
      const chunk = generateProductKnowledgeChunk(product);
      const vector = await generateEmbedding(chunk);
      const vectorLiteral = toVectorLiteral(vector);

      const existingAttrs = (product.attributes && typeof product.attributes === 'object' && !Array.isArray(product.attributes))
        ? { ...product.attributes }
        : {};

      const updatedAttrs = {
        ...existingAttrs,
        rag_indexed_at: executedAt,
        rag_status: 'indexed',
        rag_version: 'v2-continuous',
      };

      const { error: updateErr } = await supabase
        .from('products')
        .update({
          embedding: vectorLiteral,
          attributes: updatedAttrs,
        })
        .eq('id', product.id);

      if (updateErr) {
        console.warn(`[RAG Learner] Failed updating product ${product.id}:`, updateErr.message);
        failedCount++;
      } else {
        indexedCount++;
      }
    } catch (err) {
      console.warn(`[RAG Learner] Embedding failure for product ${product.id}:`, err);
      failedCount++;
    }
  }

  // Check remaining count
  const { count: remainingCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', 'approved')
    .is('embedding', null);

  return {
    indexedCount,
    failedCount,
    totalUnindexedRemaining: remainingCount ?? 0,
    executedAt,
  };
}

/**
 * 3. Unified Janitor & RAG Sync Engine:
 * Combines grace-period hard deletion with incremental embedding generation.
 */
export async function runRagJanitorAndSync(
  supabase: SupabaseClient<Database>
): Promise<RagJanitorSyncResult> {
  const startTime = Date.now();

  const [janitorResult, learnerResult] = await Promise.all([
    runGracePeriodJanitor(supabase),
    runIncrementalRagLearner(supabase, 80),
  ]);

  const durationMs = Date.now() - startTime;

  return {
    janitor: janitorResult,
    learner: learnerResult,
    durationMs,
  };
}
