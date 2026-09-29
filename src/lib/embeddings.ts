import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/types/database.types';

const EMBEDDING_DIMENSIONS = 1536;

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

function normalizeL2(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return norm === 0 ? vector : vector.map((v) => v / norm);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY || process.env.NV_API_KEY;

  const errors: string[] = [];

  // 1. Try Gemini Embedding (Primary)
  if (geminiKey) {
    try {
      return await geminiEmbedding(text, geminiKey);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[Embedding Service] Gemini failed, attempting fallback...', msg);
      errors.push(`Gemini: ${msg}`);
    }
  }

  // 2. Try OpenAI Embedding (Secondary)
  if (openAiKey) {
    try {
      return await openAiEmbedding(text, openAiKey);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[Embedding Service] OpenAI failed, attempting fallback...', msg);
      errors.push(`OpenAI: ${msg}`);
    }
  }

  // 3. Try NVIDIA NIM Embedding (Fallback: nemotron-3-embed-1b)
  if (nvidiaKey) {
    try {
      return await nvidiaEmbedding(text, nvidiaKey);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[Embedding Service] NVIDIA fallback failed:', msg);
      errors.push(`NVIDIA: ${msg}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`All embedding providers failed: ${errors.join(' | ')}`);
  }

  throw new Error('No embedding API key is configured (GEMINI_API_KEY, OPENAI_API_KEY, or NVIDIA_API_KEY).');
}

export async function nvidiaEmbedding(text: string, apiKey: string): Promise<number[]> {
  const rawModel = process.env.EMBED_NVIDIA_MODEL || 'nemotron-3-embed-1b';
  // NVIDIA NIM endpoint requires the org prefix if omitted
  const model = rawModel.includes('/') ? rawModel : `nvidia/${rawModel}`;
  const url = process.env.NVIDIA_EMBEDDING_API_URL || 'https://integrate.api.nvidia.com/v1/embeddings';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: [text],
      model,
      input_type: 'passage',
      encoding_format: 'float',
      truncate: 'NONE',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA embedding failed with status ${response.status}: ${errorText}`);
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) {
    throw new Error('NVIDIA embedding response did not include a valid data vector array.');
  }

  const first = payload.data[0];
  if (!first || typeof first !== 'object' || !('embedding' in first) || !Array.isArray(first.embedding)) {
    throw new Error('NVIDIA embedding payload did not contain first element embedding.');
  }

  const rawVector = first.embedding.filter((v: unknown): v is number => typeof v === 'number');
  if (rawVector.length === 0) {
    throw new Error('NVIDIA embedding produced an empty vector.');
  }

  // Adjust dimensions to match PostgreSQL vector(1536)
  if (rawVector.length >= EMBEDDING_DIMENSIONS) {
    // Truncate first 1536 dimensions and L2-normalize (MRL pattern)
    return normalizeL2(rawVector.slice(0, EMBEDDING_DIMENSIONS));
  }

  // Pad if shorter than 1536
  const padded = [...rawVector];
  while (padded.length < EMBEDDING_DIMENSIONS) {
    padded.push(0);
  }
  return normalizeL2(padded);
}

async function geminiEmbedding(text: string, apiKey: string): Promise<number[]> {
  const model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini embedding failed with status ${response.status}`);
  }
  const payload: unknown = await response.json();
  return readNumberList(payload, ['embedding', 'values']);
}

async function openAiEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI embedding failed with status ${response.status}`);
  }
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) {
    throw new Error('Embedding response did not include a vector.');
  }
  const first = payload.data[0];
  if (!first || typeof first !== 'object' || !('embedding' in first) || !Array.isArray(first.embedding)) {
    throw new Error('Embedding response did not include a vector.');
  }
  return first.embedding.filter((value: unknown): value is number => typeof value === 'number');
}

function readNumberList(payload: unknown, path: string[]): number[] {
  let current: unknown = payload;
  for (const key of path) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      throw new Error('Embedding response did not include a vector.');
    }
    current = current[key as keyof typeof current];
  }
  if (!Array.isArray(current)) {
    throw new Error('Embedding response did not include a vector.');
  }
  return current.filter((value): value is number => typeof value === 'number');
}

export async function searchSimilarProducts(embedding: number[], limit: number): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('match_products', {
    query_embedding: toVectorLiteral(embedding),
    match_count: limit,
  });
  if (error) {
    throw new Error(error.message);
  }
  const rankedIds = (data ?? []).map((row) => row.id);
  if (rankedIds.length === 0) {
    return [];
  }
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .in('id', rankedIds);
  if (productError) {
    throw new Error(productError.message);
  }
  const byId = new Map((products ?? []).map((product) => [product.id, product]));
  return rankedIds.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}
