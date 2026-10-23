// The map shots: the Penang Strait drawn in code (Natural Earth coastline)
// under a drone camera (map3d.ts). One world, four modes:
//   ferries  – before 1985: ferries shuttle between Butterworth and George Town
//   why      – the FREE PORT stamp is struck out, the camera swoops to Bayan
//              Lepas and the factories rise on the beats
//   bridge   – the bridge is drawn across the strait one step per beat
//   industry – traffic flows over the bridge between the factories and the port
// Positions are schematic (see docs/NOTES.md), not a survey map.

import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp, hash, hitEnv, inv, lerp, noise1, pop, whip } from "./anim";
import { EN, ZH_SANS } from "./fonts";
import { inside, ISLAND_PTS, MAINLAND_PTS, makeView, P, polyline, type Pt, type View } from "./map3d";
import type { SceneProps } from "./scenes";

export type MapMode = "ferries" | "why" | "bridge" | "industry";

// ------------------------------------------------------------------ places
const GT = P([100.3395, 5.4175]); // George Town
const BW = P([100.3792, 5.3995]); // Butterworth ferry terminal
const BL = P([100.298, 5.318]); // Bayan Lepas Free Industrial Zone (schematic, east of the airport)
const PORT = P([100.3795, 5.425]); // the port on the Butterworth side
const PERAI = P([100.398, 5.371]);
const ISLAND_LABEL = P([100.282, 5.385]);
const MAINLAND_LABEL = P([100.455, 5.43]);
const STRAIT_LABEL = P([100.362, 5.382]);

const FERRY = polyline([BW, P([100.361, 5.405]), P([100.343, 5.414])]);
const BRIDGE_PTS: Pt[] = [
  P([100.307, 5.357]), // island approach (Gelugor)
  P([100.322, 5.355]), // island shore
  P([100.36, 5.3535]),
  P([100.4, 5.356]), // mainland shore
  P([100.418, 5.362]), // mainland approach (Perai)
];
const BRIDGE = polyline(BRIDGE_PTS);
const SHORE0 = polyline(BRIDGE_PTS.slice(0, 2)).length;
const SHORE1 = polyline(BRIDGE_PTS.slice(0, 4)).length;
// the cable-stayed span, out over the water (schematic, exaggerated)
const PYLONS = [SHORE0 + (SHORE1 - SHORE0) * 0.32, SHORE0 + (SHORE1 - SHORE0) * 0.32 + 13];
const DECK_Z = 1.4;
const PYLON_Z = 17;

const TRAFFIC = polyline([BL, P([100.31, 5.335]), ...BRIDGE_PTS.slice(0), P([100.405, 5.385]), P([100.384, 5.41]), PORT]);

const FACTORIES_BL: [number, number, number, number, number][] = [
  // dx, dy, w, d, h (map px)
  [-16, -8, 11, 7, 6],
  [4, -20, 9, 9, 8],
  [20, -2, 12, 8, 5],
  [-2, 14, 10, 7, 9],
  [-26, 12, 8, 8, 5],
  [16, 22, 9, 7, 7],
];
const FACTORIES_PERAI: [number, number, number, number, number][] = [
  [-6, -6, 9, 7, 5],
  [8, 6, 10, 7, 6],
  [-10, 12, 8, 6, 4],
];

