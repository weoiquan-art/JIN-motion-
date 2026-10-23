// The three code-drawn shots: why the island needed a bridge (S4), the quiet
// bar before the drop (S5) and the 1985 closure of the deck (S9, standing in
// for the missing "1985" photo). They take the film beat they start on and
// time everything inside from the beat grid.

import React from "react";
import { AbsoluteFill } from "remotion";
import { smoothPath } from "../butterworth/draw";
import { ISLAND, MAINLAND, PLACES, ROUTES } from "../butterworth/geo";
import { clamp, easeIn, hitEnv, inv, lerp, noise1, pop, whip } from "./anim";
import type { Clock } from "./beats";
import { EN, ZH_SANS } from "./fonts";

type SceneProps = {
  frame: number;
  atBeat: number;
  clock: Clock;
  warm: string;
  accent: string;
};

// ---------------------------------------------------------------- the map
// Same projection idea as Butterworth's map: equirectangular × cos(lat).
const LON0 = 100.33;
const LAT0 = 5.37;
const K = 3600;
const COS = Math.cos((LAT0 * Math.PI) / 180);
const P = ([lon, lat]: readonly [number, number]): [number, number] => [
  960 + (lon - LON0) * COS * K,
  540 - (lat - LAT0) * K,
];
const ISLAND_D = smoothPath(ISLAND.map(P), true, 0.7);
const MAINLAND_D = smoothPath(MAINLAND.map(P), true, 0.6);
const GEORGE_TOWN = P(PLACES.georgeTown);
const BAYAN_LEPAS = P([100.298, 5.318]); // Bayan Lepas FIZ, east of the airport (schematic)
const BRIDGE = ROUTES.bridge.map(P).reverse(); // island end first

const MapBase: React.FC<{ dark: number; children?: React.ReactNode; cam: string }> = ({ dark, children, cam }) => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #0c1b2c 0%, #071220 60%, #03070e 100%)" }}>
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <pattern id="pbGrid" width={120} height={120} patternUnits="userSpaceOnUse">
          <path d="M120 0 L0 0 0 120" fill="none" stroke="#2c4a63" strokeWidth={1} opacity={0.35} />
        </pattern>
        <linearGradient id="pbLand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b6283" />
          <stop offset="1" stopColor="#2b4b68" />
        </linearGradient>
      </defs>
      <g transform={cam}>
        <rect x={-2000} y={-2000} width={6000} height={6000} fill="url(#pbGrid)" />
        <path d={ISLAND_D} fill="none" stroke="#3d6f8f" strokeWidth={14} opacity={0.25} strokeLinejoin="round" />
        <path d={MAINLAND_D} fill="none" stroke="#3d6f8f" strokeWidth={14} opacity={0.25} strokeLinejoin="round" />
        <path d={ISLAND_D} fill="url(#pbLand)" stroke="#b9d6e6" strokeWidth={2.5} />
        <path d={MAINLAND_D} fill="url(#pbLand)" stroke="#b9d6e6" strokeWidth={2.5} />
        {children}
      </g>
    </svg>
    <AbsoluteFill style={{ backgroundColor: "#02050b", opacity: dark }} />
  </AbsoluteFill>
);

const Label: React.FC<{ x: number; y: number; zh: string; en: string; s: number; opacity: number; anchor?: "start" | "middle" | "end" }> = ({
  x,
  y,
  zh,
  en,
  s,
  opacity,
  anchor = "middle",
}) => (
  <g transform={`translate(${x} ${y}) scale(${1 / s})`} opacity={opacity} textAnchor={anchor}>
    <text y={0} fontFamily={ZH_SANS} fontSize={34} fontWeight={700} fill="#e8f1f7" letterSpacing="0.12em">{zh}</text>
    <text y={30} fontFamily={EN} fontSize={18} fontWeight={600} fill="#9fbfd1" letterSpacing="0.22em">{en}</text>
  </g>
);

