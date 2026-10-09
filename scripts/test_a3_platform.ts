/**
 * Assessment 3 platform: npm test contract + workflow + Sentry helper smoke.
 * Offline — no network / DB.
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
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
};

assert(typeof pkg.scripts?.test === 'string' && pkg.scripts.test.length > 0, 'package.json has npm test');
assert(
  typeof pkg.scripts?.typecheck === 'string' && pkg.scripts.typecheck.includes('tsc'),
  'package.json has typecheck',
);
assert(
  typeof pkg.scripts?.['test:a3-unit'] === 'string' && pkg.scripts['test:a3-unit'].includes('tsx'),
  'package.json has test:a3-unit with tsx scripts',
);

const workflowPath = resolve(root, '.github/workflows/test.yml');
assert(existsSync(workflowPath), '.github/workflows/test.yml exists');
const workflow = readFileSync(workflowPath, 'utf8');
assert(workflow.includes('npm run typecheck'), 'workflow runs typecheck');
assert(workflow.includes('test:a3-unit') || workflow.includes('tsx'), 'workflow runs tsx unit scripts');
assert(workflow.includes('npm test'), 'workflow runs npm test');

assert(Boolean(pkg.dependencies?.['@sentry/nextjs']), '@sentry/nextjs is a dependency');
assert(existsSync(resolve(root, 'src/instrumentation.ts')), 'instrumentation.ts exists');
assert(existsSync(resolve(root, 'src/lib/sentry.ts')), 'src/lib/sentry.ts exists');
assert(existsSync(resolve(root, 'src/app/(admin)/admin/metrics/page.tsx')), 'admin metrics page exists');

const envExample = readFileSync(resolve(root, '.env.example'), 'utf8');
assert(envExample.includes('SENTRY_DSN'), '.env.example documents SENTRY_DSN');
assert(envExample.includes('NEXT_PUBLIC_SENTRY_DSN'), '.env.example documents NEXT_PUBLIC_SENTRY_DSN');

console.log('All platform checks passed.');
