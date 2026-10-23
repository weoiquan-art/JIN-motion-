// People on the deck, in perspective, walking or running towards the camera:
//   walk     – 1985, days before the opening: an old-photo sepia, thousands
//              walking across, some under umbrellas; a new wave comes over
//              the far end of the deck on every beat
//   marathon – today's Penang Bridge International Marathon at first light:
//              lamps still on, coloured shirts, orange pacer balloons that
//              bob on the beat
// Everyone is a pure function of time: a fixed crowd drawn from hash(), each
// person walking at their own speed; nobody pops in except at the far end.

import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp, hash, hitEnv } from "./anim";
import { BGM_INFO } from "./beats";
import type { SceneProps } from "./scenes";

const VP: [number, number] = [960, 400];
const FL = 1100;
const CAM_H = 6;
const Z_NEAR = 10;
const Z_FAR = 280;

type Variant = "walk" | "marathon";
type Person = { x: number; z0: number; wave: number; v: number; shirt: string; legs: string; umbrella: string | null; balloon: boolean; ph: number };

const WALK_SHIRTS = ["#ece6da", "#e2dacb", "#cfc6b6", "#b3a996", "#8e8574", "#ece6da", "#6a6256"];
const WALK_UMBRELLAS = ["#2e2a26", "#d8d0c0", "#8a8070", "#4a443c"];
const RUN_SHIRTS = ["#ff5c8a", "#ff5c8a", "#3a7bd5", "#3a7bd5", "#22b5a5", "#b7e04a", "#ffd23f", "#f4f4f4", "#ff8a3d"];

const makeCrowd = (variant: Variant, halfWidth: number, beats: number): Person[] => {
  const walk = variant === "walk";
  const out: Person[] = [];
  const n = walk ? 1500 : 1600;
  const perWave = walk ? 34 : 40;
  for (let i = 0; i < n + perWave * beats; i++) {
    const wave = i < n ? -1 : Math.floor((i - n) / perWave);
    let x = (hash(i * 1.37 + 0.2) * 2 - 1) * (halfWidth - 0.6);
    if (!walk && Math.abs(x) < 0.7) x = Math.sign(x || 1) * (0.7 + hash(i * 2.9) * 0.6); // keep off the median barrier
    const v = walk ? 1.1 + hash(i * 2.3) * 0.5 : 2.7 + hash(i * 2.3) * 1.0;
    out.push({
      x,
      // more people near the camera than uniform depth would give, so the foreground is not empty
      z0: wave < 0 ? Z_NEAR + Math.pow(hash(i * 4.1), 1.45) * (Z_FAR - Z_NEAR) : Z_FAR,
      wave,
      v,
      shirt: (walk ? WALK_SHIRTS : RUN_SHIRTS)[Math.floor(hash(i * 5.9) * (walk ? WALK_SHIRTS.length : RUN_SHIRTS.length))],
      legs: walk ? (hash(i * 6.6) > 0.5 ? "#3e3830" : "#5a5248") : "#1c1f2a",
      umbrella: walk && hash(i * 8.8) < 0.2 ? WALK_UMBRELLAS[Math.floor(hash(i * 9.4) * WALK_UMBRELLAS.length)] : null,
      balloon: !walk && i % 150 === 17,
      ph: hash(i * 7.7) * Math.PI * 2,
    });
  }
  return out;
};

const CROWDS: Record<Variant, Person[]> = { walk: makeCrowd("walk", 8.1, 8), marathon: makeCrowd("marathon", 11.8, 8) };

