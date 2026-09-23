/**
 * Backfill products.embedding for approved products.
 * Requires the Phase 2 migration to be applied and GEMINI_API_KEY or OPENAI_API_KEY.
 * Uses the service role. Do not commit a real key. Run only against the intended project:
 *   node scripts/backfill-product-embeddings.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
const openAiKey = process.env.OPENAI_API_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function embed(text) {
  if (geminiKey) {
    const model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: 1536,
      }),
    });
    if (!response.ok) throw new Error(`Gemini ${response.status}`);
    const payload = await response.json();
    return payload.embedding.values;
  }
  if (!openAiKey) throw new Error('No embedding API key');
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiKey}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text, dimensions: 1536 }),
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}`);
  const payload = await response.json();
  return payload.data[0].embedding;
}

const { data: products, error } = await supabase
  .from('products')
  .select('id, title, description, category')
  .eq('approval_status', 'approved')
  .is('embedding', null)
  .limit(100);

if (error) {
  console.error(error.message);
  process.exit(1);
}

let updated = 0;
for (const product of products ?? []) {
  const vector = await embed(`${product.title}. ${product.category}. ${product.description}`);
  const { error: updateError } = await supabase
    .from('products')
    .update({ embedding: `[${vector.join(',')}]` })
    .eq('id', product.id);
  if (updateError) {
    console.error(product.id, updateError.message);
    continue;
  }
  updated += 1;
}

console.log(`Updated ${updated} product embeddings.`);
