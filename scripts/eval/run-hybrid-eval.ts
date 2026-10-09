/**
 * Assessment 3 Branch 4 — hybrid retrieval eval.
 *
 *   npx tsx scripts/eval/run-hybrid-eval.ts --baseline
 *   npx tsx scripts/eval/run-hybrid-eval.ts --compare
 *
 * --baseline freezes cosine-only metrics into baseline-a2.json (refuses overwrite unless --force).
 * --compare loads baseline + runs hybrid, writes hybrid-report.md with two measured columns.
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { routeUserQuestion, type AgentInteractionMode, type StructuredIntent } from '../../src/services/agent-router';
import {
  retrieveProducts,
  type RetrievalMode,
} from '../../src/services/hybrid-retriever';
import type { ProductKnowledgeNode } from '../../src/services/rag-service';
import type { Database } from '../../src/types/database.types';

const ROOT = resolve(process.cwd());
const SCENARIOS_PATH = resolve(ROOT, 'scripts/eval/scenarios-gift-checkout.json');
const BASELINE_PATH = resolve(ROOT, 'scripts/eval/baseline-a2.json');
const REPORT_PATH = resolve(ROOT, 'scripts/eval/hybrid-report.md');
const K = 5;

interface Scenario {
  id: string;
  task: 'gift' | 'checkout';
  query: string;
  noise_query: string;
  relevant_title_patterns: string[];
  expected_router: {
    needs_clarification?: boolean;
    intent_type?: string;
    target_entity?: string;
    action_requires_agent_mode?: boolean;
  };
  gold_answer_keywords: string[];
  router_mode?: AgentInteractionMode;
  router_history?: {
    recentTurns?: Array<{ role: string; content: string }>;
    previousIntent?: Partial<StructuredIntent>;
  };
}

interface MetricBundle {
  taskSuccessPct: number;
  hitRate: number;
  precisionAtK: number;
  faithfulness: number;
  answerRelevance: number;
  noiseHitRate: number;
  scenarioCount: number;
  ftsAvailable: boolean;
  mode: RetrievalMode;
  measuredAt: string;
  perScenario: ScenarioResult[];
}

interface ScenarioResult {
  id: string;
  task: string;
  hit: boolean;
  precisionAtK: number;
  taskSuccess: boolean;
  faithfulness: number;
  answerRelevance: number;
  noiseHit: boolean;
  retrievedTitles: string[];
}

function loadEnvLocal() {
  const envPath = resolve(ROOT, '.env.local');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function isRelevant(title: string, patterns: string[]): boolean {
  const t = title.toLowerCase();
  return patterns.some((p) => t.includes(p.toLowerCase()));
}

function hitAtK(nodes: ProductKnowledgeNode[], patterns: string[], k: number): boolean {
  return nodes.slice(0, k).some((n) => isRelevant(n.title, patterns));
}

function precisionAtK(nodes: ProductKnowledgeNode[], patterns: string[], k: number): number {
  const top = nodes.slice(0, k);
  if (top.length === 0) return 0;
  const relevant = top.filter((n) => isRelevant(n.title, patterns)).length;
  return relevant / k;
}

function groundedAnswer(query: string, nodes: ProductKnowledgeNode[]): string {
  if (nodes.length === 0) {
    return `I could not find matching products for "${query}".`;
  }
  const lines = nodes.slice(0, 3).map((n, i) => {
    return `${i + 1}. ${n.title} (₹${n.price}) in ${n.category}`;
  });
  return `Based on the catalog, here are options for "${query}":\n${lines.join('\n')}`;
}

function faithfulnessScore(answer: string, nodes: ProductKnowledgeNode[]): number {
  const titles = nodes.map((n) => n.title).filter((t) => t.length > 3);
  if (titles.length === 0) return 1;
  const lower = answer.toLowerCase();
  const cited = titles.filter((t) => lower.includes(t.toLowerCase()));
  // Every cited title must be from retrieved set; score = cited/min(3, titles) when citing, else 1 if no title tokens claimed
  const answerHasAnyTitle = titles.some((t) => lower.includes(t.toLowerCase().split(/\s+/)[0] ?? ''));
  if (!answerHasAnyTitle) return 1;
  return cited.length / Math.min(3, titles.length);
}

function answerRelevanceScore(answer: string, gold: string[], query: string): number {
  const tokens = new Set(
    `${query} ${gold.join(' ')}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const answerTokens = new Set(
    answer
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  if (tokens.size === 0) return 0;
  let inter = 0;
  for (const t of tokens) {
    if (answerTokens.has(t)) inter += 1;
  }
  return inter / tokens.size;
}

function routerTaskSuccess(scenario: Scenario): boolean {
  const mode = scenario.router_mode ?? 'agent';
  const history = scenario.router_history
    ? {
        recentTurns: scenario.router_history.recentTurns as Array<{
          role: 'user' | 'assistant' | 'system';
          content: string;
        }>,
        previousIntent: scenario.router_history.previousIntent as StructuredIntent | undefined,
      }
    : undefined;

  const route = routeUserQuestion(scenario.query, mode, history);
  const exp = scenario.expected_router;

  if (typeof exp.needs_clarification === 'boolean' && route.needs_clarification !== exp.needs_clarification) {
    return false;
  }
  if (exp.intent_type && route.intent_type !== exp.intent_type) {
    return false;
  }
  if (exp.target_entity && route.target_entity !== exp.target_entity) {
    return false;
  }
  if (
    typeof exp.action_requires_agent_mode === 'boolean' &&
    route.action_requires_agent_mode !== exp.action_requires_agent_mode
  ) {
    return false;
  }
  return true;
}

async function probeFts(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<boolean> {
  const { error } = await supabase.rpc('match_products_fts', {
    query_text: 'perfume',
    match_count: 1,
  });
  return !error;
}

async function evaluateMode(
  mode: RetrievalMode,
  scenarios: Scenario[],
  supabase: ReturnType<typeof createClient<Database>>,
  ftsAvailable: boolean
): Promise<MetricBundle> {
  const perScenario: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    const nodes = await retrieveProducts({
      mode,
      query: scenario.query,
      supabase,
      limit: K,
      filters: { approvedOnly: true },
    });

    const noiseNodes = await retrieveProducts({
      mode,
      query: scenario.noise_query,
      supabase,
      limit: K,
      filters: { approvedOnly: true },
    });

    const answer = groundedAnswer(scenario.query, nodes);
    const hit = hitAtK(nodes, scenario.relevant_title_patterns, K);
    const pAtK = precisionAtK(nodes, scenario.relevant_title_patterns, K);
    const routerOk = routerTaskSuccess(scenario);
    // Task success: router expectations + (for discovery queries) a retrieval hit
    const needsRetrievalHit =
      scenario.expected_router.needs_clarification !== true &&
      scenario.expected_router.intent_type !== 'action_task';
    const taskSuccess = routerOk && (needsRetrievalHit ? hit : true);

    perScenario.push({
      id: scenario.id,
      task: scenario.task,
      hit,
      precisionAtK: pAtK,
      taskSuccess,
      faithfulness: faithfulnessScore(answer, nodes),
      answerRelevance: answerRelevanceScore(answer, scenario.gold_answer_keywords, scenario.query),
      noiseHit: hitAtK(noiseNodes, scenario.relevant_title_patterns, K),
      retrievedTitles: nodes.slice(0, K).map((n) => n.title),
    });
  }

  return {
    mode,
    measuredAt: new Date().toISOString(),
    scenarioCount: scenarios.length,
    ftsAvailable: mode === 'hybrid' ? ftsAvailable : false,
    taskSuccessPct: mean(perScenario.map((s) => (s.taskSuccess ? 1 : 0))),
    hitRate: mean(perScenario.map((s) => (s.hit ? 1 : 0))),
    precisionAtK: mean(perScenario.map((s) => s.precisionAtK)),
    faithfulness: mean(perScenario.map((s) => s.faithfulness)),
    answerRelevance: mean(perScenario.map((s) => s.answerRelevance)),
    noiseHitRate: mean(perScenario.map((s) => (s.noiseHit ? 1 : 0))),
    perScenario,
  };
}

function writeReport(baseline: MetricBundle, hybrid: MetricBundle) {
  const lines = [
    '# Assessment 3 — Hybrid retrieval eval report',
    '',
    `Measured at: ${hybrid.measuredAt}`,
    `Scenarios: ${hybrid.scenarioCount} labelled gift/checkout cases (k=${K})`,
    `Baseline mode: ${baseline.mode} (frozen in baseline-a2.json at ${baseline.measuredAt})`,
    `Compare mode: ${hybrid.mode} (FTS available: ${hybrid.ftsAvailable ? 'yes' : 'NO — pending migration apply'})`,
    '',
    '| Metric | Baseline (cosine A2) | Hybrid + re-rank |',
    '| --- | ---: | ---: |',
    `| Task-success % | ${pct(baseline.taskSuccessPct)} | ${pct(hybrid.taskSuccessPct)} |`,
    `| Hit-rate | ${pct(baseline.hitRate)} | ${pct(hybrid.hitRate)} |`,
    `| Precision@${K} | ${pct(baseline.precisionAtK)} | ${pct(hybrid.precisionAtK)} |`,
    `| Faithfulness | ${pct(baseline.faithfulness)} | ${pct(hybrid.faithfulness)} |`,
    `| Answer-relevance | ${pct(baseline.answerRelevance)} | ${pct(hybrid.answerRelevance)} |`,
    `| Noise hit-rate | ${pct(baseline.noiseHitRate)} | ${pct(hybrid.noiseHitRate)} |`,
    '',
    '## Notes',
    '',
    '- Baseline was produced with `mode=cosine` only (pre-hybrid retriever behaviour).',
    '- Hybrid uses Postgres FTS ∪ cosine RRF then weighted re-ranker (0.45 cosine + 0.35 ts_rank + 0.20 title overlap).',
    '- Faithfulness / answer-relevance use grounded catalog stubs over retrieved titles (not a live LLM chat loop).',
    hybrid.ftsAvailable
      ? '- FTS RPC `match_products_fts` responded successfully.'
      : '- FTS RPC missing or errored → hybrid fell back toward cosine for lexical ranks. **NOT VERIFIED (pending apply)** of `*_product_fts_hybrid.sql`.',
    '',
  ];
  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
}

async function main() {
  loadEnvLocal();
  const args = new Set(process.argv.slice(2));
  const doBaseline = args.has('--baseline');
  const doCompare = args.has('--compare');
  const force = args.has('--force');

  if (!doBaseline && !doCompare) {
    console.error('Usage: npx tsx scripts/eval/run-hybrid-eval.ts --baseline|--compare [--force]');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const scenarios = JSON.parse(readFileSync(SCENARIOS_PATH, 'utf8')) as Scenario[];
  const supabase = createClient<Database>(url, key);
  mkdirSync(dirname(BASELINE_PATH), { recursive: true });

  if (doBaseline) {
    if (existsSync(BASELINE_PATH) && !force) {
      console.error(`Refusing to overwrite ${BASELINE_PATH} (pass --force to replace)`);
      process.exit(1);
    }
    console.log('Measuring cosine baseline...');
    const baseline = await evaluateMode('cosine', scenarios, supabase, false);
    writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2), 'utf8');
    console.log(`Wrote ${BASELINE_PATH}`);
    console.log(
      `task-success=${pct(baseline.taskSuccessPct)} hit-rate=${pct(baseline.hitRate)} P@${K}=${pct(baseline.precisionAtK)}`
    );
  }

  if (doCompare) {
    if (!existsSync(BASELINE_PATH)) {
      console.error(`Missing ${BASELINE_PATH}. Run --baseline first.`);
      process.exit(1);
    }
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as MetricBundle;
    if (baseline.mode !== 'cosine') {
      console.error('baseline-a2.json mode must be cosine');
      process.exit(1);
    }
    const ftsAvailable = await probeFts(supabase);
    console.log(`FTS available: ${ftsAvailable}`);
    console.log('Measuring hybrid + re-rank...');
    const hybrid = await evaluateMode('hybrid', scenarios, supabase, ftsAvailable);
    writeReport(baseline, hybrid);
    console.log(`Wrote ${REPORT_PATH}`);
    console.log(
      `baseline hit=${pct(baseline.hitRate)} | hybrid hit=${pct(hybrid.hitRate)} | hybrid task-success=${pct(hybrid.taskSuccessPct)}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