// -------------------------------------------------------------- static land
const HILL = P([100.27, 5.41]); // Penang Hill, centre of the island's contours
const scaleAbout = (pts: readonly Pt[], c: Pt, k: number): Pt[] => pts.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
const RINGS = [0.74, 0.5, 0.28].map((k, i) => ({ pts: scaleAbout(ISLAND_PTS, HILL, k), z: 5 + i * 5 }));
type Light = { x: number; y: number; a: number; r: number; warm: boolean; seed: number };
const scatter = (c: Pt, radius: number, n: number, poly: readonly Pt[], seed: number, a = 0.9): Light[] => {
  const out: Light[] = [];
  for (let i = 0; out.length < n && i < n * 6; i++) {
    const ang = hash(seed + i * 1.7) * Math.PI * 2;
    const rr = radius * Math.sqrt(hash(seed + i * 3.1 + 0.5));
    const x = c[0] + Math.cos(ang) * rr;
    const y = c[1] + Math.sin(ang) * rr * 0.8;
    if (!inside(poly, x, y)) continue;
    out.push({ x, y, a: a * (0.4 + 0.6 * hash(seed + i * 5.3)), r: 0.5 + hash(seed + i * 7.9) * 0.9, warm: hash(seed + i * 2.3) > 0.25, seed: i + seed });
  }
  return out;
};
const LIGHTS: Light[] = [
  ...scatter([GT[0] - 14, GT[1] + 10], 48, 150, ISLAND_PTS, 11),
  ...scatter([BW[0] + 30, BW[1]], 44, 110, MAINLAND_PTS, 23),
  ...scatter([BL[0] - 6, BL[1] + 4], 34, 60, ISLAND_PTS, 37),
  ...scatter(PERAI, 46, 70, MAINLAND_PTS, 41),
  ...scatter(P([100.32, 5.38]), 40, 60, ISLAND_PTS, 53, 0.6),
  ...scatter(P([100.43, 5.47]), 70, 70, MAINLAND_PTS, 61, 0.55),
  ...scatter(P([100.24, 5.33]), 60, 30, ISLAND_PTS, 71, 0.4),
];

const GRATICULE: Pt[][] = [];
for (let lon = 100.1; lon <= 100.6 + 1e-9; lon += 0.025)
  GRATICULE.push([P([lon, 5.15]), P([lon, 5.6])]);
for (let lat = 5.15; lat <= 5.6 + 1e-9; lat += 0.025)
  GRATICULE.push([P([100.1, lat]), P([100.6, lat])]);

// ------------------------------------------------------------------ pieces
const inFrame = (p: readonly number[] | null, m = 120): p is [number, number, number] =>
  !!p && p[0] > -m && p[0] < 1920 + m && p[1] > -m && p[1] < 1080 + m;
// labels fade out as they reach the frame edges instead of being cut off
const edgeFade = (x: number, y: number) => clamp((x - 150) / 160) * clamp((1770 - x) / 160) * clamp((y - 170) / 80) * clamp((930 - y) / 80);

const Box: React.FC<{ v: View; x: number; y: number; w: number; d: number; h: number; lit: string; shade: string; top: string }> = ({
  v,
  x,
  y,
  w,
  d,
  h,
  lit,
  shade,
  top,
}) => {
  if (h <= 0.05) return null;
  const c: Pt[] = [
    [x - w / 2, y - d / 2],
    [x + w / 2, y - d / 2],
    [x + w / 2, y + d / 2],
    [x - w / 2, y + d / 2],
  ];
  const normals: Pt[] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const faces: React.ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    const a = c[i];
    const b = c[(i + 1) % 4];
    const n = normals[i];
    if ((v.eye[0] - (a[0] + b[0]) / 2) * n[0] + (v.eye[1] - (a[1] + b[1]) / 2) * n[1] <= 0) continue;
    const q = [v.project(a[0], a[1], 0), v.project(b[0], b[1], 0), v.project(b[0], b[1], h), v.project(a[0], a[1], h)];
    if (q.some((p) => !p)) continue;
    const pts = (q as [number, number, number][]).map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    faces.push(<polygon key={i} points={pts} fill={i === 1 || i === 2 ? lit : shade} />);
  }
  const tq = c.map(([cx, cy]) => v.project(cx, cy, h));
  if (tq.some((p) => !p)) return <g>{faces}</g>;
  return (
    <g>
      {faces}
      <polygon points={(tq as [number, number, number][]).map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")} fill={top} />
    </g>
  );
};

