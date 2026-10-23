// The ferry years, drawn as old tinted postcards:
//   FerryScene – an old steam ferry crosses in front of the George Town
//                waterfront; the funnel puffs smoke on every beat (1894)
//   JettyScene – the ferry terminal from above: on every beat another row of
//                cars joins the queue for the ferry, and the queue grows past
//                the edge of the frame ("码头越来越挤")
// The ships, buildings and cars are generic, not any particular vessel or
// terminal.

import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp, hash, lerp, noise1, whip } from "./anim";
import type { SceneProps } from "./scenes";
import type { Move } from "./schema";

const layer = (mv: Move, k: number) =>
  `translate(${mv.x * k} ${mv.y * k}) translate(960 540) scale(${1 + (mv.scale - 1) * k}) translate(-960 -540)`;

// ------------------------------------------------------------ the ferry
const HORIZON = 640;
const WATERLINE = 830;
const SEPIA_INK = "#3a2c24";

// George Town's waterfront as a row of shophouses, a clock tower and trees.
const Waterfront: React.FC = () => {
  const blocks: React.ReactNode[] = [];
  let x = -120;
  for (let i = 0; x < 1500; i++) {
    const w = 46 + hash(i * 3.1) * 70;
    const h = 22 + hash(i * 5.7) * 34;
    const roof = hash(i * 1.9) > 0.5;
    blocks.push(
      <g key={i}>
        <rect x={x} y={HORIZON - h} width={w} height={h} fill="#9a7f68" />
        {roof ? <path d={`M${x - 3} ${HORIZON - h} L${x + w / 2} ${HORIZON - h - 12} L${x + w + 3} ${HORIZON - h} Z`} fill="#7c624f" /> : null}
        {Array.from({ length: Math.floor(w / 14) }).map((_, k) => (
          <rect key={k} x={x + 5 + k * 14} y={HORIZON - h + 7} width={6} height={9} fill="#6e5646" opacity={0.8} />
        ))}
      </g>,
    );
    x += w + 2;
  }
  const trees: React.ReactNode[] = [];
  for (let i = 0; i < 16; i++) {
    const tx = 40 + i * 95 + hash(i * 7.7) * 40;
    const r = 14 + hash(i * 2.3) * 14;
    trees.push(<circle key={i} cx={tx} cy={HORIZON - 30 - hash(i * 4.4) * 10} r={r} fill="#857659" opacity={0.85} />);
  }
  return (
    <g>
      {trees}
      {blocks}
      {/* a clock tower */}
      <rect x={612} y={HORIZON - 150} width={34} height={150} fill="#8c725d" />
      <circle cx={629} cy={HORIZON - 118} r={11} fill="#e8d8bc" />
      <path d="M606 490 Q629 452 652 490 Z" fill="#7c624f" />
      {/* the jetty, on piles */}
      <rect x={1180} y={HORIZON - 4} width={560} height={8} fill="#6e5646" />
      {Array.from({ length: 18 }).map((_, i) => (
        <rect key={i} x={1186 + i * 31} y={HORIZON} width={4} height={18} fill="#6e5646" />
      ))}
    </g>
  );
};

