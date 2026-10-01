import { FRAME_COUNT, FRAME_FOLDERS, frameSrc, heroFrame, type FrameSeq, type HeroFrame } from './beats';

const GATE_FRAMES = 48;
const BEHIND = 6;
const AHEAD = 42;

type Slot = { img: HTMLImageElement; ready: boolean };

export type FrameApi = {
  setScroll: (progress: number) => void;
  resize: () => void;
  dispose: () => void;
  /** True after the last humanoid frame has stayed on screen long enough to read the door. */
  doorSettled: () => boolean;
};

function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
}

export function mountFrameScrub(
  canvas: HTMLCanvasElement,
  onGateProgress: (ratio: number) => void,
): FrameApi {
  const ctx = canvas.getContext('2d', { alpha: false });
  const windows: Array<Map<number, Slot>> = FRAME_FOLDERS.map(() => new Map());
  let disposed = false;
  let current: HeroFrame = { seq: 0, index: 0 };
  let gateLoaded = 0;
  let doorShownAt = 0;

  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.floor(width * ratio));
    canvas.height = Math.max(1, Math.floor(height * ratio));
    paint();
  };

  const nearestReady = (seq: FrameSeq, index: number): HTMLImageElement | null => {
    const map = windows[seq];
    const exact = map.get(index);
    if (exact?.ready) return exact.img;
    for (let step = 1; step <= 8; step += 1) {
      const prev = map.get(index - step);
      if (prev?.ready) return prev.img;
      const next = map.get(index + step);
      if (next?.ready) return next.img;
    }
    return null;
  };

  const paint = () => {
    if (!ctx || disposed) return;
    const exact = windows[current.seq].get(current.index);
    const img = exact?.ready ? exact.img : nearestReady(current.seq, current.index);
    if (!img) return;
    drawContain(ctx, img, canvas.width, canvas.height);
    if (current.seq === 2 && current.index >= FRAME_COUNT - 1 && exact?.ready && doorShownAt === 0) {
      doorShownAt = performance.now();
    }
  };

  const hold = (seq: FrameSeq, index: number) => {
    if (disposed) return;
    const map = windows[seq];
    const keep = new Set<number>();
    for (let i = index - BEHIND; i <= index + AHEAD; i += 1) {
      if (i >= 0 && i < FRAME_COUNT) keep.add(i);
    }
    if (seq === 2 && index >= 150) {
      for (let i = 210; i < FRAME_COUNT; i += 1) keep.add(i);
    }
    for (const key of map.keys()) {
      if (!keep.has(key)) map.delete(key);
    }
    for (const i of keep) {
      if (map.has(i)) continue;
      const img = new Image();
      const slot: Slot = { img, ready: false };
      img.decoding = 'async';
      img.onload = () => {
        slot.ready = true;
        if (current.seq === seq) paint();
      };
      img.src = frameSrc(seq, i);
      map.set(i, slot);
    }
  };

  for (let i = 0; i < GATE_FRAMES; i += 1) {
    const img = new Image();
    const slot: Slot = { img, ready: false };
    img.onload = () => {
      slot.ready = true;
      gateLoaded += 1;
      onGateProgress(Math.min(1, gateLoaded / GATE_FRAMES));
      if (i === 0) paint();
    };
    img.onerror = () => {
      gateLoaded += 1;
      onGateProgress(Math.min(1, gateLoaded / GATE_FRAMES));
    };
    img.src = frameSrc(0, i);
    windows[0].set(i, slot);
  }

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);
  resize();

  return {
    setScroll: (progress) => {
      const hero = heroFrame(progress) ?? current;
      current = hero;
      hold(hero.seq, hero.index);
      if (hero.seq < FRAME_FOLDERS.length - 1 && hero.index > FRAME_COUNT - 50) {
        hold((hero.seq + 1) as FrameSeq, 0);
      }
      paint();
    },
    resize,
    doorSettled: () => doorShownAt > 0 && performance.now() - doorShownAt > 900,
    dispose: () => {
      disposed = true;
      resizeObserver.disconnect();
      windows.forEach((map) => map.clear());
    },
  };
}
