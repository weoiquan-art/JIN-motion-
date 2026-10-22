import { FPS } from "./beat.ts";

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// 0→1 as v goes a→b, clamped.
export const inv = (a: number, b: number, v: number) => clamp((v - a) / (b - a));

export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t: number) => Math.pow(clamp(t), 3);
export const easeInOut = (t: number) => {
  const x = clamp(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

// Analytic damped spring 0→1 (exact at fractional frames).
export const springAt = (frames: number, k: number, d: number) => {
  if (frames <= 0) return 0;
  const t = frames / FPS;
  const w0 = Math.sqrt(k);
  const zeta = d / (2 * w0);
  if (zeta >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
};

// The house "hit" curve for everything that lands on a beat (t = frames since
// the beat). It starts 0.75 frame early, so the beat frame — rendered with a
// centred shutter — already carries the biggest jump of the move (the frame
// before stays untouched), then eases out over `dur` frames with an overshoot
// (easeOutBack; bounce 0 = none, 0.5 ≈ 3 %, 1 ≈ 10 %).
export const whip = (t: number, bounce = 1, dur = 8) => {
  const u = (t + 0.75) / dur;
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const c1 = 1.70158 * bounce;
  const c3 = c1 + 1;
  return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2;
};

// Fast appear (opacity / scale) on a beat: 0 before the beat, mostly there on it.
export const pop = (t: number) => clamp(whip(t, 0, 4) * 1.15);

// Deterministic hash in [0, 1) and smooth 1D noise in [−1, 1].
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.31), hash(i + 1 + seed * 57.31), u) * 2 - 1;
};

// Approximate advance widths (em) for laying out mixed Chinese / Latin lines
// without measuring the DOM. Full-width characters are exactly 1em in Noto Sans SC.
const LATIN: Record<string, number> = {
  A: 0.72, B: 0.68, C: 0.7, D: 0.74, E: 0.62, F: 0.6, G: 0.74, H: 0.76, I: 0.32, J: 0.56, K: 0.7,
  L: 0.58, M: 0.9, N: 0.76, O: 0.76, P: 0.66, Q: 0.76, R: 0.68, S: 0.64, T: 0.64, U: 0.74, V: 0.7,
  W: 1, X: 0.7, Y: 0.68, Z: 0.64, i: 0.28, l: 0.28, j: 0.28, m: 0.86, w: 0.8, " ": 0.26,
};
export const isWide = (ch: string) => (ch.codePointAt(0) as number) >= 0x2e80;
export const charWidth = (ch: string) => {
  if (isWide(ch)) return 1;
  if (ch in LATIN) return LATIN[ch];
  if (/[a-z]/.test(ch)) return 0.56;
  if (/[0-9]/.test(ch)) return 0.62;
  return 0.32;
};
export const textWidth = (text: string, fontSize: number) =>
  [...text].reduce((w, ch) => w + charWidth(ch) * fontSize, 0);
