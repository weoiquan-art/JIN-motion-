// Code-drawn shots that stand in for photos: the title sunset (the bridge in
// silhouette, the sun in its main span), the night drive across the deck and
// the 1985 closure of the deck. Each takes the shot's camera move (`mv`) and
// times everything inside from the beat grid (`at`, `b`).

import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp, hash, hitEnv, lerp, noise1, whip } from "./anim";
import { BGM_INFO } from "./beats";
import type { Move } from "./schema";

export type SceneProps = {
  frame: number;
  /** beats since the shot's first beat (fractional) */
  b: number;
  /** film frame of a beat, counted from the shot's first beat */
  at: (beat: number) => number;
  /** shot length in beats */
  beats: number;
  /** eased progress of the camera move, 0..1 */
  e: number;
  /** the camera move at this frame */
  mv: Move;
  fps: number;
  warm: string;
  accent: string;
};

// Parallax: a layer at depth k (0 = at infinity, 1 = the subject) follows
// that much of the camera's pan and zoom.
const layer = (mv: Move, k: number, ox = 960, oy = 540) =>
  `translate(${mv.x * k} ${mv.y * k}) translate(${ox} ${oy}) scale(${1 + (mv.scale - 1) * k}) rotate(${mv.rotate * k}) translate(${-ox} ${-oy})`;

// ---------------------------------------------------------------- sunset
const HORIZON = 690;
const DECK = 636;
const PYLON_X = [1080, 1560];
const TIP = 372;
const SUN: [number, number, number] = [1320, 514, 104];
const INK = "#1b0e17";
// soft clouds: x, y, width, height, opacity (the low ones cross the sun)
const CLOUDS: [number, number, number, number, number][] = [
  [1250, 478, 340, 9, 0.85],
  [1405, 500, 260, 6, 0.75],
  [1150, 440, 460, 12, 0.6],
  [700, 330, 820, 22, 0.5],
  [380, 250, 680, 16, 0.45],
  [1650, 380, 560, 14, 0.45],
  [960, 600, 1400, 10, 0.4],
];

// One pylon: a slender shaft with a spire cap, standing on a pier.
const pylonPath = (x: number) => {
  const w0 = 17; // half width at the water
  const w1 = 9; // half width under the cap
  return [
    `M${x - w0} ${HORIZON + 6}`,
    `L${x - w1} ${TIP + 70}`,
    `Q${x - w1 - 4} ${TIP + 46} ${x - 3} ${TIP + 14}`,
    `L${x} ${TIP - 26}`,
    `L${x + 3} ${TIP + 14}`,
    `Q${x + w1 + 4} ${TIP + 46} ${x + w1} ${TIP + 70}`,
    `L${x + w0} ${HORIZON + 6}`,
    "Z",
  ].join(" ");
};

const Bird: React.FC<{ x: number; y: number; s: number; flap: number }> = ({ x, y, s, flap }) => {
  const w = 14 * s;
  const lift = (4 + 6 * flap) * s;
  return (
    <path d={`M${x - w} ${y - lift} Q${x - w / 2} ${y - lift * 0.2} ${x} ${y} Q${x + w / 2} ${y - lift * 0.2} ${x + w} ${y - lift}`} fill="none"
      stroke={INK} strokeWidth={2.2 * s} strokeLinecap="round" />
  );
};

