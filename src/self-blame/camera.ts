import { easeInOut, noise1, whip } from "./anim.ts";
import { HEIGHT, WIDTH } from "./beat.ts";
import { CAM_START, CAMERA, type CamMove } from "./timeline.ts";

export type Pose = { x: number; y: number; z: number };

// Moves are additive (each contributes target − previous target), so they can
// overlap. Zoom is interpolated in log space (docs/remotion/动效.md §3).
export const camAt = (s: number, start: Pose = CAM_START, moves: CamMove[] = CAMERA): Pose => {
  const prev = { x: start.x, y: start.y, z: Math.log(start.z) };
  const cur = { ...prev };
  for (const m of moves) {
    const t = s - m.f;
    const ease = m.ease ?? "whip";
    const p = ease === "whip" ? whip(t, m.bounce ?? 0, m.dur ?? 24) : easeInOut(t / ease);
    for (const k of ["x", "y", "z"] as const) {
      const v = m.to[k];
      if (v === undefined) continue;
      const target = k === "z" ? Math.log(v) : v;
      cur[k] += (target - prev[k]) * p;
      prev[k] = target;
    }
  }
  return { x: cur.x, y: cur.y, z: Math.exp(cur.z) };
};

// Small decaying shake from impacts that start on their beat.
export const shakeAt = (s: number, hits: { f: number; amp: number }[]) => {
  let a = 0;
  for (const h of hits) {
    const t = s - h.f;
    if (t >= -0.25 && t < 30) a += h.amp * Math.exp(-Math.max(0, t) / 4.5);
  }
  return { sx: a * 30 * noise1(s * 0.9, 1), sy: a * 22 * noise1(s * 0.9, 2) };
};

export const camTransform = (c: Pose, sh = { sx: 0, sy: 0 }) =>
  `translate(${WIDTH / 2 + sh.sx}px, ${HEIGHT / 2 + sh.sy}px) scale(${c.z}) translate(${-c.x}px, ${-c.y}px)`;
