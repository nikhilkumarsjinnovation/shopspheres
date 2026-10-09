/**
 * Offline smoke for Assessment 3 Branch 4 hybrid retrieval helpers + report contract.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { rrfMerge, rerankCandidates, titleTokenOverlap } from '../src/services/hybrid-retriever';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`PASSED: ${message}`);
}

function run() {
  const overlap = titleTokenOverlap('bella vita perfume gift', 'Bella Vita Luxury Perfume');
  assert(overlap > 0.4, `title overlap scores multi-token match (${overlap.toFixed(2)})`);

  const rrf = rrfMerge([
    [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    [{ id: 'b' }, { id: 'a' }, { id: 'd' }],
  ]);
  assert((rrf.get('a') ?? 0) > 0, 'rrf scores id a');
  assert((rrf.get('b') ?? 0) >= (rrf.get('c') ?? 0), 'rrf prefers items in both lists');

  const reranked = rerankCandidates('tribit speaker gift', [
    { id: 'x', title: 'Random Mug', cosineScore: 0.9, tsRank: 0.1, rrfScore: 0.02 },
    { id: 'y', title: 'Tribit StormBox Speaker', cosineScore: 0.5, tsRank: 0.8, rrfScore: 0.03 },
  ]);
  assert(reranked[0]?.id === 'y', 're-ranker promotes title+ts match over cosine-only mug');

  const scenariosPath = resolve('scripts/eval/scenarios-gift-checkout.json');
  assert(existsSync(scenariosPath), 'labelled gift/checkout scenarios file exists');
  const scenarios = JSON.parse(readFileSync(scenariosPath, 'utf8')) as Array<{ task: string }>;
  const gifts = scenarios.filter((s) => s.task === 'gift').length;
  const checkouts = scenarios.filter((s) => s.task === 'checkout').length;
  assert(gifts >= 5, `at least 5 gift scenarios (${gifts})`);
  assert(checkouts >= 5, `at least 5 checkout scenarios (${checkouts})`);

  const baselinePath = resolve('scripts/eval/baseline-a2.json');
  const reportPath = resolve('scripts/eval/hybrid-report.md');
  if (existsSync(baselinePath)) {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as { mode: string };
    assert(baseline.mode === 'cosine', 'baseline-a2.json was measured with cosine mode');
  } else {
    console.log('SKIP: baseline-a2.json not written yet (run --baseline)');
  }

  if (existsSync(reportPath)) {
    const report = readFileSync(reportPath, 'utf8');
    assert(report.includes('Baseline (cosine A2)'), 'report has baseline column');
    assert(report.includes('Hybrid + re-rank'), 'report has hybrid column');
    assert(report.includes('Task-success'), 'report includes task-success');
    assert(report.includes('Hit-rate'), 'report includes hit-rate');
    assert(report.includes('Precision@'), 'report includes precision@k');
    assert(report.includes('Faithfulness'), 'report includes faithfulness');
    assert(report.includes('Answer-relevance'), 'report includes answer-relevance');
  } else {
    console.log('SKIP: hybrid-report.md not written yet (run --compare)');
  }

  console.log('\nAll offline hybrid eval smoke checks passed.');
}

run();