export const SunsetScene: React.FC<SceneProps> = ({ frame, e, mv, warm }) => {
  const sunY = SUN[1] + 16 * e;
  // the sun breathes a little with the light pulses of the FX layer; here only a slow shimmer
  const shimmer = (i: number) => noise1(i * 1.7 + frame / 9, 4);
  const cables: React.ReactNode[] = [];
  for (const px of PYLON_X) {
    for (let k = 0; k < 9; k++) {
      const ay = TIP + 78 + k * 9;
      const reach = 34 + k * 25;
      for (const dir of [-1, 1]) {
        cables.push(<line key={`${px}${k}${dir}`} x1={px + dir * 3} y1={ay} x2={px + dir * reach} y2={DECK} stroke={INK} strokeWidth={1.6} />);
      }
    }
  }
  const piers: React.ReactNode[] = [];
  for (let x = -40; x < 2000; x += 92) {
    if (PYLON_X.some((p) => Math.abs(p - x) < 60)) continue;
    piers.push(<rect key={x} x={x - 6} y={DECK + 8} width={12} height={HORIZON + 4 - DECK - 8} fill={INK} />);
  }
  // cars crossing on the deck: small warm and white points
  const cars: React.ReactNode[] = [];
  for (let i = 0; i < 16; i++) {
    const dir = i % 2 ? 1 : -1;
    const x = ((((hash(i * 7.1) * 2200 + dir * frame * 9) % 2200) + 2200) % 2200) - 140;
    cars.push(<circle key={i} cx={x} cy={DECK - 6} r={2.4} fill={dir > 0 ? "#ffe3b8" : "#ff6a4a"} opacity={0.9} />);
  }
  const lamps: React.ReactNode[] = [];
  for (let x = 20; x < 1920; x += 46) {
    lamps.push(<circle key={x} cx={x} cy={DECK - 15} r={1.8} fill="#ffd9a8" opacity={0.85} />);
  }
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0710" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="pbSky" x1="0" y1="0" x2="0" y2={HORIZON} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1b1131" />
            <stop offset="0.38" stopColor="#4a1d3d" />
            <stop offset="0.66" stopColor="#a63c39" />
            <stop offset="0.88" stopColor="#ec7a3f" />
            <stop offset="1" stopColor="#ffb25c" />
          </linearGradient>
          <radialGradient id="pbSun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fffbe6" />
            <stop offset="0.55" stopColor="#ffe08a" />
            <stop offset="1" stopColor="#ffab4c" />
          </radialGradient>
          <radialGradient id="pbSunGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffd27a" stopOpacity={0.85} />
            <stop offset="0.35" stopColor="#ff9a4a" stopOpacity={0.35} />
            <stop offset="1" stopColor="#ff7040" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="pbCloud" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#3e1730" stopOpacity={1} />
            <stop offset="0.55" stopColor="#3e1730" stopOpacity={0.7} />
            <stop offset="1" stopColor="#3e1730" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="pbCloudLit" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe2b0" stopOpacity={0.6} />
            <stop offset="1" stopColor="#ffe2b0" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="pbSeaGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffb060" stopOpacity={0.22} />
            <stop offset="1" stopColor="#ffb060" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="pbSea" x1="0" y1={HORIZON} x2="0" y2={1080} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7c3330" />
            <stop offset="0.25" stopColor="#3a1824" />
            <stop offset="1" stopColor="#0a0710" />
          </linearGradient>
        </defs>
        {/* sky, far: barely moves */}
        <g transform={layer(mv, 0.25)}>
          <rect x={-200} y={-200} width={2320} height={HORIZON + 200} fill="url(#pbSky)" />
          <circle cx={SUN[0]} cy={sunY} r={SUN[2] * 5.2} fill="url(#pbSunGlow)" />
        </g>
        <g transform={layer(mv, 0.35)}>
          <circle cx={SUN[0]} cy={sunY} r={SUN[2]} fill="url(#pbSun)" />
          {/* soft clouds; the ones crossing the sun are lit from behind */}
          {CLOUDS.map(([x, y, w, h, o], i) => (
            <ellipse key={i} cx={x + 26 * e * (i % 2 ? 1 : -1)} cy={y} rx={w / 2} ry={h * 1.8} fill="url(#pbCloud)" opacity={o} />
          ))}
          <ellipse cx={SUN[0] - 40 + 20 * e} cy={472} rx={150} ry={9} fill="url(#pbCloudLit)" />
        </g>
        {/* the island's hills on the horizon */}
        <g transform={layer(mv, 0.5)}>
          <path d={`M-200 ${HORIZON} L-200 ${HORIZON - 40} Q60 ${HORIZON - 120} 260 ${HORIZON - 70} Q420 ${HORIZON - 30} 560 ${HORIZON - 62}
            Q700 ${HORIZON - 92} 860 ${HORIZON - 34} Q940 ${HORIZON - 12} 1010 ${HORIZON} Z`} fill="#5b2738" opacity={0.75} />
          <rect x={-200} y={HORIZON - 22} width={2320} height={30} fill={warm} opacity={0.18} />
        </g>
        {/* sea and the sun's path on it */}
        <g transform={layer(mv, 1)}>
          <rect x={-200} y={HORIZON} width={2320} height={1080 - HORIZON + 200} fill="url(#pbSea)" />
          <ellipse cx={SUN[0]} cy={HORIZON + 130} rx={150} ry={190} fill="url(#pbSeaGlow)" />
          <g>
            {Array.from({ length: 44 }).map((_, i) => {
              const y = HORIZON + 3 + i * i * 0.2;
              const spread = 30 + i * 3.2;
              const w = (26 + i * 5) * (0.35 + 0.9 * hash(i * 3.1 + Math.floor(frame / 3) * 0.37));
              const x = SUN[0] + shimmer(i + 40) * spread;
              return <rect key={i} x={x - w / 2} y={y} width={w} height={1.6 + i * 0.07} rx={1} fill={i < 10 ? "#ffe3a8" : "#ffbf72"}
                opacity={clamp(0.85 - i * 0.017)} />;
            })}
          </g>
          {/* the bridge mirrored in the water, broken by ripples */}
          <g opacity={0.22}>
            {PYLON_X.map((x) => (
              <rect key={x} x={x - 12 + noise1(frame / 7 + x, 2) * 3} y={HORIZON + 8} width={24} height={150} fill={INK} />
            ))}
          </g>
          {piers}
          <rect x={-200} y={DECK - 4} width={2320} height={16} fill={INK} />
          {lamps}
          {cars}
          {cables}
          {PYLON_X.map((x) => (
            <path key={x} d={pylonPath(x)} fill={INK} />
          ))}
          {/* rim light on the pylon edges facing the sun */}
          {PYLON_X.map((x) => (
            <line key={`r${x}`} x1={x + (x < SUN[0] ? 9 : -9)} y1={TIP + 70} x2={x + (x < SUN[0] ? 16 : -16)} y2={DECK - 10} stroke={warm}
              strokeWidth={1.5} opacity={0.45} />
          ))}
          {PYLON_X.map((x) => (
            <circle key={`a${x}`} cx={x} cy={TIP - 24} r={3} fill="#ff4a3a" opacity={0.9} />
          ))}
        </g>
        {/* birds */}
        <g transform={layer(mv, 0.7)}>
          {[0, 1, 2].map((i) => (
            <Bird key={i} x={360 + i * 70 + frame * (1.6 + i * 0.3)} y={250 + i * 34 + Math.sin(frame / 20 + i) * 6} s={1 - i * 0.18}
              flap={(Math.sin(frame / 3 + i * 2) + 1) / 2} />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------- night
// Driving across the deck at night, in one-point perspective. One lamp post
// on each side passes the camera every beat (the sides are staggered by half
// a beat), so the picture keeps time without jumping. Cars keep to the left:
// red tail lights ahead of us, white headlights coming the other way. The
// cable-stayed span comes closer, its aviation lights blinking on the beats.
const VP: [number, number] = [960, 470];
const FL = 1000;
const CAM_H = 1.8;
const CAM_X = -5.6;
const SPACING = 36; // m between lamp posts (= one beat)

type W = { x: number; y: number; z: number };
const proj = (p: W, camX: number): [number, number] | null =>
  p.z <= 0.5 ? null : [VP[0] + (FL * (p.x - camX)) / p.z, VP[1] + (FL * (CAM_H - p.y)) / p.z];
const pts = (...ps: ([number, number] | null)[]) => (ps.some((q) => !q) ? "" : (ps as [number, number][]).map((q) => q.join(",")).join(" "));

export const NightScene: React.FC<SceneProps> = ({ frame, b, at, mv, warm }) => {
  const travel = b * SPACING; // metres driven since the shot began
  const camX = CAM_X + noise1(frame / 40, 9) * 0.25;
  const P = (x: number, y: number, z: number) => proj({ x, y, z }, camX);
  const sec = b * BGM_INFO.period; // seconds since the shot began

  // lane markings
  const marks: React.ReactNode[] = [];
  const solid = (x: number, key: string, color: string) =>
    marks.push(<polygon key={key} points={pts(P(x - 0.12, 0, 2), P(x + 0.12, 0, 2), P(x + 0.12, 0, 1500), P(x - 0.12, 0, 1500))} fill={color} opacity={0.55} />);
  const dashed = (x: number, key: string) => {
    for (let k = 0; k < 50; k++) {
      const z0 = k * 12 - (travel % 12);
      if (z0 < 1) continue;
      marks.push(<polygon key={`${key}${k}`} points={pts(P(x - 0.1, 0, z0), P(x + 0.1, 0, z0), P(x + 0.1, 0, z0 + 4), P(x - 0.1, 0, z0 + 4))}
        fill="#e8eef6" opacity={0.75 * clamp(1 - z0 / 500)} />);
    }
  };
  solid(-11, "eL", "#f2f5fa");
  dashed(-7.3, "d1");
  dashed(-3.7, "d2");
  dashed(3.7, "d3");
  dashed(7.3, "d4");
  solid(11, "eR", "#f2f5fa");

  // lamp posts: left side on the beats, right side half a beat later
  const poles: React.ReactNode[] = [];
  const pools: React.ReactNode[] = [];
  const glows: React.ReactNode[] = [];
  for (const side of [-1, 1]) {
    const off = side < 0 ? 0 : SPACING / 2;
    for (let k = 0; k < 18; k++) {
      const z = k * SPACING + off - (travel % SPACING) + 6;
      if (z < 1.5) continue;
      const x = side * 12.2;
      const foot = P(x, 0, z);
      const head = P(x, 11, z);
      const lampW: W = { x: x - side * 2.6, y: 10.7, z };
      const lamp = P(lampW.x, lampW.y, z);
      if (!foot || !head || !lamp) continue;
      const w = Math.max(0.8, (FL * 0.28) / z);
      const fade = clamp(1.15 - z / 620);
      poles.push(
        <g key={`${side}${k}`} opacity={fade} stroke="#5d6a80" strokeLinecap="round">
          <line x1={foot[0]} y1={foot[1]} x2={head[0]} y2={head[1]} strokeWidth={w} />
          <line x1={head[0]} y1={head[1]} x2={lamp[0]} y2={lamp[1]} strokeWidth={w * 0.7} />
        </g>,
      );
      const r = Math.min(340, (FL * 3.2) / z);
      glows.push(<circle key={`g${side}${k}`} cx={lamp[0]} cy={lamp[1]} r={r} fill="url(#pbLampGlow)" opacity={fade} />);
      glows.push(<ellipse key={`s${side}${k}`} cx={lamp[0]} cy={lamp[1]} rx={r * 1.6} ry={Math.max(1, r * 0.05)} fill="#ffe9c4" opacity={0.35 * fade} />);
      glows.push(<circle key={`c${side}${k}`} cx={lamp[0]} cy={lamp[1]} r={Math.max(1.5, r * 0.07)} fill="#fff8ea" opacity={fade} />);
      // the pool of light it throws on the road
      const pool = P(lampW.x - side * 1.5, 0, z);
      if (pool)
        pools.push(<ellipse key={`p${side}${k}`} cx={pool[0]} cy={pool[1]} rx={Math.min(1400, (FL * 9) / z)} ry={Math.min(320, (FL * 1.4) / z)}
          fill="url(#pbPool)" opacity={fade} />);
    }
  }

  // traffic
  const cars: React.ReactNode[] = [];
  const pair = (x: number, z: number, zTrail: number, core: string, glow: string, key: string, size: number) => {
    if (z < 1.5 || z > 900) return;
    for (const dx of [-0.8, 0.8]) {
      const a = P(x + dx, 0.75, z);
      const t = P(x + dx, 0.75, zTrail);
      if (!a || !t) continue;
      const r = Math.max(1.2, (FL * size) / z);
      const fade = clamp(1.2 - z / 760);
      cars.push(
        <g key={`${key}${dx}`} opacity={fade}>
          <circle cx={a[0]} cy={a[1]} r={r * 7} fill={glow} opacity={0.22} />
          <line x1={t[0]} y1={t[1]} x2={a[0]} y2={a[1]} stroke={core} strokeWidth={r * 2} strokeLinecap="round" />
        </g>,
      );
    }
  };
  for (let i = 0; i < 10; i++) {
    // ahead of us, same way, a little slower or faster: red tail lights
    const lane = [-9.2, -5.5, -1.8][i % 3];
    const rel = (hash(i * 4.7) - 0.6) * 9; // m/s relative to us
    const z = 24 + ((((hash(i * 2.9) * 560 + rel * sec) % 560) + 560) % 560);
    pair(lane, z, z - rel / 30 - 0.6, "#ff4a3c", "#ff2a1a", `t${i}`, 0.15);
  }
  for (let i = 0; i < 14; i++) {
    // coming the other way: white headlights, fast
    const lane = [1.8, 5.5, 9.2][i % 3];
    const v = 94 + hash(i * 3.3) * 10; // closing speed, m/s
    const z = ((((hash(i * 5.1) * 800 - v * sec) % 800) + 800) % 800) + 2;
    pair(lane, z, z + (v / 30) * 1.8, "#f6f9ff", "#cfe0ff", `h${i}`, 0.19);
  }

  // the cable-stayed span ahead, coming closer
  const span: React.ReactNode[] = [];
  const blink = hitEnv(frame - at(Math.floor(b)), 6);
  for (const z0 of [300, 525]) {
    const z = z0 - travel;
    if (z < 4) continue;
    for (const side of [-1, 1]) {
      const x = side * 12.8;
      const foot = P(x, 0, z);
      const top = P(x, 98, z);
      const tip = P(x, 114, z);
      if (!foot || !top || !tip) continue;
      const w = Math.max(2, (FL * 2.4) / z);
      const cables: React.ReactNode[] = [];
      for (let k = 0; k < 10; k++) {
        const anchor = P(x, 60 + k * 3.8, z);
        if (!anchor) continue;
        for (const dir of [-1, 1]) {
          const deck = P(x, 0.8, z + dir * (20 + k * 12.5));
          if (deck) cables.push(<line key={`${k}${dir}`} x1={anchor[0]} y1={anchor[1]} x2={deck[0]} y2={deck[1]} />);
        }
      }
      span.push(
        <g key={`${z0}${side}`}>
          <g stroke="#ffe3bd" strokeWidth={Math.max(0.7, w * 0.11)} opacity={0.6}>
            {cables}
          </g>
          <line x1={foot[0]} y1={foot[1]} x2={top[0]} y2={top[1]} stroke="#ffd9a6" strokeWidth={w * 2.4} opacity={0.12} />
          <line x1={foot[0]} y1={foot[1]} x2={top[0]} y2={top[1]} stroke="#e9d2b0" strokeWidth={w * 0.8} opacity={0.85} />
          <path d={`M${top[0] - w * 0.4} ${top[1]} L${tip[0]} ${tip[1]} L${top[0] + w * 0.4} ${top[1]} Z`} fill="#e9d2b0" opacity={0.85} />
          <circle cx={tip[0]} cy={tip[1]} r={Math.max(2.5, w * 0.9)} fill="#ff3b30" opacity={0.5 + 0.5 * blink} />
          <circle cx={tip[0]} cy={tip[1]} r={Math.max(10, w * 4)} fill="#ff3b30" opacity={0.3 * blink} />
        </g>,
      );
    }
  }

  // the skyline far ahead, on the horizon, and its reflection in the sea
  const skyline: React.ReactNode[] = [];
  for (let i = 0; i < 120; i++) {
    const x = 380 + hash(i * 1.3) * 1160;
    const y = VP[1] - 2 - hash(i * 2.1) * 10;
    const c = hash(i * 5.9) > 0.3 ? "#ffd49a" : "#dff0ff";
    const o = 0.55 + 0.45 * noise1(frame / 8 + i, 3);
    skyline.push(<circle key={i} cx={x} cy={y} r={0.9 + hash(i * 3.7) * 1.2} fill={c} opacity={o} />);
    if (i % 3 === 0)
      skyline.push(<rect key={`r${i}`} x={x - 0.8} y={VP[1] + 3} width={1.6} height={10 + hash(i * 7.7) * 26} fill={c} opacity={o * 0.25} />);
  }
  const roll = mv.rotate + noise1(frame / 50, 4) * 0.3;

  return (
    <AbsoluteFill style={{ backgroundColor: "#03060d" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="pbNightSky" x1="0" y1="0" x2="0" y2={VP[1]} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#02050c" />
            <stop offset="0.6" stopColor="#0a1a36" />
            <stop offset="0.9" stopColor="#243266" />
            <stop offset="1" stopColor="#5a4a7a" />
          </linearGradient>
          <linearGradient id="pbNightSea" x1="0" y1={VP[1]} x2="0" y2={1080} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1b2444" />
            <stop offset="0.3" stopColor="#0a1226" />
            <stop offset="1" stopColor="#03060d" />
          </linearGradient>
          <radialGradient id="pbLampGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff1d2" stopOpacity={0.9} />
            <stop offset="0.12" stopColor="#ffd08a" stopOpacity={0.45} />
            <stop offset="0.4" stopColor={warm} stopOpacity={0.12} />
            <stop offset="1" stopColor={warm} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="pbHorizonGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#a8708a" stopOpacity={0.4} />
            <stop offset="1" stopColor="#a8708a" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="pbPool" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffc47a" stopOpacity={0.28} />
            <stop offset="1" stopColor="#ffc47a" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="pbRoad" x1="0" y1={VP[1]} x2="0" y2={1080} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2a2f40" />
            <stop offset="0.25" stopColor="#191d29" />
            <stop offset="1" stopColor="#0c0f17" />
          </linearGradient>
        </defs>
        <g transform={`translate(960 540) rotate(${roll}) scale(${mv.scale}) translate(-960 -540)`}>
          <rect x={-300} y={-300} width={2520} height={VP[1] + 300} fill="url(#pbNightSky)" />
          <rect x={-300} y={VP[1]} width={2520} height={900} fill="url(#pbNightSea)" />
          <ellipse cx={VP[0]} cy={VP[1]} rx={1100} ry={120} fill="url(#pbHorizonGlow)" />
          {skyline}
          {/* road surface between the parapets */}
          <polygon points={pts(P(-11.6, 0, 1.5), P(11.6, 0, 1.5), P(11.6, 0, 1500), P(-11.6, 0, 1500))} fill="url(#pbRoad)" />
          <g style={{ mixBlendMode: "screen" }}>{pools}</g>
          {marks}
          {/* median barrier and parapets */}
          {[
            [-0.4, 0.9, "#1c2230"],
            [0.4, 0.9, "#1c2230"],
            [-11.8, 1.1, "#161b27"],
            [11.8, 1.1, "#161b27"],
          ].map(([x, h, c]) => (
            <g key={x as number}>
              <polygon points={pts(P(x as number, 0, 1.5), P(x as number, h as number, 1.5), P(x as number, h as number, 1500), P(x as number, 0, 1500))}
                fill={c as string} />
              <polygon points={pts(P(x as number, (h as number) - 0.05, 1.5), P(x as number, h as number, 1.5), P(x as number, h as number, 1500),
                P(x as number, (h as number) - 0.05, 1500))} fill="#8a93a8" opacity={0.5} />
            </g>
          ))}
          {span}
          {poles}
          <g style={{ mixBlendMode: "screen" }}>
            {cars}
            {glows}
          </g>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ----------------------------------------------------- 1985: deck closure
const C_DECK = 740;
const C_SEA = 880;
const C_PYLONS = [600, 1320];
const C_MID = 960;
// Cantilever tips on the beats of the first bar (gap to the centre, px).
const GAPS = [360, 230, 130, 60, 0];

const Pylon: React.FC<{ x: number; color: string }> = ({ x, color }) => (
  <g>
    <path d={`M${x - 20} ${C_SEA} L${x - 13} 430 L${x - 9} 368 L${x} 298 L${x + 9} 368 L${x + 13} 430 L${x + 20} ${C_SEA} Z`}
      fill="#0d1a2c" stroke={color} strokeWidth={2.5} />
    <path d={`M${x - 13} 430 L${x + 13} 430`} stroke={color} strokeWidth={2} />
    <rect x={x - 34} y={C_DECK + 6} width={68} height={16} fill="#0d1a2c" stroke={color} strokeWidth={2} />
  </g>
);

export const ClosureScene: React.FC<SceneProps> = ({ frame, b, at, mv, warm }) => {
  // gap left between the two cantilever tips
  let gap = GAPS[0];
  for (let i = 1; i < GAPS.length; i++) gap = lerp(gap, GAPS[i], whip(frame - at(i - 1 + (i === GAPS.length - 1 ? 1 : 0)), 0.2, 6));
  const closed = whip(frame - at(4), 0, 4);
  const burst = hitEnv(frame - at(4), 16);
  const left = C_MID - gap / 2;
  const right = C_MID + gap / 2;
  const line = "#f6dcb4";
  const cables: React.ReactNode[] = [];
  for (const px of C_PYLONS) {
    for (let i = 0; i < 9; i++) {
      const ay = 380 + i * 13;
      const reach = 42 + i * 38;
      for (const dir of [-1, 1]) {
        const dx = px + dir * reach;
        const towardsMid = (dir > 0 && px < C_MID) || (dir < 0 && px > C_MID);
        const built = !towardsMid || (px < C_MID ? dx <= left + 1 : dx >= right - 1);
        if (!built) continue;
        cables.push(<line key={`${px}${i}${dir}`} x1={px + dir * 4} y1={ay} x2={dx} y2={C_DECK} stroke={line} strokeWidth={1.4} opacity={0.75} />);
      }
    }
  }
  const lamps: React.ReactNode[] = [];
  for (let x = 90; x < 1920; x += 70) {
    const d = Math.abs(x - C_MID) / 960; // 0 at the centre
    const on = clamp((b - 4 - d * 3.5) * 3);
    lamps.push(<circle key={x} cx={x} cy={C_DECK - 16} r={3.2} fill="#fff1d6" opacity={on}
      style={{ filter: on > 0 ? `drop-shadow(0 0 6px ${warm})` : undefined }} />);
  }
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#060d1c 0%, #111f3d 50%, #3b2b48 76%, #a2563f 81.4%, #070d19 81.5%, #04070f 100%)" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <g transform={layer(mv, 1, 960, 660)}>
          {/* glow on the horizon */}
          <ellipse cx={C_MID} cy={C_SEA} rx={900} ry={60} fill={warm} opacity={0.18 + 0.4 * burst} style={{ filter: "blur(30px)" }} />
          {/* sea shimmer */}
          {Array.from({ length: 22 }).map((_, i) => {
            const y = C_SEA + 10 + i * i * 0.65;
            const w = 120 + i * 40;
            const x = C_MID + noise1(i * 3.1 + frame / 40, 7) * 140;
            return <rect key={i} x={x - w / 2} y={y} width={w} height={2 + i * 0.12} fill={warm} opacity={(0.16 - i * 0.006) * (1 + 3 * burst)} />;
          })}
          {/* approach piers and side spans (already built) */}
          {[100, 220, 340, 460, 1460, 1580, 1700, 1820].map((x) => (
            <rect key={x} x={x - 7} y={C_DECK + 10} width={14} height={C_SEA - C_DECK - 10} fill="#0d1a2c" stroke={line} strokeWidth={1.5} />
          ))}
          <line x1={0} y1={C_DECK} x2={C_PYLONS[0]} y2={C_DECK} stroke={line} strokeWidth={5} />
          <line x1={C_PYLONS[1]} y1={C_DECK} x2={1920} y2={C_DECK} stroke={line} strokeWidth={5} />
          {/* the cantilevers growing towards each other */}
          <line x1={C_PYLONS[0]} y1={C_DECK} x2={left} y2={C_DECK} stroke={line} strokeWidth={5} />
          <line x1={right} y1={C_DECK} x2={C_PYLONS[1]} y2={C_DECK} stroke={line} strokeWidth={5} />
          {cables}
          {C_PYLONS.map((x) => (
            <Pylon key={x} x={x} color={line} />
          ))}
          {/* the gap closes on the downbeat */}
          <circle cx={C_MID} cy={C_DECK} r={8 + 70 * burst} fill="#fffaf0" opacity={closed * (0.35 + 0.65 * burst)}
            style={{ filter: `blur(${4 + 18 * burst}px)` }} />
          <line x1={C_MID - 140 - 700 * burst} y1={C_DECK} x2={C_MID + 140 + 700 * burst} y2={C_DECK} stroke="#ffffff"
            strokeWidth={2 + 6 * burst} opacity={burst * 0.9} style={{ filter: "blur(3px)" }} />
          {lamps}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