const Label: React.FC<{ v: View; at: Pt; zh: string; en: string; opacity: number; lift?: number; dot?: string }> = ({
  v,
  at,
  zh,
  en,
  opacity,
  lift = 54,
  dot = "#ffffff",
}) => {
  if (opacity <= 0.01) return null;
  const g = v.project(at[0], at[1], 0);
  if (!inFrame(g, 300)) return null;
  const s = v.scaleAt(g[2]);
  const top = v.project(at[0], at[1], lift / s) ?? g;
  const ty = Math.min(top[1], g[1] - 18);
  const a = opacity * edgeFade(top[0], ty - 20);
  if (a <= 0.01) return null;
  return (
    <g opacity={a}>
      <line x1={g[0]} y1={g[1]} x2={top[0]} y2={ty} stroke="#e6f4fb" strokeWidth={1.4} opacity={0.55} />
      <circle cx={g[0]} cy={g[1]} r={9} fill={dot} opacity={0.18} />
      <circle cx={g[0]} cy={g[1]} r={4} fill={dot} />
      <g textAnchor="middle">
        {zh ? (
          <text x={top[0]} y={ty - (en ? 34 : 14)} fontFamily={ZH_SANS} fontSize={34} fontWeight={700} fill="#f3f8fb" letterSpacing="0.14em"
            style={{ paintOrder: "stroke", stroke: "rgba(4,10,18,0.65)", strokeWidth: 6 }}>
            {zh}
          </text>
        ) : null}
        {en ? (
          <text x={top[0]} y={ty - 10} fontFamily={EN} fontSize={17} fontWeight={600} fill="#a9cadb" letterSpacing="0.26em"
            style={{ paintOrder: "stroke", stroke: "rgba(4,10,18,0.65)", strokeWidth: 4 }}>
            {en}
          </text>
        ) : null}
      </g>
    </g>
  );
};

const Water: React.FC<{ v: View; at: Pt; zh: string; en: string; opacity: number }> = ({ v, at, zh, en, opacity }) => {
  const g = v.project(at[0], at[1], 0);
  if (!inFrame(g, 200) || opacity <= 0.01) return null;
  return (
    <g textAnchor="middle" opacity={opacity * edgeFade(g[0], g[1])}>
      <text x={g[0]} y={g[1]} fontFamily={ZH_SANS} fontSize={26} fontWeight={500} fill="#8fc0d8" letterSpacing="0.6em">{zh}</text>
      <text x={g[0]} y={g[1] + 26} fontFamily={EN} fontSize={14} fontWeight={600} fill="#6f9fb8" letterSpacing="0.5em">{en}</text>
    </g>
  );
};

// Ferries shuttle back and forth (Penang's ferries were double-ended), easing
// into each terminal.
const Ferries: React.FC<{ v: View; t: number; opacity: number }> = ({ v, t, opacity }) => {
  const out: React.ReactNode[] = [];
  const L = FERRY.length;
  const sAt = (time: number, i: number) => {
    const ph = (((time / 9 + i / 3) % 1) + 1) % 1;
    const u = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    return (u * u * (3 - 2 * u)) * L;
  };
  for (let i = 0; i < 3; i++) {
    const s = sAt(t, i);
    const dir = Math.sign(sAt(t + 0.05, i) - s) || 1;
    const wake: React.ReactNode[] = [];
    for (let k = 1; k <= 10; k++) {
      const a = FERRY.at(sAt(t - k * 0.12, i));
      const b = FERRY.at(sAt(t - (k - 1) * 0.12, i));
      const pa = v.project(a[0], a[1], 0);
      const pb = v.project(b[0], b[1], 0);
      if (!pa || !pb) continue;
      wake.push(<line key={k} x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} stroke="#cfe9f5" strokeLinecap="round"
        strokeWidth={Math.max(1, 2.6 * v.scaleAt(pa[2]) * 0.5)} opacity={0.32 * (1 - k / 11)} />);
    }
    const f = FERRY.at(s + dir * 4.5);
    const r = FERRY.at(s - dir * 4.5);
    const pf = v.project(f[0], f[1], 0.6);
    const pr = v.project(r[0], r[1], 0.6);
    if (!pf || !pr) continue;
    const w = clamp(2.8 * v.scaleAt(pf[2]), 4, 14);
    out.push(
      <g key={i}>
        {wake}
        <line x1={pr[0]} y1={pr[1]} x2={pf[0]} y2={pf[1]} stroke="#ffe2b0" strokeWidth={w * 2.6} strokeLinecap="round" opacity={0.25} />
        <line x1={pr[0]} y1={pr[1]} x2={pf[0]} y2={pf[1]} stroke="#fff6e6" strokeWidth={w} strokeLinecap="round" />
      </g>,
    );
  }
  return <g opacity={opacity}>{out}</g>;
};

