import { clamp, easeInOut, noise1, springAt } from "./math";
import {
  CAM_MOVES,
  CAM_START,
  CARDS,
  cardLand,
  type Ease,
  FAILS,
  HEIGHT,
  logoEmerge,
  LOGOS,
  T,
  WIDTH,
  WORDS,
} from "./timeline";

export type Cam = {
  x: number;
  y: number;
  z: number;
  r: number;
  sx: number;
  sy: number;
  sr: number;
};

const progress = (ease: Ease, t: number) => {
  if (t <= 0) return 0;
  if (ease.kind === "ease") return easeInOut(t / ease.dur);
  if (ease.kind === "linear") return clamp(t / ease.dur);
  return springAt(t, ease.k, ease.d, ease.m);
};

// Each move contributes (target - previous target) * progress, so moves can
// overlap and springs overshoot naturally. Zoom is interpolated in log space.
const DELTAS = (() => {
  const prev = { x: CAM_START.x, y: CAM_START.y, z: Math.log(CAM_START.z), r: CAM_START.r };
  return CAM_MOVES.map((m) => {
    const d = { x: 0, y: 0, z: 0, r: 0 };
    if (m.x !== undefined) {
      d.x = m.x - prev.x;
      prev.x = m.x;
    }
    if (m.y !== undefined) {
      d.y = m.y - prev.y;
      prev.y = m.y;
    }
    if (m.z !== undefined) {
      d.z = Math.log(m.z) - prev.z;
      prev.z = Math.log(m.z);
    }
    if (m.r !== undefined) {
      d.r = m.r - prev.r;
      prev.r = m.r;
    }
    return d;
  });
})();

// Shake impulses land when the camera arrives, not when it leaves.
const IMPACTS: { f: number; s: number }[] = [
  ...CAM_MOVES.filter((m) => m.hit).map((m) => ({
    f: m.f + (m.f === T.slam ? 3 : 5),
    s: m.f === T.brake ? 0.5 : (m.hit as number),
  })),
  ...LOGOS.map((_, i) => ({ f: logoEmerge(i), s: 0.45 })),
  ...WORDS.map((w) => ({ f: w.slam + 1, s: 0.55 })),
  ...CARDS.map((c) => ({ f: cardLand(c), s: 0.12 })),
  ...FAILS.map((x) => ({ f: x.f, s: 0.2 })),
];

export const shakeAt = (f: number) => {
  let a = 0;
  for (const imp of IMPACTS) {
    const t = f - imp.f;
    if (t >= 0 && t < 40) a += imp.s * Math.exp(-t / 5);
  }
  a = Math.min(a, 1.4);
  return {
    sx: a * 38 * noise1(f * 0.9, 1),
    sy: a * 30 * noise1(f * 0.9, 2),
    sr: a * 1.6 * noise1(f * 0.7, 3),
  };
};

export const camera = (f: number): Cam => {
  let x = CAM_START.x;
  let y = CAM_START.y;
  let lz = Math.log(CAM_START.z);
  let r = CAM_START.r;
  CAM_MOVES.forEach((m, i) => {
    const p = progress(m.ease, f - m.f);
    if (p === 0) return;
    x += DELTAS[i].x * p;
    y += DELTAS[i].y * p;
    lz += DELTAS[i].z * p;
    r += DELTAS[i].r * p;
  });
  return { x, y, z: Math.exp(lz), r, ...shakeAt(f) };
};

export const cameraTransform = (c: Cam) =>
  `translate(${WIDTH / 2 + c.sx}px, ${HEIGHT / 2 + c.sy}px) rotate(${c.r + c.sr}deg) scale(${c.z}) translate(${-c.x}px, ${-c.y}px)`;
