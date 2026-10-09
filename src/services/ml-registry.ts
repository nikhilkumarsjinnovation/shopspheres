/**
 * Updates ml_models registry rows for trained churn / next-purchase models.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database.types';
import {
  metricsToRegistryJson,
  type TrainedModelResult,
} from '@/services/churn-models';

export const CHURN_MODEL_NAMES = ['next_purchase_predictor', 'churn_scorer'] as const;

export async function updateMlModelRegistry(
  supabase: SupabaseClient<Database>,
  result: TrainedModelResult,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const metrics = metricsToRegistryJson(result) as Json;
  const { error } = await supabase
    .from('ml_models')
    .update({
      version: result.version,
      artifact_uri: result.artifactUri,
      framework: 'heuristic',
      metrics,
      is_active: true,
      activated_at: new Date().toISOString(),
      training_data_snapshot: result.trainingDataSnapshot,
    })
    .eq('name', result.name);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function updateBothChurnModels(
  supabase: SupabaseClient<Database>,
  nextPurchase: TrainedModelResult,
  churn: TrainedModelResult,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const a = await updateMlModelRegistry(supabase, nextPurchase);
  if (!a.ok) return a;
  return updateMlModelRegistry(supabase, churn);
}

export async function fetchChurnModelRows(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('ml_models')
    .select('name, version, artifact_uri, framework, metrics, is_active, training_data_snapshot, activated_at')
    .in('name', [...CHURN_MODEL_NAMES]);

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}
