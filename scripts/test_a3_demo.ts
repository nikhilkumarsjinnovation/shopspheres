/**
 * Assessment 3 demo: report contract smoke. Offline.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`PASSED: ${message}`);
}

const root = resolve(__dirname, '..');
const reportPath = resolve(root, 'scripts/eval/assessment-3-report.md');
assert(existsSync(reportPath), 'scripts/eval/assessment-3-report.md exists');

const report = readFileSync(reportPath, 'utf8');
assert(report.includes('Architecture'), 'report has Architecture section');
assert(report.includes('mermaid'), 'report has mermaid diagram');
assert(
  report.includes('Evaluation') && report.includes('task-success'),
  'report has evaluation / task-success vs A2',
);
assert(report.includes('Click-path'), 'report has click-path');
assert(report.includes('hybrid-report'), 'report links hybrid eval');
assert(report.includes('next_purchase_predictor') && report.includes('churn_scorer'), 'report mentions churn models');
assert(report.includes('assessment-3'), 'report mentions assessment-3 tag');
assert(report.includes('actions/runs/'), 'report links a CI Actions run');
assert(report.includes('Sentry') && report.includes('Rate limits'), 'report notes observability/security');
assert(report.includes('Fine-tune') || report.includes('fine-tune'), 'report states fine-tune status');
assert(existsSync(resolve(root, 'scripts/eval/hybrid-report.md')), 'hybrid-report.md still present');
assert(existsSync(resolve(root, 'scripts/eval/baseline-a2.json')), 'baseline-a2.json still present');

console.log('All demo report checks passed.');
