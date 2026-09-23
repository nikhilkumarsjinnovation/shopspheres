import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/types/database.types';

const EMBEDDING_DIMENSIONS = 1536;

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (geminiKey && !process.env.OPENAI_API_KEY) {
    return geminiEmbedding(text, geminiKey);
  }
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    return openAiEmbedding(text, openAiKey);
  }
  if (geminiKey) {
    return geminiEmbedding(text, geminiKey);
  }
  throw new Error('No embedding API key is configured.');
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
