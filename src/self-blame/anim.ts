// Curves and deterministic randomness. Everything here is a pure function of
// (possibly fractional) frame numbers: motion blur renders sub-frames.

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

// The house "hit" curve (docs/remotion/动画.md §2): t = frames since the beat.
// Starts 0.75 frame early so the beat frame carries the biggest jump while the
// frame before stays untouched, then eases out over `dur` frames
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
export const pop = (t: number, dur = 4) => clamp(whip(t, 0, dur) * 1.15);
// Gentle fade that also starts on its beat (no pre-roll), for things that leave.
export const fadeOut = (t: number, dur = 6) => 1 - clamp((t + 0.75) / dur);

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

// Colours as [r, g, b] mixes.
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number) => {
  const x = hex(a);
  const y = hex(b);
  const k = clamp(t);
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], k))).join(",")})`;
};
export const rgba = (h: string, a: number) => `rgba(${hex(h).join(",")},${clamp(a)})`;
