export const FRAME_COUNT = 240;
export const HERO_SCROLL_VH = 1200;
export const SCROLL_VH = 1200;
export const FEATURE_COUNT = 6;

export const RANGES = {
  lights: [0, 0.25],
  drive: [0.25, 0.55],
  humanoid: [0.55, 0.85],
  features: [0.7, 0.82],
  catch: [0.82, 0.91],
  zip: [0.91, 0.985],
  dive: [0.985, 1],
  reveal: [0.85, 1.0],
} as const;

export const HANDOFF = [0.66, 0.74] as const;

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

export type HeroFrame = { seq: FrameSeq; index: number };

export function heroFrame(p: number): HeroFrame | null {
  if (p <= RANGES.lights[1]) {
    return { seq: 0, index: Math.round(range(p, RANGES.lights) * (FRAME_COUNT - 1)) };
  }
  if (p <= RANGES.drive[1]) {
    return { seq: 1, index: Math.round(range(p, RANGES.drive) * (FRAME_COUNT - 1)) };
  }
  if (p <= RANGES.humanoid[1]) {
    return { seq: 2, index: Math.round(range(p, RANGES.humanoid) * (FRAME_COUNT - 1)) };
  }
  return { seq: 2, index: FRAME_COUNT - 1 };
}

export type FilmPhase = 'loading' | 'lights' | 'drive' | 'humanoid' | 'features' | 'catch' | 'zip' | 'dive' | 'reveal';

export function scrollPhase(p: number): FilmPhase {
  if (p >= RANGES.reveal[0]) return 'reveal';
  if (p >= RANGES.humanoid[0]) return 'humanoid';
  if (p >= RANGES.drive[0]) return 'drive';
  return 'lights';
}

export function frameSrc(seq: FrameSeq, index: number): string {
  const n = String(index + 1).padStart(3, '0');
  return `/assets/landing/${FRAME_FOLDERS[seq]}/ezgif-frame-${n}.jpg`;
}
