/**
 * Shared product → embedding indexer for moderation, admin approve, and learners.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { generateEmbedding, toVectorLiteral } from '@/lib/embeddings';
import { generateProductKnowledgeChunk } from '@/services/rag-service';
import type { Database, Json } from '@/types/database.types';

export type ProductIndexInput = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  sub_category?: string | null;
  price: number;
  compare_at_price?: number | null;
  stock?: number | null;
  condition?: string | null;
  tags?: string[] | null;
  attributes?: Json | null;
  image_urls?: string[] | null;
};

export type IndexProductResult =
  | { ok: true; ragIndexedAt: string }
  | { ok: false; error: string };

/**
 * Generate and store a RAG embedding for one product. Does not change approval_status.
 */
export async function indexProductEmbedding(
  supabase: SupabaseClient<Database>,
  product: ProductIndexInput,
): Promise<IndexProductResult> {
  try {
    const chunk = generateProductKnowledgeChunk({
      title: product.title,
      description: product.description ?? '',
      price: product.price,
      compare_at_price: product.compare_at_price,
      stock: product.stock ?? 0,
      condition: product.condition || 'New',
      category: product.category ?? 'General',
      sub_category: product.sub_category,
      tags: product.tags || [],
      attributes:
        product.attributes && typeof product.attributes === 'object' && !Array.isArray(product.attributes)
          ? (product.attributes as Record<string, unknown>)
          : {},
    });

    const vector = await generateEmbedding(chunk);
    const vectorLiteral = toVectorLiteral(vector);
    const ragIndexedAt = new Date().toISOString();

    const existingAttrs =
      product.attributes && typeof product.attributes === 'object' && !Array.isArray(product.attributes)
        ? { ...(product.attributes as Record<string, unknown>) }
        : {};

    const updatedAttrs = {
      ...existingAttrs,
      rag_indexed_at: ragIndexedAt,
      rag_status: 'indexed',
    };

    const { error } = await supabase
      .from('products')
      .update({
        embedding: vectorLiteral,
        attributes: updatedAttrs,
      })
      .eq('id', product.id);

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, ragIndexedAt };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Embedding failed',
    };
  }
}
