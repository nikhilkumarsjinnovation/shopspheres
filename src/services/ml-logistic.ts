/**
 * Pure-TypeScript logistic regression + classification metrics.
 * No external ML dependencies.
 */

export type BinaryMetrics = {
  precision: number;
  recall: number;
  f1: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
};

export type Normalizer = {
  mean: number[];
  std: number[];
};

export type LogisticModel = {
  weights: number[];
  bias: number;
  normalizer: Normalizer;
  threshold: number;
};

export type TrainOptions = {
  epochs?: number;
  learningRate?: number;
  l2?: number;
  seed?: number;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function sigmoid(z: number): number {
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

export function fitNormalizer(X: number[][]): Normalizer {
  if (X.length === 0) {
    return { mean: [], std: [] };
  }
  const dims = X[0].length;
  const mean = Array.from({ length: dims }, () => 0);
  const std = Array.from({ length: dims }, () => 1);
  for (const row of X) {
    for (let i = 0; i < dims; i += 1) mean[i] += row[i];
  }
  for (let i = 0; i < dims; i += 1) mean[i] /= X.length;
  for (const row of X) {
    for (let i = 0; i < dims; i += 1) {
      const d = row[i] - mean[i];
      std[i] += d * d;
    }
  }
  for (let i = 0; i < dims; i += 1) {
    std[i] = Math.sqrt(std[i] / X.length);
    if (std[i] < 1e-8) std[i] = 1;
  }
  return { mean, std };
}

export function normalizeRow(row: number[], normalizer: Normalizer): number[] {
  return row.map((value, i) => (value - (normalizer.mean[i] ?? 0)) / (normalizer.std[i] ?? 1));
}

export function predictProba(model: LogisticModel, row: number[]): number {
  const x = normalizeRow(row, model.normalizer);
  let z = model.bias;
  for (let i = 0; i < model.weights.length; i += 1) {
    z += model.weights[i] * (x[i] ?? 0);
  }
  return sigmoid(z);
}

export function predictBinary(model: LogisticModel, row: number[], threshold = model.threshold): 0 | 1 {
  return predictProba(model, row) >= threshold ? 1 : 0;
}

export function confusion(
  yTrue: Array<0 | 1>,
  yPred: Array<0 | 1>,
): BinaryMetrics {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (let i = 0; i < yTrue.length; i += 1) {
    const t = yTrue[i];
    const p = yPred[i];
    if (t === 1 && p === 1) tp += 1;
    else if (t === 0 && p === 1) fp += 1;
    else if (t === 0 && p === 0) tn += 1;
    else fn += 1;
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return {
    precision: clamp01(precision),
    recall: clamp01(recall),
    f1: clamp01(f1),
    tp,
    fp,
    tn,
    fn,
  };
}

export function tuneThreshold(
  model: Omit<LogisticModel, 'threshold'>,
  X: number[][],
  y: Array<0 | 1>,
): { threshold: number; metrics: BinaryMetrics } {
  let bestThreshold = 0.5;
  let best = confusion(
    y,
    X.map((row) => (predictProba({ ...model, threshold: 0.5 }, row) >= 0.5 ? 1 : 0)),
  );
  for (let t = 0.05; t <= 0.95; t += 0.05) {
    const pred = X.map((row) => (predictProba({ ...model, threshold: t }, row) >= t ? 1 : 0));
    const metrics = confusion(y, pred);
    if (metrics.f1 > best.f1 || (metrics.f1 === best.f1 && Math.abs(t - 0.5) < Math.abs(bestThreshold - 0.5))) {
      best = metrics;
      bestThreshold = t;
    }
  }
  return { threshold: Number(bestThreshold.toFixed(2)), metrics: best };
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function fitLogistic(
  X: number[][],
  y: Array<0 | 1>,
  options: TrainOptions = {},
): Omit<LogisticModel, 'threshold'> {
  const epochs = options.epochs ?? 400;
  const learningRate = options.learningRate ?? 0.35;
  const l2 = options.l2 ?? 0.01;
  const rng = mulberry32(options.seed ?? 42);

  if (X.length === 0) {
    return { weights: [], bias: 0, normalizer: { mean: [], std: [] } };
  }

  const normalizer = fitNormalizer(X);
  const Xn = X.map((row) => normalizeRow(row, normalizer));
  const dims = Xn[0].length;
  const weights = Array.from({ length: dims }, () => (rng() - 0.5) * 0.01);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const gradW = Array.from({ length: dims }, () => 0);
    let gradB = 0;
    for (let i = 0; i < Xn.length; i += 1) {
      const row = Xn[i];
      let z = bias;
      for (let d = 0; d < dims; d += 1) z += weights[d] * row[d];
      const p = sigmoid(z);
      const err = p - y[i];
      for (let d = 0; d < dims; d += 1) gradW[d] += err * row[d];
      gradB += err;
    }
    const n = Xn.length;
    for (let d = 0; d < dims; d += 1) {
      weights[d] -= learningRate * ((gradW[d] / n) + l2 * weights[d]);
    }
    bias -= learningRate * (gradB / n);
  }

  return { weights, bias, normalizer };
}

export function trainLogisticClassifier(
  X: number[][],
  y: Array<0 | 1>,
  options: TrainOptions = {},
): { model: LogisticModel; trainMetrics: BinaryMetrics } {
  const base = fitLogistic(X, y, options);
  const tuned = tuneThreshold(base, X, y);
  const model: LogisticModel = { ...base, threshold: tuned.threshold };
  return { model, trainMetrics: tuned.metrics };
}

export function splitTrainTest<T>(
  rows: T[],
  testRatio = 0.3,
  seed = 7,
): { train: T[]; test: T[] } {
  const rng = mulberry32(seed);
  const indexed = rows.map((row, index) => ({ row, index, r: rng() }));
  indexed.sort((a, b) => a.r - b.r);
  const cut = Math.max(1, Math.floor(indexed.length * (1 - testRatio)));
  const train = indexed.slice(0, cut).map((x) => x.row);
  const test = indexed.slice(cut).map((x) => x.row);
  if (test.length === 0 && train.length > 1) {
    return { train: train.slice(0, -1), test: train.slice(-1) };
  }
  return { train, test };
}
