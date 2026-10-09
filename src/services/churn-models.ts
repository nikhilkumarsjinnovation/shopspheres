/**
 * Next-purchase and churn scorers trained on RFM order features.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database.types';
import {
  buildLabeledExamples,
  featuresAt,
  featuresToVector,
  type OrderRowForRfm,
  type RfmFeatures,
} from '@/services/rfm-features';
import {
  confusion,
  predictBinary,
  predictProba,
  splitTrainTest,
  trainLogisticClassifier,
  type BinaryMetrics,
  type LogisticModel,
} from '@/services/ml-logistic';

export const NEXT_PURCHASE_ARTIFACT_URI = 'inline://rfm-logistic-next-purchase-v1';
export const CHURN_ARTIFACT_URI = 'inline://rfm-logistic-churn-v1';
export const MODEL_VERSION = '0.1.0';

export type ChurnTier = 'low' | 'med' | 'high';

export type TrainedModelResult = {
  name: 'next_purchase_predictor' | 'churn_scorer';
  artifactUri: string;
  version: string;
  model: LogisticModel;
  metrics: BinaryMetrics & {
    threshold: number;
    n_train: number;
    n_test: number;
    labeled_at: string;
  };
  trainingDataSnapshot: string;
};

export type ScoreResult = {
  nextPurchaseProb: number;
  nextPurchaseLabel: 0 | 1;
  churnRisk: number;
  churnTier: ChurnTier;
  churnLabel: 0 | 1;
};

function snapshotId(orders: OrderRowForRfm[], asOf: Date, nTrain: number, nTest: number): string {
  return `orders=${orders.length};asOf=${asOf.toISOString().slice(0, 10)};train=${nTrain};test=${nTest}`;
}

function trainTask(
  name: 'next_purchase_predictor' | 'churn_scorer',
  artifactUri: string,
  orders: OrderRowForRfm[],
  asOf: Date,
  task: 'churn' | 'next_purchase',
): TrainedModelResult {
  const examples = buildLabeledExamples(orders, asOf, task);
  const { train, test } = splitTrainTest(examples, 0.3, name === 'churn_scorer' ? 11 : 17);
  const Xtrain = train.map((ex) => featuresToVector(ex.features));
  const ytrain = train.map((ex) => ex.label);
  const { model } = trainLogisticClassifier(Xtrain, ytrain, {
    epochs: 500,
    learningRate: 0.4,
    l2: 0.02,
    seed: name === 'churn_scorer' ? 101 : 202,
  });

  const evalX = test.length > 0 ? test.map((ex) => featuresToVector(ex.features)) : Xtrain;
  const evalY = test.length > 0 ? test.map((ex) => ex.label) : ytrain;
  const preds = evalX.map((row) => predictBinary(model, row));
  const metrics = confusion(evalY, preds);

  return {
    name,
    artifactUri,
    version: MODEL_VERSION,
    model,
    metrics: {
      ...metrics,
      threshold: model.threshold,
      n_train: train.length,
      n_test: evalX.length,
      labeled_at: asOf.toISOString(),
    },
    trainingDataSnapshot: snapshotId(orders, asOf, train.length, evalX.length),
  };
}

export function trainNextPurchase(orders: OrderRowForRfm[], asOf: Date): TrainedModelResult {
  return trainTask('next_purchase_predictor', NEXT_PURCHASE_ARTIFACT_URI, orders, asOf, 'next_purchase');
}

export function trainChurn(orders: OrderRowForRfm[], asOf: Date): TrainedModelResult {
  return trainTask('churn_scorer', CHURN_ARTIFACT_URI, orders, asOf, 'churn');
}

export function trainBoth(orders: OrderRowForRfm[], asOf: Date): {
  nextPurchase: TrainedModelResult;
  churn: TrainedModelResult;
} {
  return {
    nextPurchase: trainNextPurchase(orders, asOf),
    churn: trainChurn(orders, asOf),
  };
}

export function churnTierFromRisk(risk: number): ChurnTier {
  if (risk >= 0.66) return 'high';
  if (risk >= 0.33) return 'med';
  return 'low';
}

export function scoreFeatures(
  features: RfmFeatures,
  nextPurchaseModel: LogisticModel,
  churnModel: LogisticModel,
): ScoreResult {
  const vector = featuresToVector(features);
  const nextPurchaseProb = predictProba(nextPurchaseModel, vector);
  const churnRisk = predictProba(churnModel, vector);
  return {
    nextPurchaseProb,
    nextPurchaseLabel: predictBinary(nextPurchaseModel, vector),
    churnRisk,
    churnTier: churnTierFromRisk(churnRisk),
    churnLabel: predictBinary(churnModel, vector),
  };
}

export function scoreCustomer(
  customerId: string,
  orders: OrderRowForRfm[],
  asOf: Date,
  nextPurchaseModel: LogisticModel,
  churnModel: LogisticModel,
): ScoreResult | null {
  const features = featuresAt(customerId, orders, asOf);
  if (!features) return null;
  return scoreFeatures(features, nextPurchaseModel, churnModel);
}

function asFeatureRecord(value: Json | null | undefined): Record<string, Json | undefined> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, Json | undefined>;
}

export async function mergeIntoUserFeatures(
  supabase: SupabaseClient<Database>,
  userId: string,
  score: ScoreResult,
  modelVersion: string = MODEL_VERSION,
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from('user_features')
    .select('features')
    .eq('user_id', userId)
    .maybeSingle();
  if (readError) {
    throw new Error(readError.message);
  }

  const base = asFeatureRecord(existing?.features ?? {});
  const merged: Json = {
    ...base,
    churn_risk: score.churnRisk,
    churn_tier: score.churnTier,
    next_purchase_prob: score.nextPurchaseProb,
  };

  const { error } = await supabase.from('user_features').upsert({
    user_id: userId,
    features: merged,
    model_version: modelVersion,
    computed_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
}

export function metricsToRegistryJson(
  result: TrainedModelResult,
): Record<string, number | string> {
  return {
    precision: Number(result.metrics.precision.toFixed(4)),
    recall: Number(result.metrics.recall.toFixed(4)),
    f1: Number(result.metrics.f1.toFixed(4)),
    threshold: result.metrics.threshold,
    n_train: result.metrics.n_train,
    n_test: result.metrics.n_test,
    labeled_at: result.metrics.labeled_at,
  };
}
