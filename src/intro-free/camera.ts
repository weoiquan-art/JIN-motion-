import { easeInOut, noise1, whip } from "./anim.ts";
import { HEIGHT, WIDTH } from "./beat.ts";

export type Pose = { x: number; y: number; z: number; r: number };
export type Shake = { sx: number; sy: number; sr: number };
// A camera move starts on frame f. "whip" lands on the beat (see anim.whip);
// a number glides there with an ease-in-out over that many frames.
export type Move = { f: number; to: Partial<Pose>; ease?: "whip" | number; bounce?: number; dur?: number };

export const NO_SHAKE: Shake = { sx: 0, sy: 0, sr: 0 };

// Moves are additive (each contributes target − previous target), so they can
// overlap and overshoot naturally. Zoom is interpolated in log space.
export const camAt = (s: number, start: Pose, moves: Move[]): Pose => {
  const prev = { x: start.x, y: start.y, z: Math.log(start.z), r: start.r };
  const cur = { ...prev };
  for (const m of moves) {
    const t = s - m.f;
    const ease = m.ease ?? "whip";
    const p = ease === "whip" ? whip(t, m.bounce ?? 1, m.dur ?? 8) : easeInOut(t / ease);
    for (const k of ["x", "y", "z", "r"] as const) {
      const v = m.to[k];
      if (v === undefined) continue;
      const target = k === "z" ? Math.log(v) : v;
      cur[k] += (target - prev[k]) * p;
      prev[k] = target;
    }
  }
  return { x: cur.x, y: cur.y, z: Math.exp(cur.z), r: cur.r };
};

// Decaying hand-held shake from impacts that start on their beat.
export const shakeAt = (s: number, hits: { f: number; amp: number }[], seed = 0): Shake => {
  let a = 0;
  for (const h of hits) {
    const t = s - h.f;
    if (t >= -0.25 && t < 36) a += h.amp * Math.exp(-Math.max(0, t) / 4.5);
  }
  return {
    sx: a * 34 * noise1(s * 0.9, 1 + seed),
    sy: a * 26 * noise1(s * 0.9, 2 + seed),
    sr: a * 1.3 * noise1(s * 0.7, 3 + seed),
  };
};

export const camTransform = (c: Pose, sh: Shake = NO_SHAKE) =>
  `translate(${WIDTH / 2 + sh.sx}px, ${HEIGHT / 2 + sh.sy}px) rotate(${c.r + sh.sr}deg) scale(${c.z}) translate(${-c.x}px, ${-c.y}px)`;
