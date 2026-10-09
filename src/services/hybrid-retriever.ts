import { generateEmbedding } from '@/lib/embeddings';
import type { ProductKnowledgeNode, RagUserContext } from '@/services/rag-service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export type RetrievalMode = 'cosine' | 'hybrid';

export interface RetrieveFilters {
  approvedOnly?: boolean;
  categoryIlike?: string | null;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
}

export interface RetrieveProductsParams {
  mode: RetrievalMode;
  query: string;
  supabase: SupabaseClient<Database>;
  userContext?: RagUserContext | null;
  limit?: number;
  candidatePool?: number;
  filters?: RetrieveFilters;
}

export interface RankedCandidate extends ProductKnowledgeNode {
  similarity: number;
  cosineScore: number;
  tsRank: number;
  titleOverlap: number;
  rrfScore: number;
  finalScore: number;
}

type ProductRow = {
  id: string;
  seller_id: string;
  shop_id: string | null;
  title: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  category: string;
  sub_category: string | null;
  tags: string[] | null;
  attributes: unknown;
  image_urls: string[] | null;
  approval_status: string;
  embedding: string | null;
  deleted_at?: string | null;
};

const RRF_K = 60;
const COSINE_WEIGHT = 0.45;
const TS_WEIGHT = 0.35;
const TITLE_WEIGHT = 0.2;

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function parseVectorLiteral(vectorStr: string | null | undefined): number[] | null {
  if (!vectorStr || typeof vectorStr !== 'string') return null;
  try {
    const trimmed = vectorStr.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((val) => Number.parseFloat(val.trim()))
        .filter((num) => !Number.isNaN(num));
    }
  } catch {
    return null;
  }
  return null;
}

function isSoftDeleted(product: {
  attributes?: unknown;
  deleted_at?: string | null;
}): boolean {
  if (product.deleted_at) return true;
  if (product.attributes && typeof product.attributes === 'object' && !Array.isArray(product.attributes)) {
    const attrs = product.attributes as Record<string, unknown>;
    return attrs.is_soft_deleted === true;
  }
  return false;
}

function asAttributeRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toNode(
  p: ProductRow,
  scores: {
    similarity: number;
    cosineScore?: number;
    tsRank?: number;
    titleOverlap?: number;
    rrfScore?: number;
    finalScore?: number;
  }
): RankedCandidate {
  return {
    id: p.id,
    seller_id: p.seller_id,
    shop_id: p.shop_id,
    title: p.title,
    description: p.description,
    price: p.price,
    compare_at_price: p.compare_at_price,
    stock: p.stock,
    category: p.category,
    sub_category: p.sub_category,
    tags: p.tags || [],
    attributes: asAttributeRecord(p.attributes) as ProductKnowledgeNode['attributes'],
    image_urls: p.image_urls || [],
    approval_status: p.approval_status,
    similarity: scores.similarity,
    cosineScore: scores.cosineScore ?? scores.similarity,
    tsRank: scores.tsRank ?? 0,
    titleOverlap: scores.titleOverlap ?? 0,
    rrfScore: scores.rrfScore ?? 0,
    finalScore: scores.finalScore ?? scores.similarity,
  };
}

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);
}

export function titleTokenOverlap(query: string, title: string): number {
  const qTokens = tokenizeQuery(query);
  if (qTokens.length === 0) return 0;
  const titleLower = title.toLowerCase();
  let hits = 0;
  for (const token of qTokens) {
    if (titleLower.includes(token)) hits += 1;
  }
  return hits / qTokens.length;
}

export function rrfMerge(
  rankedLists: Array<Array<{ id: string }>>,
  k = RRF_K
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const list of rankedLists) {
    list.forEach((item, index) => {
      const prev = scores.get(item.id) ?? 0;
      scores.set(item.id, prev + 1 / (k + index + 1));
    });
  }
  return scores;
}

