export const FRAME_COUNT = 240;
export const SCROLL_VH = 2800;
export const FEATURE_COUNT = 6;

export const RANGES = {
  lights: [0, 0.2],
  drive: [0.2, 0.4],
  humanoid: [0.4, 0.7],
  features: [0.7, 0.82],
  catch: [0.82, 0.91],
  zip: [0.91, 0.985],
  dive: [0.985, 1],
} as const;

export const FRAME_FOLDERS = [
  'scene-1-starting-black-screen',
  'starting-video-truck-moving-from-front-to-back',
  'humanoid-waving-hi-closing-doors-in-hurry',
] as const;

export type FrameSeq = 0 | 1 | 2;

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function range(p: number, span: readonly [number, number]): number {
  return clamp01((p - span[0]) / (span[1] - span[0]));
}

export function smooth(p: number, span: readonly [number, number]): number {
  const x = range(p, span);
  return x * x * (3 - 2 * x);
}

/** Last hero frame rides up, and the product section comes in from below. */
export const HANDOFF = [0.66, 0.74] as const;

export function sectionShift(p: number): number {
  return smooth(p, HANDOFF);
}

export function featureIndex(p: number): number {
  const t = range(p, [HANDOFF[1], RANGES.zip[0]]);
  return Math.min(FEATURE_COUNT - 1, Math.floor(t * FEATURE_COUNT));
}

export function featureOpacity(p: number): number {
  if (p < HANDOFF[0]) return 0;
  const exit = 1 - smooth(p, [RANGES.zip[0] - 0.02, RANGES.zip[0] + 0.012]);
  return exit;
}

/** The hero stays visible while it scrolls up, then leaves with the handoff. */
export function frameOpacity(p: number): number {
  return p <= HANDOFF[1] ? 1 : 0;
}

export function catchOpacity(p: number): number {
  const enter = smooth(p, [RANGES.catch[0], RANGES.catch[0] + 0.025]);
  const exit = 1 - smooth(p, [RANGES.catch[1] - 0.02, RANGES.zip[0] + 0.03]);
  return enter * exit;
}

export function zipOpen(p: number): number {
  return smooth(p, RANGES.zip);
}

export type HeroFrame = { seq: FrameSeq; index: number };

export function heroFrame(p: number): HeroFrame | null {
  if (p <= RANGES.lights[1]) {
    return { seq: 0, index: Math.round(range(p, RANGES.lights) * (FRAME_COUNT - 1)) };
  }
  if (p <= RANGES.drive[1]) {
    return { seq: 1, index: Math.round(range(p, RANGES.drive) * (FRAME_COUNT - 1)) };
  }
  if (p <= HANDOFF[0]) {
    return { seq: 2, index: Math.round(range(p, [RANGES.humanoid[0], HANDOFF[0]]) * (FRAME_COUNT - 1)) };
  }
  return null;
}

export type FilmPhase = 'loading' | 'lights' | 'drive' | 'humanoid' | 'features' | 'catch' | 'zip' | 'dive';

export function scrollPhase(p: number): FilmPhase {
  if (p >= RANGES.dive[0]) return 'dive';
  if (p >= RANGES.zip[0]) return 'zip';
  if (p >= HANDOFF[0]) return 'features';
  if (p >= RANGES.humanoid[0]) return 'humanoid';
  if (p >= RANGES.drive[0]) return 'drive';
  return 'lights';
}

export function frameSrc(seq: FrameSeq, index: number): string {
  const n = String(index + 1).padStart(3, '0');
  return `/assets/landing/${FRAME_FOLDERS[seq]}/ezgif-frame-${n}.jpg`;
}