const Traffic: React.FC<{ v: View; t: number; opacity: number; warm: string }> = ({ v, t, opacity, warm }) => {
  if (opacity <= 0.01) return null;
  const L = TRAFFIC.length;
  const dots: React.ReactNode[] = [];
  for (const dir of [1, -1]) {
    for (let i = 0; i < 34; i++) {
      const s0 = (((i / 34 + hash(i * 3.3 + dir) * 0.02 + (dir * t * 46) / L) % 1) + 1) % 1;
      const s = s0 * L;
      const a = TRAFFIC.at(s);
      const b = TRAFFIC.at(s - dir * 7);
      const n = TRAFFIC.at(s + 1);
      // keep to the left: offset each direction to its own side of the road
      const len = Math.hypot(n[0] - a[0], n[1] - a[1]) || 1;
      const ox = (-(n[1] - a[1]) / len) * 1.2 * dir;
      const oy = ((n[0] - a[0]) / len) * 1.2 * dir;
      const pa = v.project(a[0] + ox, a[1] + oy, DECK_Z + 0.4);
      const pb = v.project(b[0] + ox, b[1] + oy, DECK_Z + 0.4);
      if (!inFrame(pa) || !pb) continue;
      const w = clamp(1.3 * v.scaleAt(pa[2]), 1.2, 6);
      dots.push(<line key={`${dir}${i}`} x1={pb[0]} y1={pb[1]} x2={pa[0]} y2={pa[1]} stroke={dir > 0 ? warm : "#eaf6ff"} strokeWidth={w}
        strokeLinecap="round" opacity={0.9} />);
    }
  }
  return <g opacity={opacity}>{dots}</g>;
};

const Bridge: React.FC<{ v: View; drawn: number; lit: number; warm: string; frame: number }> = ({ v, drawn, lit, warm, frame }) => {
  if (drawn <= 0) return null;
  const d = v.path(BRIDGE.upTo(drawn), false, DECK_Z);
  const tip = BRIDGE.at(drawn);
  const pt = v.project(tip[0], tip[1], DECK_Z);
  const pylons = PYLONS.map((s, i) => {
    const rise = clamp((drawn - s) / 10);
    if (rise <= 0) return null;
    const [x, y] = BRIDGE.at(s);
    const base = v.project(x, y, DECK_Z);
    const top = v.project(x, y, DECK_Z + PYLON_Z * whip(rise * 8 - 0.75, 0.6, 8));
    if (!base || !top) return null;
    const cables: React.ReactNode[] = [];
    for (let k = 1; k <= 5; k++) {
      for (const side of [-1, 1]) {
        const [cx, cy] = BRIDGE.at(s + side * k * 2.4);
        const pc = v.project(cx, cy, DECK_Z);
        const pa = v.project(x, y, DECK_Z + PYLON_Z * (0.62 + k * 0.07) * rise);
        if (!pc || !pa) continue;
        cables.push(<line key={`${k}${side}`} x1={pa[0]} y1={pa[1]} x2={pc[0]} y2={pc[1]} stroke="#ffe9c8" strokeWidth={1} opacity={0.55 * rise} />);
      }
    }
    return (
      <g key={i}>
        {cables}
        <line x1={base[0]} y1={base[1]} x2={top[0]} y2={top[1]} stroke="#fff3df" strokeWidth={clamp(0.9 * v.scaleAt(base[2]), 1.5, 5)}
          strokeLinecap="round" />
      </g>
    );
  });
  // lamps along the finished deck
  const lamps: React.ReactNode[] = [];
  if (lit > 0) {
    for (let s = 4; s < BRIDGE.length; s += 6) {
      const [x, y] = BRIDGE.at(s);
      const p = v.project(x, y, DECK_Z + 1);
      if (!inFrame(p)) continue;
      const on = clamp(lit * 3 - (s / BRIDGE.length) * 2);
      lamps.push(<circle key={s} cx={p[0]} cy={p[1]} r={clamp(0.7 * v.scaleAt(p[2]), 1, 4)} fill="#fff1d2" opacity={on * (0.8 + 0.2 * noise1(frame / 5 + s, 3))} />);
    }
  }
  return (
    <g>
      <path d={d} fill="none" stroke={warm} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" opacity={0.14} />
      <path d={d} fill="none" stroke={warm} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" opacity={0.4} />
      <path d={d} fill="none" stroke="#fff6e8" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
      {pylons}
      {lamps}
      {pt && drawn < BRIDGE.length - 0.5 ? (
        <>
          <circle cx={pt[0]} cy={pt[1]} r={22} fill={warm} opacity={0.35} />
          <circle cx={pt[0]} cy={pt[1]} r={7} fill="#ffffff" />
        </>
      ) : null}
    </g>
  );
};