// An old single-funnel steam ferry, bow to the right, waterline at y = 0.
const SteamFerry: React.FC<{ frame: number }> = ({ frame }) => {
  const people: React.ReactNode[] = [];
  for (let i = 0; i < 26; i++) {
    const px = -230 + i * 18 + hash(i * 3.3) * 6;
    people.push(<circle key={i} cx={px} cy={-118 - hash(i * 1.7) * 3} r={4.4} fill={SEPIA_INK} />);
    if (hash(i * 9.1) > 0.6) people.push(<ellipse key={`h${i}`} cx={px} cy={-123} rx={7} ry={2} fill={SEPIA_INK} />);
  }
  const flag = noise1(frame / 6, 2);
  return (
    <g>
      {/* hull */}
      <path d="M-330 -64 L330 -64 Q370 -58 384 -40 L352 0 L-318 0 Q-344 -28 -330 -64 Z" fill={SEPIA_INK} />
      <rect x={-326} y={-70} width={668} height={8} fill="#5b4638" />
      {/* the covered deck: white cabin with windows, posts holding the awning */}
      <rect x={-262} y={-112} width={500} height={44} fill="#e6d8be" />
      {Array.from({ length: 18 }).map((_, i) => (
        <rect key={i} x={-248 + i * 27} y={-102} width={15} height={18} rx={2} fill="#5b4638" />
      ))}
      <rect x={-280} y={-142} width={540} height={8} fill={SEPIA_INK} />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={-276 + i * 48} y={-136} width={3} height={24} fill={SEPIA_INK} />
      ))}
      {people}
      {/* funnel and mast */}
      <rect x={40} y={-238} width={34} height={100} fill={SEPIA_INK} />
      <rect x={40} y={-220} width={34} height={12} fill="#a5452f" />
      <line x1={250} y1={-142} x2={250} y2={-262} stroke={SEPIA_INK} strokeWidth={4} />
      <path d={`M250 -262 Q${276} ${-258 + flag * 4} ${302} ${-256 + flag * 6} L${300} ${-240 + flag * 6} Q${276} ${-242 + flag * 4} 250 -246 Z`}
        fill="#a5452f" />
      <line x1={-300} y1={-142} x2={250} y2={-262} stroke={SEPIA_INK} strokeWidth={1.2} opacity={0.7} />
      <line x1={250} y1={-262} x2={360} y2={-64} stroke={SEPIA_INK} strokeWidth={1.2} opacity={0.7} />
    </g>
  );
};

