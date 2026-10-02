import type { Cam } from "../intro/camera";
import { BUILT, docRows, focusAt } from "./doc.ts";
import {
  CONTENT_X,
  DOC,
  DURATION,
  FOLLOW_Z,
  FPS,
  GLITCH_CARDS,
  HEIGHT,
  type Key,
  KEYS_INTRO,
  KEYS_LOOK,
  KEYS_SUCCESS,
  LOGO_BURST,
  LOOP3_R,
  LOOP3_Z,
  S,
  SLAMS,
  STOP_CAM,
  WIDTH,
} from "./timeline.ts";

type Pose = { x: number; y: number; z: number; r: number };

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

const keyAt = (keys: Key[], f: number): Pose => {
  if (f <= keys[0].f) return { x: keys[0].x, y: keys[0].y, z: keys[0].z, r: keys[0].r ?? 0 };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (f <= b.f) {
      const t = smooth((f - a.f) / (b.f - a.f));
      const lz = Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: Math.exp(lz),
        r: (a.r ?? 0) + ((b.r ?? 0) - (a.r ?? 0)) * t,
      };
    }
  }
  const k = keys[keys.length - 1];
  return { x: k.x, y: k.y, z: k.z, r: k.r ?? 0 };
};

// Where the camera wants to be while following the template cursor.
const followTarget = (f: number): Pose => {
  const c = focusAt(f);
  if (!c) {
    // before the first keystroke: settle on the empty 【镜1】 line
    const row = docRows(f).find((r) => r.id === "shot1") as ReturnType<typeof docRows>[number];
    return { x: DOC.cx + 0.3 * (CONTENT_X - DOC.cx), y: row.y + DOC.rowPad + DOC.lineH / 2, z: FOLLOW_Z.loop1, r: 0 };
  }
  const bias = f < S.loop2 ? 0.3 : 0.15;
  const x = DOC.cx + bias * (c.x - DOC.cx);
  if (f < S.loop2) return { x, y: c.y, z: FOLLOW_Z.loop1, r: 0 };
  // loops 2–3: keep the header (version number) inside the frame
  const keepHeader = (z: number) => Math.min(c.y, DOC.top + HEIGHT / 2 / z - 28);
  if (f < S.loop3) return { x, y: keepHeader(FOLLOW_Z.loop2), z: FOLLOW_Z.loop2, r: 0 };
  const i = c.n;
  const z = LOOP3_Z[i % LOOP3_Z.length];
  return { x, y: keepHeader(z), z, r: LOOP3_R[i % LOOP3_R.length] };
};

// spring stiffness / damping per loop: gentle → medium → whip with overshoot
const springFor = (f: number) => {
  if (f < S.loop2) return { k: 70, d: 16 };
  if (f < S.loop3) return { k: 150, d: 18 };
  return { k: 380, d: 18 };
};

// Precompute one pose per frame.
const TRACK: Pose[] = (() => {
  const out: Pose[] = [];
  const FOLLOW_FROM = KEYS_INTRO[KEYS_INTRO.length - 1].f;
  const p = keyAt(KEYS_INTRO, FOLLOW_FROM);
  const s = { x: p.x, y: p.y, z: Math.log(p.z), r: p.r };
  const v = { x: 0, y: 0, z: 0, r: 0 };
  for (let f = 0; f <= DURATION; f++) {
    if (f <= FOLLOW_FROM) {
      out.push(keyAt(KEYS_INTRO, f));
      continue;
    }
    if (f < S.stop) {
      const tgt = followTarget(f);
      const t = { x: tgt.x, y: tgt.y, z: Math.log(tgt.z), r: tgt.r };
      const { k, d } = springFor(f);
      const steps = 4;
      const dt = 1 / FPS / steps;
      for (let n = 0; n < steps; n++) {
        for (const ch of ["x", "y", "z", "r"] as const) {
          const a = -k * (s[ch] - t[ch]) - d * v[ch];
          v[ch] += a * dt;
          s[ch] += v[ch] * dt;
        }
      }
      out.push({ x: s.x, y: s.y, z: Math.exp(s.z), r: s.r });
      continue;
    }
    if (f < S.success) {
      out.push({ ...STOP_CAM, r: 0 }); // hard cut, dead still
      continue;
    }
    if (f < S.look) {
      out.push(keyAt([{ f: S.success, ...STOP_CAM }, ...KEYS_SUCCESS.slice(1)], f));
      continue;
    }
    out.push(keyAt(KEYS_LOOK, f));
  }
  return out;
})();

// Shake only where it means something; strongest at the peak.
const IMPACTS: { f: number; s: number }[] = [
  ...[0, 1, 2, 3].map((i) => ({ f: LOGO_BURST + i * 3, s: 0.22 })),
  ...GLITCH_CARDS.map((g) => ({ f: g.mark, s: g.mark < S.loop3 ? 0.16 : 0.3 })),
  ...SLAMS.map((x) => ({ f: x.f + 1, s: 1.0 })),
  ...BUILT.filter((b) => b.start >= S.loop3 && b.start < S.stop).map((b) => ({ f: b.start + 2, s: 0.08 })),
];

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const noise = (x: number, seed: number) => {
  const i = Math.floor(x);
  const t = x - i;
  const u = t * t * (3 - 2 * t);
  return (hash(i + seed * 57.31) * (1 - u) + hash(i + 1 + seed * 57.31) * u) * 2 - 1;
};

const shakeAt = (f: number) => {
  if (f >= S.stop) return { sx: 0, sy: 0, sr: 0 };
  let a = 0;
  for (const imp of IMPACTS) {
    const t = f - imp.f;
    if (t >= 0 && t < 30) a += imp.s * Math.exp(-t / 4.5);
  }
  a = Math.min(a, 1.3);
  return { sx: a * 34 * noise(f * 0.9, 1), sy: a * 26 * noise(f * 0.9, 2), sr: a * 1.4 * noise(f * 0.7, 3) };
};

export const basePose = (f: number): Pose => {
  const c = Math.min(DURATION, Math.max(0, f));
  const i = Math.floor(c);
  const a = TRACK[i];
  const b = TRACK[Math.min(DURATION, i + 1)];
  const t = c - i;
  // never interpolate across the hard cuts
  if (i + 1 === S.stop || i + 1 === S.success) return a;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t),
    r: a.r + (b.r - a.r) * t,
  };
};

export const cameraV2 = (f: number): Cam => ({ ...basePose(f), ...shakeAt(f) });

export const transformOf = (c: Cam) =>
  `translate(${WIDTH / 2 + c.sx}px, ${HEIGHT / 2 + c.sy}px) rotate(${c.r + c.sr}deg) scale(${c.z}) translate(${-c.x}px, ${-c.y}px)`;

// Inverse of the camera (without shake): screen px → world point.
export const screenToWorld = (f: number, sx: number, sy: number) => {
  const c = basePose(f);
  const dx = (sx - WIDTH / 2) / c.z;
  const dy = (sy - HEIGHT / 2) / c.z;
  const a = (-c.r * Math.PI) / 180;
  return { x: c.x + dx * Math.cos(a) - dy * Math.sin(a), y: c.y + dx * Math.sin(a) + dy * Math.cos(a), z: c.z, r: c.r };
};