export const CrowdScene: React.FC<SceneProps & { variant: Variant }> = ({ frame, b, at, mv, warm, variant }) => {
  const walk = variant === "walk";
  const D = walk ? 8.1 : 11.8; // half width between the parapets: 4 lanes in 1985, 6 today
  const sec = b * BGM_INFO.period;
  const P = (x: number, y: number, z: number): [number, number] => [VP[0] + (FL * x) / z, VP[1] + (FL * (CAM_H - y)) / z];
  const pts = (...ps: [number, number][]) => ps.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");

  // where everyone is now
  const people = CROWDS[variant]
    .map((p) => {
      const t = p.wave < 0 ? sec : sec - p.wave * BGM_INFO.period;
      if (t < 0) return null;
      let z = p.z0 - p.v * t;
      if (p.wave < 0 && z < Z_NEAR) z += Z_FAR - Z_NEAR; // loop the standing crowd
      if (z < Z_NEAR || z > Z_FAR) return null;
      const fadeIn = p.wave < 0 ? 1 : clamp((t * 30) / 5);
      return { p, z, fadeIn };
    })
    .filter((q): q is { p: Person; z: number; fadeIn: number } => q !== null)
    .sort((a, c) => c.z - a.z);

  const figures: React.ReactNode[] = [];
  people.forEach(({ p, z, fadeIn }, i) => {
    const s = FL / z;
    const stride = walk ? 1.8 : 2.9; // steps per second
    const bob = Math.abs(Math.sin(p.ph + sec * Math.PI * stride)) * 0.05 * s;
    const [fx, fy] = P(p.x, 0, z);
    const headY = VP[1] + (CAM_H - 1.62) * s - bob;
    const headR = Math.max(0.8, 0.11 * s);
    const w = Math.max(1.2, 0.44 * s);
    const waist = VP[1] + (CAM_H - 0.95) * s - bob;
    if (fy < 0 || headY > 1080) return;
    const op = fadeIn * clamp((Z_FAR - z) / 25 + 0.2);
    figures.push(
      <g key={i} opacity={op}>
        <rect x={fx - w * 0.42} y={waist} width={w * 0.84} height={fy - waist} fill={p.legs} />
        <rect x={fx - w / 2} y={headY + headR * 1.6} width={w} height={waist - headY - headR * 1.4} rx={w * 0.25} fill={p.shirt} />
        <circle cx={fx} cy={headY + headR} r={headR} fill={walk ? "#3a332c" : "#2a2224"} />
        {!walk && s > 40 ? <rect x={fx - w * 0.22} y={headY + headR * 3.2} width={w * 0.44} height={w * 0.3} fill="#ffffff" opacity={0.9} /> : null}
        {p.umbrella ? (
          <g>
            <line x1={fx + w * 0.3} y1={headY - 0.1 * s} x2={fx + w * 0.3} y2={headY + 0.5 * s} stroke="#2e2a26" strokeWidth={Math.max(0.6, 0.03 * s)} />
            <ellipse cx={fx + w * 0.3} cy={headY - 0.2 * s} rx={0.55 * s} ry={0.2 * s} fill={p.umbrella} />
          </g>
        ) : null}
      </g>,
    );
    if (p.balloon) {
      // a pacer: the balloon rides 2.5 m above, and bobs on each beat
      const beat = hitEnv(frame - at(Math.floor(b)), 9);
      const by = VP[1] + (CAM_H - 4.1) * s - beat * 0.35 * s;
      figures.push(
        <g key={`b${i}`}>
          <line x1={fx} y1={headY} x2={fx} y2={by + 0.45 * s} stroke="#e8e8e8" strokeWidth={Math.max(0.5, 0.02 * s)} opacity={0.8} />
          <circle cx={fx} cy={by} r={0.65 * s} fill="#ff7a2a" />
          <circle cx={fx - 0.2 * s} cy={by - 0.2 * s} r={0.16 * s} fill="#ffc08a" opacity={0.8} />
        </g>,
      );
    }
  });

  // lamp posts (swan-neck), both edges, every 30 m; a sign gantry in 1985
  const posts: React.ReactNode[] = [];
  const glows: React.ReactNode[] = [];
  for (let k = 0; k < 10; k++) {
    const z = 18 + k * 30 - ((sec * (walk ? 0.4 : 0.9)) % 30);
    if (z < 3) continue;
    for (const side of [-1, 1]) {
      const x = side * (D + 0.4);
      const foot = P(x, 0, z);
      const top = P(x, 10, z);
      const lamp = P(x - side * 2.2, 9.6, z);
      const sw = Math.max(0.8, (FL * 0.22) / z);
      posts.push(
        <g key={`${k}${side}`} stroke={walk ? "#5a554c" : "#2e3446"} fill="none" strokeLinecap="round">
          <line x1={foot[0]} y1={foot[1]} x2={top[0]} y2={top[1]} strokeWidth={sw} />
          <path d={`M${top[0]} ${top[1]} Q${top[0]} ${top[1] - sw * 6} ${lamp[0]} ${lamp[1]}`} strokeWidth={sw * 0.8} />
        </g>,
      );
      if (!walk) {
        const r = Math.min(260, (FL * 2.6) / z);
        glows.push(<circle key={`g${k}${side}`} cx={lamp[0]} cy={lamp[1]} r={r} fill="url(#pbRunLamp)" />);
        glows.push(<circle key={`c${k}${side}`} cx={lamp[0]} cy={lamp[1]} r={Math.max(1.4, r * 0.06)} fill="#fff2d8" />);
      }
    }
  }
  // the cable-stayed span ahead
  const span: React.ReactNode[] = [];
  const zp = 230;
  for (const side of [-1, 1]) {
    const x = side * (D + 0.8);
    const foot = P(x, 0, zp);
    const top = P(x, 98, zp);
    const tip = P(x, 112, zp);
    const w = (FL * 2.4) / zp;
    const cables: React.ReactNode[] = [];
    for (let k = 0; k < 10; k++) {
      const anchor = P(x, 60 + k * 3.8, zp);
      for (const dir of [-1, 1]) {
        const deck = P(x, 0.8, zp + dir * (20 + k * 12.5));
        cables.push(<line key={`${k}${dir}`} x1={anchor[0]} y1={anchor[1]} x2={deck[0]} y2={deck[1]} />);
      }
    }
    span.push(
      <g key={side}>
        <g stroke={walk ? "#9a9284" : "#ffe3bd"} strokeWidth={Math.max(0.6, w * 0.1)} opacity={walk ? 0.8 : 0.55}>
          {cables}
        </g>
        <line x1={foot[0]} y1={foot[1]} x2={top[0]} y2={top[1]} stroke={walk ? "#8a8274" : "#e9d2b0"} strokeWidth={w * 0.85} />
        <path d={`M${top[0] - w * 0.42} ${top[1]} L${tip[0]} ${tip[1]} L${top[0] + w * 0.42} ${top[1]} Z`} fill={walk ? "#8a8274" : "#e9d2b0"} />
      </g>,
    );
  }
  const gantry = walk
    ? (() => {
        const z = 70 - sec * 0.4;
        const l = P(-D, 0, z);
        const r = P(D, 0, z);
        const lt = P(-D, 7.5, z);
        const rt = P(D, 7.5, z);
        const bw = (FL * 0.5) / z;
        return (
          <g fill="#6a6458">
            <rect x={l[0] - bw / 2} y={lt[1]} width={bw} height={l[1] - lt[1]} />
            <rect x={r[0] - bw / 2} y={rt[1]} width={bw} height={r[1] - rt[1]} />
            <rect x={lt[0]} y={lt[1] - bw * 1.4} width={rt[0] - lt[0]} height={bw * 2.2} />
          </g>
        );
      })()
    : null;

  const deck = pts(P(-D, 0, 2.5), P(D, 0, 2.5), P(D, 0, 1500), P(-D, 0, 1500));
  const marks: React.ReactNode[] = [];
  const lanes = walk ? [-4, 0, 4] : [-7.6, -3.9, 3.9, 7.6];
  for (const x of lanes) {
    for (let k = 0; k < 30; k++) {
      const z0 = 4 + k * 12;
      marks.push(<polygon key={`${x}${k}`} points={pts(P(x - 0.08, 0, z0), P(x + 0.08, 0, z0), P(x + 0.08, 0, z0 + 4), P(x - 0.08, 0, z0 + 4))}
        fill={walk ? "#8f887a" : "#d8dce6"} opacity={walk ? 0.6 : 0.45} />);
    }
  }
  return (
    <AbsoluteFill style={{ backgroundColor: walk ? "#cfc8ba" : "#0c1424" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="pbCrowdSky" x1="0" y1="0" x2="0" y2={VP[1]} gradientUnits="userSpaceOnUse">
            {walk ? (
              <>
                <stop offset="0" stopColor="#ddd6c8" />
                <stop offset="1" stopColor="#efe9dc" />
              </>
            ) : (
              <>
                <stop offset="0" stopColor="#16223e" />
                <stop offset="0.6" stopColor="#4a5684" />
                <stop offset="0.9" stopColor="#c48a86" />
                <stop offset="1" stopColor="#f0b884" />
              </>
            )}
          </linearGradient>
          <radialGradient id="pbRunLamp" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff0cc" stopOpacity={0.8} />
            <stop offset="0.15" stopColor={warm} stopOpacity={0.3} />
            <stop offset="1" stopColor={warm} stopOpacity={0} />
          </radialGradient>
        </defs>
        <g transform={`translate(${mv.x} ${mv.y}) translate(960 540) scale(${mv.scale}) rotate(${mv.rotate}) translate(-960 -540)`}>
          <rect x={-300} y={-300} width={2520} height={VP[1] + 300} fill="url(#pbCrowdSky)" />
          <rect x={-300} y={VP[1]} width={2520} height={1000} fill={walk ? "#b9b2a4" : "#18243c"} />
          {/* the far shore on the horizon */}
          <path d={`M-300 ${VP[1]} L-300 ${VP[1] - 6} Q300 ${VP[1] - 22} 700 ${VP[1] - 8} Q1100 ${VP[1] - 18} 1500 ${VP[1] - 5} Q1900 ${VP[1] - 14} 2220 ${VP[1] - 4} L2220 ${VP[1]} Z`}
            fill={walk ? "#bdb5a6" : "#2a3352"} />
          <polygon points={deck} fill={walk ? "#cdc6b8" : "#2c3242"} />
          {marks}
          {walk ? null : (
            <polygon points={pts(P(-0.35, 0, 2.5), P(0.35, 0, 2.5), P(0.35, 0.9, 1500), P(-0.35, 0.9, 1500))} fill="#3a4152" />
          )}
          {[-1, 1].map((side) => (
            <polygon key={side} points={pts(P(side * D, 0, 2.5), P(side * D, 1.1, 2.5), P(side * D, 1.1, 1500), P(side * D, 0, 1500))}
              fill={walk ? "#a39b8c" : "#232a3a"} />
          ))}
          {span}
          {gantry}
          {posts}
          {figures}
          {walk ? null : <g style={{ mixBlendMode: "screen" }}>{glows}</g>}
          {/* morning haze over the far end */}
          <rect x={-300} y={VP[1] - 120} width={2520} height={200} fill={walk ? "#efe9dc" : "#c48a86"} opacity={walk ? 0.35 : 0.12} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
