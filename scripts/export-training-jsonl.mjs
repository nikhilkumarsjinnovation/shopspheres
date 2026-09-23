/**
 * Prints a JSONL training export to stdout.
 * Does not upload to GCS or train a model.
 *   node scripts/export-training-jsonl.mjs > training.jsonl
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);
const tables = ['user_behavior_events', 'orders', 'user_features'];

for (const table of tables) {
  const { data, error } = await supabase.from(table).select('*').limit(200);
  if (error) {
    console.error(table, error.message);
    continue;
  }
  for (const row of data ?? []) {
    console.log(JSON.stringify({ table, row }));
  }
}