export const FerryScene: React.FC<SceneProps> = ({ frame, b, beats, at, mv }) => {
  const shipX = lerp(520, 1020, clamp(b / beats));
  const bob = noise1(frame / 22, 4) * 3;
  // a puff of smoke on every beat, drifting back and up
  const puffs: React.ReactNode[] = [];
  for (let k = -3; k <= Math.floor(b); k++) {
    const t = frame - at(k);
    if (t < -0.75) continue;
    const age = t / 30; // seconds
    if (age > 2.4) continue;
    const grow = whip(t, 0.2, 10);
    for (let j = 0; j < 4; j++) {
      const r = (16 + j * 7) * (0.4 + 0.9 * grow) * (1 + age * 0.9);
      const dx = -age * 150 - j * 14 + noise1(k * 3 + j, 5) * 10;
      const dy = -age * 70 - j * 10;
      puffs.push(<circle key={`${k}${j}`} cx={shipX + 66 + dx} cy={WATERLINE - 280 + dy + bob} r={r} fill="#efe4d2" opacity={clamp(0.75 - age * 0.32)} />);
    }
  }
  const foam: React.ReactNode[] = [];
  for (let i = 0; i < 30; i++) {
    const fx = shipX - 330 - i * 22 + noise1(i + frame / 5, 2) * 8;
    foam.push(<rect key={i} x={fx} y={WATERLINE - 3 + (i % 3) * 3} width={26 + i * 1.5} height={2.4} rx={1} fill="#f4ead8"
      opacity={clamp(0.8 - i * 0.026)} />);
  }
  const sparkle: React.ReactNode[] = [];
  for (let i = 0; i < 70; i++) {
    const y = HORIZON + 8 + Math.pow(hash(i * 2.7), 1.6) * 420;
    const x = hash(i * 5.3) * 2100 - 90 + noise1(i + frame / 30, 3) * 20;
    sparkle.push(<rect key={i} x={x} y={y} width={20 + hash(i * 7.1) * 60} height={1.6 + (y - HORIZON) / 300} fill="#f3e6cc"
      opacity={0.18 + 0.25 * Math.abs(noise1(i * 1.3 + frame / 12, 8))} />);
  }
  const gulls = [0, 1, 2].map((i) => {
    const gx = 300 + i * 260 + frame * (1.4 + i * 0.4);
    const gy = 260 + i * 40 + Math.sin(frame / 18 + i) * 8;
    const f = (Math.sin(frame / 3.2 + i * 2) + 1) / 2;
    return (
      <path key={i} d={`M${gx - 16} ${gy - 4 - 6 * f} Q${gx - 8} ${gy - 1} ${gx} ${gy} Q${gx + 8} ${gy - 1} ${gx + 16} ${gy - 4 - 6 * f}`} fill="none"
        stroke={SEPIA_INK} strokeWidth={2.2} strokeLinecap="round" />
    );
  });
  return (
    <AbsoluteFill style={{ backgroundColor: "#2a211b" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="pbOldSky" x1="0" y1="0" x2="0" y2={HORIZON} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#c99c74" />
            <stop offset="0.55" stopColor="#e6c49c" />
            <stop offset="1" stopColor="#f3dcba" />
          </linearGradient>
          <linearGradient id="pbOldSea" x1="0" y1={HORIZON} x2="0" y2={1080} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#c7b294" />
            <stop offset="0.35" stopColor="#8d7f6c" />
            <stop offset="1" stopColor="#4e4640" />
          </linearGradient>
        </defs>
        <g transform={layer(mv, 0.2)}>
          <rect x={-300} y={-300} width={2520} height={HORIZON + 300} fill="url(#pbOldSky)" />
          {[
            [420, 300, 520, 40],
            [1300, 240, 640, 50],
            [900, 380, 760, 26],
          ].map(([x, y, w, h], i) => (
            <ellipse key={i} cx={x + 20 * mv.x * 0.01} cy={y} rx={w / 2} ry={h} fill="#f1dcbc" opacity={0.55} />
          ))}
        </g>
        {/* Penang Hill behind the town */}
        <g transform={layer(mv, 0.35)}>
          <path d={`M-300 ${HORIZON} L-300 560 Q100 430 420 470 Q700 500 980 545 Q1200 580 1500 610 L1500 ${HORIZON} Z`} fill="#bea084" opacity={0.85} />
        </g>
        <g transform={layer(mv, 0.55)}>
          <Waterfront />
        </g>
        <g transform={layer(mv, 1)}>
          <rect x={-300} y={HORIZON} width={2520} height={800} fill="url(#pbOldSea)" />
          {sparkle}
          {/* the town mirrored in the water */}
          <rect x={-300} y={HORIZON + 2} width={1800} height={26} fill="#8d7461" opacity={0.25} />
        </g>
        <g transform={layer(mv, 1.1)}>
          {puffs}
          <g transform={`translate(${shipX} ${WATERLINE + bob}) scale(1.15)`}>
            <SteamFerry frame={frame} />
          </g>
          <rect x={shipX - 330} y={WATERLINE + 2} width={700} height={24} fill={SEPIA_INK} opacity={0.22} />
          {foam}
          <path d={`M${shipX + 352} ${WATERLINE} q30 -8 60 0`} stroke="#f4ead8" strokeWidth={3} fill="none" opacity={0.8} />
        </g>
        <g transform={layer(mv, 0.8)}>{gulls}</g>
      </svg>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------ the jetty
// Seen from straight above. y grows away from the ferry, down the queue.
const LANES = [770, 890, 1010, 1130];
const ROW0 = 470; // first row of the queue, just below the ramp
const ROW_GAP = 116;
const CAR_COLORS = ["#e8dcc0", "#4f8a88", "#b5483a", "#c89a3c", "#7aa6c2", "#f0ece4", "#7a7a4a", "#9a6a8a"];

const CarTop: React.FC<{ x: number; y: number; color: string }> = ({ x, y, color }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-25} y={-44} width={50} height={92} rx={12} fill="#2a2420" opacity={0.35} transform="translate(5 6)" />
    <rect x={-25} y={-46} width={50} height={92} rx={12} fill={color} />
    <rect x={-19} y={-30} width={38} height={14} rx={4} fill="#2e3a40" opacity={0.85} />
    <rect x={-18} y={-14} width={36} height={34} rx={5} fill="#ffffff" opacity={0.16} />
    <rect x={-17} y={22} width={34} height={10} rx={3} fill="#2e3a40" opacity={0.75} />
  </g>
);

export const JettyScene: React.FC<SceneProps> = ({ frame, at, mv }) => {
  // rows already waiting when the shot starts, then three more on every beat
  const startRows = 7;
  const rows: { r: number; arrive: number }[] = [];
  for (let r = 0; r < startRows; r++) rows.push({ r, arrive: -100 });
  for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) rows.push({ r: startRows + k * 3 + j, arrive: k + j * 0.08 });
  const cars: React.ReactNode[] = [];
  for (const { r, arrive } of rows) {
    LANES.forEach((lx, li) => {
      if (hash(r * 7.3 + li * 1.9) < 0.12) return; // the odd gap
      const t = frame - at(arrive) - li * 1.2;
      if (arrive > -50 && t < -0.75) return;
      const slide = arrive > -50 ? whip(t, 0.15, 12) : 1;
      const y = ROW0 + r * ROW_GAP + (1 - slide) * 420;
      const x = lx + noise1(r * 2.1 + li, 4) * 6;
      cars.push(<CarTop key={`${r}${li}`} x={x} y={y} color={CAR_COLORS[Math.floor(hash(r * 3.7 + li * 5.1) * CAR_COLORS.length)]} />);
    });
  }
  const ripples: React.ReactNode[] = [];
  for (let i = 0; i < 40; i++) {
    const y = 130 + hash(i * 2.2) * 230;
    const x = hash(i * 4.4) * 2000 - 40 + noise1(i + frame / 25, 3) * 14;
    ripples.push(<rect key={i} x={x} y={y} width={30 + hash(i * 6.1) * 50} height={2} rx={1} fill="#e8eef0" opacity={0.28} />);
  }
  const deckCars: React.ReactNode[] = [];
  for (let i = 0; i < 10; i++) {
    const cx = 690 + i * 62;
    for (const cy of [218, 286]) {
      deckCars.push(<rect key={`${i}${cy}`} x={cx - 22} y={cy - 24} width={44} height={48} rx={8}
        fill={CAR_COLORS[Math.floor(hash(i * 2.9 + cy) * CAR_COLORS.length)]} />);
    }
  }
  return (
    <AbsoluteFill style={{ backgroundColor: "#4e4640" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <g transform={layer(mv, 1)}>
          {/* water, with the ferry tied up at the end of the ramp */}
          <rect x={-300} y={-600} width={2520} height={1000} fill="#6f8a8c" />
          {ripples}
          <rect x={560} y={150} width={800} height={200} rx={90} fill="#3a2c24" />
          <rect x={572} y={160} width={776} height={180} rx={84} fill="#d9ccb2" />
          {deckCars}
          <rect x={900} y={192} width={120} height={116} rx={10} fill="#efe4cc" stroke="#8c7a64" strokeWidth={3} />
          {/* quay, ramp and the queueing lanes */}
          <rect x={-300} y={360} width={2520} height={2600} fill="#8a8176" />
          <rect x={860} y={330} width={200} height={80} fill="#a09684" />
          {LANES.map((x) => (
            <line key={x} x1={x + 60} y1={420} x2={x + 60} y2={3000} stroke="#e8e0d0" strokeWidth={4} strokeDasharray="40 36" opacity={0.6} />
          ))}
          <line x1={LANES[0] - 60} y1={420} x2={LANES[0] - 60} y2={3000} stroke="#e8e0d0" strokeWidth={5} opacity={0.7} />
          {/* the terminal roof on the left, trees on the right */}
          <rect x={120} y={400} width={470} height={330} fill="#7a5a48" />
          <line x1={120} y1={565} x2={590} y2={565} stroke="#5e4436" strokeWidth={6} />
          {Array.from({ length: 9 }).map((_, i) => (
            <circle key={i} cx={1340 + (i % 3) * 120 + hash(i * 3.3) * 30} cy={470 + Math.floor(i / 3) * 210 + hash(i * 5.5) * 40}
              r={58 + hash(i * 1.1) * 18} fill="#6c7a52" opacity={0.95} />
          ))}
          {cars}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