export function rerankCandidates(
  query: string,
  candidates: Array<{
    id: string;
    title: string;
    cosineScore: number;
    tsRank: number;
    rrfScore: number;
  }>
): Array<{ id: string; titleOverlap: number; finalScore: number }> {
  const maxTs = Math.max(0, ...candidates.map((c) => c.tsRank));
  return candidates
    .map((c) => {
      const titleOverlap = titleTokenOverlap(query, c.title);
      const normTs = maxTs > 0 ? c.tsRank / maxTs : 0;
      const finalScore =
        COSINE_WEIGHT * c.cosineScore + TS_WEIGHT * normTs + TITLE_WEIGHT * titleOverlap;
      return { id: c.id, titleOverlap, finalScore };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}

function applyRowFilters(rows: ProductRow[], filters?: RetrieveFilters): ProductRow[] {
  if (!filters) return rows;
  return rows.filter((p) => {
    if (filters.approvedOnly && p.approval_status !== 'approved') return false;
    if (filters.categoryIlike) {
      const needle = filters.categoryIlike.toLowerCase();
      if (!p.category.toLowerCase().includes(needle)) return false;
    }
    if (typeof filters.minPrice === 'number' && p.price < filters.minPrice) return false;
    if (typeof filters.maxPrice === 'number' && p.price > filters.maxPrice) return false;
    if (filters.inStockOnly && p.stock <= 0) return false;
    return true;
  });
}

async function fetchScopedProducts(
  supabase: SupabaseClient<Database>,
  userContext?: RagUserContext | null
): Promise<ProductRow[]> {
  let dbQuery = supabase
    .from('products')
    .select(
      'id, seller_id, shop_id, title, description, price, compare_at_price, stock, category, sub_category, tags, attributes, image_urls, approval_status, embedding, deleted_at'
    );

  if (userContext?.role === 'seller') {
    dbQuery = dbQuery.eq('seller_id', userContext.userId);
  } else if (userContext?.role === 'admin' && userContext.shopId) {
    dbQuery = dbQuery.eq('shop_id', userContext.shopId);
  }

  const { data, error } = await dbQuery;
  if (error || !data) return [];
  return data as ProductRow[];
}

function scoreCosine(
  queryText: string,
  queryVector: number[],
  rows: ProductRow[]
): RankedCandidate[] {
  const ranked: RankedCandidate[] = [];

  for (const p of rows) {
    if (isSoftDeleted(p)) continue;

    let similarity = 0;
    if (p.embedding) {
      const prodVector = parseVectorLiteral(p.embedding);
      if (prodVector) {
        similarity = cosineSimilarity(queryVector, prodVector);
      }
    } else {
      const qLower = queryText.toLowerCase();
      const titleLower = p.title.toLowerCase();
      const catLower = p.category.toLowerCase();
      if (titleLower.includes(qLower) || qLower.includes(titleLower)) {
        similarity = 0.75;
      } else if (catLower.includes(qLower) || qLower.includes(catLower)) {
        similarity = 0.55;
      }
    }

    ranked.push(
      toNode(p, {
        similarity,
        cosineScore: similarity,
        finalScore: similarity,
      })
    );
  }

  ranked.sort((a, b) => b.similarity - a.similarity);
  return ranked;
}

async function fetchFtsCandidates(
  supabase: SupabaseClient<Database>,
  queryText: string,
  matchCount: number,
  userContext?: RagUserContext | null
): Promise<Array<{ id: string; ts_rank: number }>> {
  const args: {
    query_text: string;
    match_count: number;
    p_seller_id?: string | null;
    p_shop_id?: string | null;
  } = {
    query_text: queryText,
    match_count: matchCount,
  };

  if (userContext?.role === 'seller') {
    args.p_seller_id = userContext.userId;
  } else if (userContext?.role === 'admin' && userContext.shopId) {
    args.p_shop_id = userContext.shopId;
  }

  const { data, error } = await supabase.rpc('match_products_fts', args);
  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    ts_rank: Number(row.ts_rank) || 0,
  }));
}

/**
 * Cosine-only retrieval — identical ranking behaviour to Assessment 2
 * `retrieveTenantProducts` before hybrid landing.
 */
export async function retrieveProductsCosine(
  params: Omit<RetrieveProductsParams, 'mode'>
): Promise<ProductKnowledgeNode[]> {
  const { query, supabase, userContext, limit = 6, filters } = params;
  const queryVector = await generateEmbedding(query);
  const rows = applyRowFilters(await fetchScopedProducts(supabase, userContext), filters);
  return scoreCosine(query, queryVector, rows).slice(0, limit);
}

/**
 * Hybrid: FTS ∪ cosine → RRF → weighted re-ranker → top-k.
 * If FTS RPC is unavailable (migration not applied), falls back to cosine-only.
 */
export async function retrieveProductsHybrid(
  params: Omit<RetrieveProductsParams, 'mode'>
): Promise<ProductKnowledgeNode[]> {
  const {
    query,
    supabase,
    userContext,
    limit = 6,
    candidatePool = 20,
    filters,
  } = params;

  const queryVector = await generateEmbedding(query);
  const rows = applyRowFilters(await fetchScopedProducts(supabase, userContext), filters);
  const cosineRanked = scoreCosine(query, queryVector, rows);
  const cosineTop = cosineRanked.slice(0, candidatePool);

  const ftsHits = await fetchFtsCandidates(supabase, query, candidatePool, userContext);

  if (ftsHits.length === 0) {
    return cosineTop.slice(0, limit);
  }

  const byId = new Map(rows.map((r) => [r.id, r]));
  const tsRankById = new Map(ftsHits.map((h) => [h.id, h.ts_rank]));
  const cosineById = new Map(cosineTop.map((c) => [c.id, c.cosineScore]));

  const rrfScores = rrfMerge([
    cosineTop.map((c) => ({ id: c.id })),
    ftsHits.map((h) => ({ id: h.id })),
  ]);

  const poolIds = Array.from(rrfScores.keys());
  const pool = poolIds
    .map((id) => {
      const row = byId.get(id);
      if (!row || isSoftDeleted(row)) return null;
      return {
        id,
        title: row.title,
        cosineScore: cosineById.get(id) ?? 0,
        tsRank: tsRankById.get(id) ?? 0,
        rrfScore: rrfScores.get(id) ?? 0,
        row,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const reranked = rerankCandidates(
    query,
    pool.map((p) => ({
      id: p.id,
      title: p.title,
      cosineScore: p.cosineScore,
      tsRank: p.tsRank,
      rrfScore: p.rrfScore,
    }))
  );

  const poolById = new Map(pool.map((p) => [p.id, p]));
  const out: RankedCandidate[] = [];
  for (const r of reranked.slice(0, limit)) {
    const p = poolById.get(r.id);
    if (!p) continue;
    out.push(
      toNode(p.row, {
        similarity: r.finalScore,
        cosineScore: p.cosineScore,
        tsRank: p.tsRank,
        titleOverlap: r.titleOverlap,
        rrfScore: p.rrfScore,
        finalScore: r.finalScore,
      })
    );
  }
  return out;
}

export async function retrieveProducts(
  params: RetrieveProductsParams
): Promise<ProductKnowledgeNode[]> {
  if (params.mode === 'cosine') {
    return retrieveProductsCosine(params);
  }
  return retrieveProductsHybrid(params);
}