const Cranes: React.FC<{ v: View; opacity: number }> = ({ v, opacity }) => (
  <g opacity={opacity}>
    {[-14, -2, 10].map((dy, i) => {
      const x = PORT[0] + 1.5;
      const y = PORT[1] + dy;
      const base = v.project(x, y, 0);
      const top = v.project(x, y, 12);
      const boom = v.project(x - 9, y, 12);
      if (!base || !top || !boom) return null;
      const w = clamp(0.5 * v.scaleAt(base[2]), 1, 3);
      return (
        <g key={i} stroke="#cfe6f2" strokeWidth={w} strokeLinecap="round">
          <line x1={base[0]} y1={base[1]} x2={top[0]} y2={top[1]} />
          <line x1={top[0]} y1={top[1]} x2={boom[0]} y2={boom[1]} />
        </g>
      );
    })}
  </g>
);

// ------------------------------------------------------------------- scene
export const MapWorld: React.FC<SceneProps & { mode: MapMode }> = ({ mode, frame, at, e, mv, fps, warm, accent }) => {
  const v = makeView({ x: mv.x, y: mv.y, zoom: mv.scale, yaw: mv.rotate, tilt: mv.tilt });
  const t = frame / fps;

  // ---- what each mode shows
  // why: 0–4 the whole island and the stamp, 4 the camera swoops (shot ease
  // "swoop"), 4–8 the factories rise on the beats
  const go = mode === "why" ? clamp((e - 0.08) / 0.92) : 0;
  const stampIn = mode === "why" ? clamp(pop(frame - at(0.5))) : 0;
  const strike = mode === "why" ? whip(frame - at(2), 0, 6) : 0;
  const riseBL = (i: number) =>
    mode === "industry" ? 1 : mode === "why" ? whip(frame - at(4 + (i % 4) + (i >= 4 ? 0.5 : 0)), 0.35, 9) : 0;
  // bridge: one step per beat for six beats, from the island to the mainland
  const steps = 6;
  let drawn = 0;
  if (mode === "industry") drawn = BRIDGE.length;
  if (mode === "bridge") {
    for (let k = 0; k < steps; k++) drawn += whip(frame - at(k), 0.15, 9) / steps;
    drawn *= BRIDGE.length;
  }
  const lit = mode === "industry" ? 1 : mode === "bridge" ? inv(at(steps), at(steps + 1.5), frame) : 0;
  const blHit = mode === "why" ? hitEnv(frame - at(4), 14) : 0;

  // ---- sky (only when the camera is low enough to see the horizon)
  const hz = v.horizon;
  const land = v.path(ISLAND_PTS, true);
  const main = v.path(MAINLAND_PTS, true);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 62%, #0a2236 0%, #061627 45%, #030a14 100%)" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="pbMapLand" x1="0" y1="0" x2="0" y2="1080" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3b5b72" />
            <stop offset="1" stopColor="#4a6c84" />
          </linearGradient>
          <linearGradient id="pbMapSky" x1="0" y1={hz - 520} x2="0" y2={hz} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#081326" />
            <stop offset="0.55" stopColor="#27315a" />
            <stop offset="0.86" stopColor="#8c5a6a" />
            <stop offset="1" stopColor="#f3a56a" />
          </linearGradient>
          <linearGradient id="pbMapHaze" x1="0" y1={hz - 30} x2="0" y2={hz + 260} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f0a36d" stopOpacity={0.55} />
            <stop offset="0.25" stopColor="#7a6a86" stopOpacity={0.35} />
            <stop offset="1" stopColor="#0a1e31" stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* sea graticule */}
        <g stroke="#3a6e8e" strokeWidth={1} opacity={0.22}>
          {GRATICULE.map((line, i) => (
            <path key={i} d={v.path(line, false, 0)} fill="none" />
          ))}
        </g>
        {/* land */}
        <path d={land} fill="none" stroke="#5aa6c8" strokeWidth={26} opacity={0.1} strokeLinejoin="round" />
        <path d={main} fill="none" stroke="#5aa6c8" strokeWidth={26} opacity={0.1} strokeLinejoin="round" />
        <path d={land} fill="none" stroke="#7cc4e2" strokeWidth={9} opacity={0.18} strokeLinejoin="round" />
        <path d={main} fill="none" stroke="#7cc4e2" strokeWidth={9} opacity={0.18} strokeLinejoin="round" />
        <path d={land} fill="url(#pbMapLand)" stroke="#d6eef8" strokeWidth={2.4} strokeLinejoin="round" />
        <path d={main} fill="url(#pbMapLand)" stroke="#d6eef8" strokeWidth={2.4} strokeLinejoin="round" />
        <g fill="none" stroke="#a9d3e4" strokeWidth={1.1} opacity={0.3}>
          {RINGS.map((r, i) => (
            <path key={i} d={v.path(r.pts, true, r.z)} />
          ))}
        </g>
        {/* city lights */}
        <g>
          {LIGHTS.map((l, i) => {
            const p = v.project(l.x, l.y, 0);
            if (!inFrame(p, 20)) return null;
            const r = clamp(l.r * v.scaleAt(p[2]) * 0.55, 0.6, 3.4);
            return <circle key={i} cx={p[0]} cy={p[1]} r={r} fill={l.warm ? "#ffd59a" : "#e4f3ff"}
              opacity={l.a * (0.78 + 0.22 * noise1(t * 1.7 + l.seed, 5))} />;
          })}
        </g>
        {/* the ferry route */}
        <path d={v.path(FERRY.upTo(FERRY.length), false, 0.2)} fill="none" stroke="#a6d8ec" strokeWidth={1.6} strokeDasharray="7 9"
          opacity={mode === "ferries" ? 0.55 : 0.25} />
        {/* factories, port */}
        {FACTORIES_BL.map(([dx, dy, w, d, h], i) => (
          <Box key={i} v={v} x={BL[0] + dx * 1.3} y={BL[1] + dy * 1.3} w={w * 1.4} d={d * 1.4} h={h * 1.5 * riseBL(i)} lit="#f3dcb6" shade="#9c8a72"
            top="#fff1d8" />
        ))}
        {mode === "industry"
          ? FACTORIES_PERAI.map(([dx, dy, w, d, h], i) => (
              <Box key={`p${i}`} v={v} x={PERAI[0] + dx} y={PERAI[1] + dy} w={w} d={d} h={h} lit="#e9d6b6" shade="#8d806e" top="#fbeedb" />
            ))
          : null}
        {mode === "industry" ? <Cranes v={v} opacity={1} /> : null}
        {/* Bayan Lepas lights up when the camera arrives */}
        {mode === "why"
          ? (() => {
              const p = v.project(BL[0], BL[1], 0);
              if (!p) return null;
              return (
                <g opacity={go}>
                  <circle cx={p[0]} cy={p[1]} r={60 + 140 * blHit} fill="none" stroke={warm} strokeWidth={3} opacity={0.25 + 0.6 * blHit} />
                  <circle cx={p[0]} cy={p[1]} r={160} fill={warm} opacity={0.06 + 0.14 * blHit} />
                </g>
              );
            })()
          : null}
        <Bridge v={v} drawn={drawn} lit={lit} warm={warm} frame={frame} />
        <Traffic v={v} t={t} opacity={mode === "industry" ? 1 : 0} warm={warm} />
        <Ferries v={v} t={t} opacity={mode === "ferries" ? 1 : 0.55} />
        {/* sky and haze over the far sea */}
        {hz > -40 ? <rect x={-10} y={-10} width={1940} height={hz + 10} fill="url(#pbMapSky)" /> : null}
        {hz > -300 ? <rect x={-10} y={hz - 30} width={1940} height={300} fill="url(#pbMapHaze)" /> : null}
        {/* labels */}
        <Label v={v} at={ISLAND_LABEL} zh="槟城岛" en="PENANG ISLAND" lift={20}
          opacity={mode === "ferries" ? 0.9 : mode === "why" ? 0.9 * (1 - go) : 0} dot="rgba(0,0,0,0)" />
        <Label v={v} at={MAINLAND_LABEL} zh="威省" en="SEBERANG PERAI" lift={20}
          opacity={mode === "ferries" ? 0.9 : mode === "why" ? 0.9 * (1 - go) : 0} dot="rgba(0,0,0,0)" />
        <Water v={v} at={STRAIT_LABEL} zh="槟威海峡" en="PENANG STRAIT" opacity={mode === "ferries" ? 0.85 : 0} />
        <Label v={v} at={GT} zh="乔治市" en="GEORGE TOWN" opacity={mode === "ferries" ? 1 : mode === "why" ? 1 - go : 0} dot={accent} />
        <Label v={v} at={BW} zh="北海" en="BUTTERWORTH" opacity={mode === "ferries" ? 1 : 0} dot={accent} />
        <Label v={v} at={BL} zh={mode === "industry" ? "工厂" : "峇六拜"} en="BAYAN LEPAS"
          opacity={mode === "why" ? inv(0.5, 0.9, go) : mode === "industry" ? 1 : 0} dot={warm} lift={mode === "why" ? 190 : 90} />
        <Label v={v} at={PORT} zh="港口" en="BUTTERWORTH" opacity={mode === "industry" ? 1 : 0} dot={warm} lift={70} />
        <Label v={v} at={BRIDGE_PTS[0]} zh="" en="GELUGOR" opacity={mode === "bridge" ? clamp(pop(frame - at(0))) * (1 - inv(at(3.5), at(4), frame)) : 0} dot={warm} lift={40} />
        <Label v={v} at={BRIDGE_PTS[4]} zh="" en="PERAI" opacity={mode === "bridge" ? inv(BRIDGE.length - 2, BRIDGE.length, drawn) : 0}
          dot={warm} lift={40} />
        {mode === "why" ? <Stamp v={v} stampIn={stampIn} strike={strike} fade={1 - go} accent={accent} /> : null}
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(2,6,12,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

// The FREE PORT stamp over George Town, struck out on a beat.
const Stamp: React.FC<{ v: View; stampIn: number; strike: number; fade: number; accent: string }> = ({ v, stampIn, strike, fade, accent }) => {
  const g = v.project(GT[0], GT[1], 0);
  if (!g || fade <= 0.01 || stampIn <= 0) return null;
  const x = g[0] + 240;
  const y = g[1] + 190;
  return (
    <g opacity={stampIn * fade}>
      <path d={`M${g[0] + 8} ${g[1] + 6} L${x - 150} ${y - 50}`} stroke={accent} strokeWidth={2} opacity={0.8} />
      <g transform={`translate(${x} ${y}) rotate(-8) scale(${0.8 + 0.2 * stampIn})`}>
        <rect x={-160} y={-64} width={320} height={128} rx={10} fill="rgba(5,12,22,0.45)" stroke={strike > 0 ? "#d2553f" : accent}
          strokeWidth={6} opacity={1 - 0.4 * strike} />
        <text y={-6} textAnchor="middle" fontFamily={EN} fontSize={48} fontWeight={800} letterSpacing="0.12em" fill={accent}
          opacity={1 - 0.55 * strike}>FREE PORT</text>
        <text y={42} textAnchor="middle" fontFamily={ZH_SANS} fontSize={34} fontWeight={700} letterSpacing="0.5em" fill={accent}
          opacity={1 - 0.55 * strike}>自由港</text>
        {strike > 0.01 ? (
          <line x1={-180} y1={52} x2={lerp(-180, 180, strike)} y2={lerp(52, -52, strike)} stroke="#ec5a42" strokeWidth={12} strokeLinecap="round" />
        ) : null}
      </g>
    </g>
  );
};
