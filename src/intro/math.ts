import { FPS } from "./timeline";

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

// Analytic damped spring from 0 to 1 (overshoots when underdamped).
// Closed form, so it is exact at fractional frames (motion-blur samples).
export const springAt = (frames: number, k: number, d: number, m = 1) => {
  if (frames <= 0) return 0;
  const t = frames / FPS;
  const w0 = Math.sqrt(k / m);
  const zeta = d / (2 * Math.sqrt(k * m));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return (
      1 -
      Math.exp(-zeta * w0 * t) *
        (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
    );
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const s = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - s);
  const r2 = -w0 * (zeta + s);
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
};

// Deterministic hash in [0, 1).
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Smooth 1D value noise in [-1, 1].
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.31), hash(i + 1 + seed * 57.31), u) * 2 - 1;
};