const Factory: React.FC<{ x: number; y: number; s: number; t: number; color: string }> = ({ x, y, s, t, color }) => {
  const k = pop(t);
  if (k <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${(k * 0.9 + 0.1 * whip(t, 1.6, 7)) / s})`} opacity={clamp(k)}>
      <path d="M-26 18 L-26 -6 L-12 2 L-12 -6 L2 2 L2 -24 L12 -24 L12 2 L26 2 L26 18 Z" fill={color} />
      <rect x={-20} y={6} width={6} height={6} fill="#0a1726" />
      <rect x={-6} y={6} width={6} height={6} fill="#0a1726" />
      <rect x={8} y={6} width={6} height={6} fill="#0a1726" />
    </g>
  );
};

// Camera for the map scenes: focus point (map px) shown at a screen point.
const camera = (fx: number, fy: number, sx: number, sy: number, s: number) =>
  `translate(${sx} ${sy}) scale(${s}) translate(${-fx} ${-fy})`;

// ------------------------------------------------- S4: why build a bridge
export const WhyScene: React.FC<SceneProps> = ({ frame, atBeat, clock, warm, accent }) => {
  const at = (b: number) => clock.f(atBeat + b);
  const b = clock.beatAt(frame) - atBeat;
  // bar 1: whole island, slow push. bar 2: whip towards Bayan Lepas.
  const go = whip(frame - at(4), 0.25, 14);
  const s = lerp(1.0 + 0.05 * clamp(b / 4), 1.85, go);
  const fx = lerp(1010, BAYAN_LEPAS[0], go);
  const fy = lerp(560, BAYAN_LEPAS[1], go);
  const sx = lerp(980, 1240, go);
  const sy = lerp(540, 470, go);
  const strike = whip(frame - at(2), 0, 6);
  const stampIn = pop(frame - at(0.5));
  const bl = hitEnv(frame - at(4), 14);
  const stamp: [number, number] = [GEORGE_TOWN[0] + 210, GEORGE_TOWN[1] - 120];
  return (
    <MapBase dark={0} cam={camera(fx, fy, sx, sy, s)}>
      <Label x={P([100.255, 5.36])[0]} y={P([100.255, 5.36])[1]} zh="槟城岛" en="PENANG ISLAND" s={s} opacity={0.9 * (1 - go)} />
      <Label x={P([100.5, 5.42])[0]} y={P([100.5, 5.42])[1]} zh="威省" en="SEBERANG PERAI" s={s} opacity={0.9 * (1 - go)} />
      {/* George Town and the free-port stamp */}
      <circle cx={GEORGE_TOWN[0]} cy={GEORGE_TOWN[1]} r={9} fill={accent} opacity={1 - go} />
      <path d={`M${GEORGE_TOWN[0]} ${GEORGE_TOWN[1]} L${stamp[0] - 120} ${stamp[1] + 34}`} stroke={accent} strokeWidth={2}
        opacity={(1 - go) * stampIn} />
      <g transform={`translate(${stamp[0]} ${stamp[1]}) rotate(-8) scale(${0.8 + 0.2 * stampIn})`} opacity={stampIn * (1 - go)}>
        <rect x={-150} y={-62} width={300} height={124} rx={10} fill="none" stroke={strike > 0 ? "#c94b3c" : accent}
          strokeWidth={6} opacity={1 - 0.45 * strike} />
        <text y={-6} textAnchor="middle" fontFamily={EN} fontSize={46} fontWeight={800} letterSpacing="0.12em"
          fill={accent} opacity={1 - 0.55 * strike}>FREE PORT</text>
        <text y={40} textAnchor="middle" fontFamily={ZH_SANS} fontSize={34} fontWeight={700} letterSpacing="0.5em"
          fill={accent} opacity={1 - 0.55 * strike}>自由港</text>
        <line x1={-170} y1={50} x2={lerp(-170, 170, strike)} y2={lerp(50, -50, strike)} stroke="#e0533f"
          strokeWidth={12} strokeLinecap="round" />
      </g>
      <text x={GEORGE_TOWN[0] - 20} y={GEORGE_TOWN[1] + 6} textAnchor="end" fontFamily={EN} fontSize={22} fontWeight={600}
        fill="#e8f1f7" letterSpacing="0.1em" opacity={1 - go}>GEORGE TOWN</text>
      {/* Bayan Lepas lights up, factories pop on the beats of bar 2 */}
      <circle cx={BAYAN_LEPAS[0]} cy={BAYAN_LEPAS[1]} r={(16 + 40 * bl) / s} fill="none" stroke={warm} strokeWidth={4 / s}
        opacity={go * (0.5 + 0.5 * bl)} />
      <circle cx={BAYAN_LEPAS[0]} cy={BAYAN_LEPAS[1]} r={7 / s} fill={warm} opacity={go} />
      {[
        [-46, -18],
        [14, -44],
        [52, 4],
        [-8, 38],
      ].map(([dx, dy], i) => (
        <Factory key={i} x={BAYAN_LEPAS[0] + dx / s * 1.4} y={BAYAN_LEPAS[1] + dy / s * 1.4} s={s} t={frame - at(4 + i)} color="#f1dcb8" />
      ))}
      <Label x={BAYAN_LEPAS[0] + 120 / s} y={BAYAN_LEPAS[1] + 80 / s} zh="峇六拜" en="BAYAN LEPAS" s={s} opacity={inv(4.5, 5.2, b)} anchor="start" />
    </MapBase>
  );
};

// ---------------------------------------- S5: the quiet bar before the drop
export const NeedScene: React.FC<SceneProps> = ({ frame, atBeat, clock, warm }) => {
  const at = (b: number) => clock.f(atBeat + b);
  const p = inv(at(0), at(3.85), frame);
  const s = lerp(2.3, 2.55, p);
  const mid: [number, number] = [(BRIDGE[0][0] + BRIDGE[1][0]) / 2, (BRIDGE[0][1] + BRIDGE[1][1]) / 2];
  const len = Math.hypot(BRIDGE[1][0] - BRIDGE[0][0], BRIDGE[1][1] - BRIDGE[0][1]);
  const drawn = len * easeIn(p) * 0.92 + len * 0.08 * p;
  const glow = 0.25 + 0.75 * easeIn(p);
  const flicker = 0.85 + 0.15 * noise1(frame / 3, 4);
  return (
    <MapBase dark={0.45 - 0.15 * p} cam={camera(mid[0], mid[1], 960, 720, s)}>
      <path d={`M${BRIDGE[0][0]} ${BRIDGE[0][1]} L${BRIDGE[1][0]} ${BRIDGE[1][1]}`} stroke={warm} strokeWidth={10 / s}
        strokeLinecap="round" strokeDasharray={`${drawn} ${len}`} opacity={0.5 * glow * flicker}
        style={{ filter: `blur(${6 / s}px)` }} />
      <path d={`M${BRIDGE[0][0]} ${BRIDGE[0][1]} L${BRIDGE[1][0]} ${BRIDGE[1][1]}`} stroke="#fff4e0" strokeWidth={2.6 / s}
        strokeLinecap="round" strokeDasharray={`${4 / s} ${7 / s}`} opacity={glow}
        style={{ clipPath: `inset(0 ${100 - (drawn / len) * 100}% 0 0)` }} />
      <circle cx={BRIDGE[0][0] + ((BRIDGE[1][0] - BRIDGE[0][0]) * drawn) / len}
        cy={BRIDGE[0][1] + ((BRIDGE[1][1] - BRIDGE[0][1]) * drawn) / len} r={(4 + 8 * glow) / s} fill="#ffffff"
        style={{ filter: `drop-shadow(0 0 ${12 / s}px ${warm})` }} />
    </MapBase>
  );
};

// -------------------------------- S9: 1985, the last deck segment closes
const DECK_Y = 740;
const SEA_Y = 880;
const PYLONS = [600, 1320];
const MID = 960;
// Cantilever tips on the beats of the first bar (gap to the centre, px).
const GAPS = [360, 230, 130, 60, 0];

const Pylon: React.FC<{ x: number; color: string }> = ({ x, color }) => (
  <g>
    <path d={`M${x - 20} ${SEA_Y} L${x - 13} 430 L${x - 9} 368 L${x} 298 L${x + 9} 368 L${x + 13} 430 L${x + 20} ${SEA_Y} Z`}
      fill="#0d1a2c" stroke={color} strokeWidth={2.5} />
    <path d={`M${x - 13} 430 L${x + 13} 430`} stroke={color} strokeWidth={2} />
    <rect x={x - 34} y={DECK_Y + 6} width={68} height={16} fill="#0d1a2c" stroke={color} strokeWidth={2} />
  </g>
);

export const ClosureScene: React.FC<SceneProps> = ({ frame, atBeat, clock, warm }) => {
  const at = (b: number) => clock.f(atBeat + b);
  const b = clock.beatAt(frame) - atBeat;
  // gap left between the two cantilever tips
  let gap = GAPS[0];
  for (let i = 1; i < GAPS.length; i++) gap = lerp(gap, GAPS[i], whip(frame - at(i - 1 + (i === GAPS.length - 1 ? 1 : 0)), 0.2, 6));
  const closed = whip(frame - at(4), 0, 4);
  const burst = hitEnv(frame - at(4), 16);
  // a slow push only: the picture does not jump on the beats (JIN's note)
  const s = lerp(1.0, 1.07, inv(at(0), at(8), frame));
  const left = MID - gap / 2;
  const right = MID + gap / 2;
  const line = "#f6dcb4";
  const cables: React.ReactNode[] = [];
  for (const px of PYLONS) {
    for (let i = 0; i < 9; i++) {
      const ay = 380 + i * 13;
      const reach = 42 + i * 38;
      for (const dir of [-1, 1]) {
        const dx = px + dir * reach;
        const towardsMid = (dir > 0 && px < MID) || (dir < 0 && px > MID);
        const built = !towardsMid || (px < MID ? dx <= left + 1 : dx >= right - 1);
        if (!built) continue;
        cables.push(<line key={`${px}${i}${dir}`} x1={px + dir * 4} y1={ay} x2={dx} y2={DECK_Y} stroke={line} strokeWidth={1.4} opacity={0.75} />);
      }
    }
  }
  const lamps: React.ReactNode[] = [];
  for (let x = 90; x < 1920; x += 70) {
    const d = Math.abs(x - MID) / 960; // 0 at the centre
    const on = clamp((b - 4 - d * 3.5) * 3);
    lamps.push(<circle key={x} cx={x} cy={DECK_Y - 16} r={3.2} fill="#fff1d6" opacity={on}
      style={{ filter: on > 0 ? `drop-shadow(0 0 6px ${warm})` : undefined }} />);
  }
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#060d1c 0%, #111f3d 50%, #3b2b48 76%, #a2563f 81.4%, #070d19 81.5%, #04070f 100%)" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(960 660) scale(${s}) translate(-960 -660)`}>
          {/* glow on the horizon */}
          <ellipse cx={MID} cy={SEA_Y} rx={900} ry={60} fill={warm} opacity={0.18 + 0.4 * burst} style={{ filter: "blur(30px)" }} />
          {/* sea shimmer */}
          {Array.from({ length: 22 }).map((_, i) => {
            const y = SEA_Y + 10 + i * i * 0.65;
            const w = 120 + i * 40;
            const x = MID + noise1(i * 3.1 + frame / 40, 7) * 140;
            return <rect key={i} x={x - w / 2} y={y} width={w} height={2 + i * 0.12} fill={warm} opacity={(0.16 - i * 0.006) * (1 + 3 * burst)} />;
          })}
          {/* approach piers and side spans (already built) */}
          {[100, 220, 340, 460, 1460, 1580, 1700, 1820].map((x) => (
            <rect key={x} x={x - 7} y={DECK_Y + 10} width={14} height={SEA_Y - DECK_Y - 10} fill="#0d1a2c" stroke={line} strokeWidth={1.5} />
          ))}
          <line x1={0} y1={DECK_Y} x2={PYLONS[0]} y2={DECK_Y} stroke={line} strokeWidth={5} />
          <line x1={PYLONS[1]} y1={DECK_Y} x2={1920} y2={DECK_Y} stroke={line} strokeWidth={5} />
          {/* the cantilevers growing towards each other */}
          <line x1={PYLONS[0]} y1={DECK_Y} x2={left} y2={DECK_Y} stroke={line} strokeWidth={5} />
          <line x1={right} y1={DECK_Y} x2={PYLONS[1]} y2={DECK_Y} stroke={line} strokeWidth={5} />
          {cables}
          {PYLONS.map((x) => (
            <Pylon key={x} x={x} color={line} />
          ))}
          {/* the gap closes on the downbeat */}
          <circle cx={MID} cy={DECK_Y} r={8 + 70 * burst} fill="#fffaf0" opacity={closed * (0.35 + 0.65 * burst)}
            style={{ filter: `blur(${4 + 18 * burst}px)` }} />
          <line x1={MID - 140 - 700 * burst} y1={DECK_Y} x2={MID + 140 + 700 * burst} y2={DECK_Y} stroke="#ffffff"
            strokeWidth={2 + 6 * burst} opacity={burst * 0.9} style={{ filter: "blur(3px)" }} />
          {lamps}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

