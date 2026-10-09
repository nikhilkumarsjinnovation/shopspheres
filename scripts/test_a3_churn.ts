/**
 * Assessment 3 churn: RFM logistic next-purchase + churn F1 from fixture.
 * Offline by default. Optional: A3_CHURN_LIVE=1 writes ml_models (NOT VERIFIED until data exists).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CHURN_ARTIFACT_URI,
  NEXT_PURCHASE_ARTIFACT_URI,
  metricsToRegistryJson,
  scoreCustomer,
  trainBoth,
} from '../src/services/churn-models';
import { getCommittedChurnArtifacts } from '../src/services/churn-model-artifacts';
import type { OrderRowForRfm } from '../src/services/rfm-features';
import { featuresAt } from '../src/services/rfm-features';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`PASSED: ${message}`);
}

function isFiniteUnit(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

type Fixture = { asOf: string; orders: OrderRowForRfm[] };

async function run() {
  const fixturePath = resolve(__dirname, 'fixtures/a3-churn-orders.json');
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as Fixture;
  const asOf = new Date(fixture.asOf);
  assert(!Number.isNaN(asOf.getTime()), 'Fixture asOf parses');

  const trained = trainBoth(fixture.orders, asOf);
  const nextMetrics = trained.nextPurchase.metrics;
  const churnMetrics = trained.churn.metrics;

  console.log(
    `next_purchase_predictor  precision=${nextMetrics.precision.toFixed(4)} recall=${nextMetrics.recall.toFixed(4)} f1=${nextMetrics.f1.toFixed(4)}`,
  );
  console.log(
    `churn_scorer             precision=${churnMetrics.precision.toFixed(4)} recall=${churnMetrics.recall.toFixed(4)} f1=${churnMetrics.f1.toFixed(4)}`,
  );
  if (nextMetrics.f1 < 0.8 || churnMetrics.f1 < 0.8) {
    console.log('NOTE: F1 under 0.80 recorded as measured (no padding).');
  }

  assert(trained.nextPurchase.artifactUri === NEXT_PURCHASE_ARTIFACT_URI, 'Next-purchase artifact URI is inline trained');
  assert(trained.churn.artifactUri === CHURN_ARTIFACT_URI, 'Churn artifact URI is inline trained');
  assert(trained.nextPurchase.artifactUri !== 'pending://not-trained', 'Next-purchase left pending://not-trained');
  assert(trained.churn.artifactUri !== 'pending://not-trained', 'Churn left pending://not-trained');

  for (const [label, metrics] of [
    ['next_purchase', nextMetrics],
    ['churn', churnMetrics],
  ] as const) {
    assert(isFiniteUnit(metrics.precision), `${label} precision in [0,1]`);
    assert(isFiniteUnit(metrics.recall), `${label} recall in [0,1]`);
    assert(isFiniteUnit(metrics.f1), `${label} f1 in [0,1]`);
    assert(metrics.n_train > 0 && metrics.n_test > 0, `${label} has train/test sizes`);
  }

  const registryShape = metricsToRegistryJson(trained.churn);
  assert(typeof registryShape.f1 === 'number', 'Registry metrics include f1');
  assert(typeof registryShape.precision === 'number', 'Registry metrics include precision');
  assert(typeof registryShape.recall === 'number', 'Registry metrics include recall');

  const committed = getCommittedChurnArtifacts();
  assert(committed.nextPurchase.artifactUri === NEXT_PURCHASE_ARTIFACT_URI, 'Committed next-purchase URI');
  assert(committed.churn.artifactUri === CHURN_ARTIFACT_URI, 'Committed churn URI');

  const sampleId = 'cust_active_01';
  const feats = featuresAt(sampleId, fixture.orders, asOf);
  assert(feats !== null, 'Active sample has RFM features');
  const scoredOrNull = scoreCustomer(
    sampleId,
    fixture.orders,
    asOf,
    committed.nextPurchase.model,
    committed.churn.model,
  );
  assert(scoredOrNull !== null, 'Active sample scores');
  if (!scoredOrNull) process.exit(1);
  const scored = scoredOrNull;
  assert(isFiniteUnit(scored.nextPurchaseProb), 'next_purchase_prob in [0,1]');
  assert(isFiniteUnit(scored.churnRisk), 'churn_risk in [0,1]');
  assert(['low', 'med', 'high'].includes(scored.churnTier), 'churn_tier is low|med|high');

  const staleOrNull = scoreCustomer(
    'cust_churn_01',
    fixture.orders,
    asOf,
    committed.nextPurchase.model,
    committed.churn.model,
  );
  assert(staleOrNull !== null, 'Churn sample scores');
  if (!staleOrNull) process.exit(1);
  assert(staleOrNull.churnRisk >= scored.churnRisk, 'Stale customer churn_risk >= active sample');

  if (process.env.A3_CHURN_LIVE === '1') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.log('SKIP DB path: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    } else {
      const { createAdminClient } = await import('../src/lib/supabase/admin');
      const { loadAllOrdersForTraining } = await import('../src/services/churn-order-loader');
      const { updateBothChurnModels } = await import('../src/services/ml-registry');
      const admin = createAdminClient();
      const liveOrders = await loadAllOrdersForTraining(admin);
      if (liveOrders.length < 10) {
        console.log(`SKIP DB train: only ${liveOrders.length} orders (need denser history)`);
      } else {
        const liveAsOf = new Date();
        const liveTrained = trainBoth(liveOrders, liveAsOf);
        const updated = await updateBothChurnModels(admin, liveTrained.nextPurchase, liveTrained.churn);
        assert(updated.ok, updated.ok ? 'Registry updated' : `Registry update failed: ${updated.error}`);
        console.log('DB path attempted: ml_models updated for both models');
        console.log(
          `live next f1=${liveTrained.nextPurchase.metrics.f1.toFixed(4)} churn f1=${liveTrained.churn.metrics.f1.toFixed(4)}`,
        );
      }
    }
  } else {
    console.log('SKIP DB path: set A3_CHURN_LIVE=1 to persist metrics (NOT VERIFIED until then)');
  }

  console.log('All churn checks passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
