// Light drawn on top of the three OpenStreetMap screenshots. The coordinates
// are pixels of those exact images (traced from their colours), so an
// overlay only fits its own map: replacing c1 / c4 / c5 needs new points.

import React from "react";
import { EN, ZH_SANS } from "./fonts";
import type { Clock } from "./beats";
import { clamp, hitEnv, inv, lerp, whip } from "./anim";

type Pt = readonly [number, number];

export const MAPS = {
  // c5: George Town ⇄ Butterworth ferry routes
  ferry: {
    w: 985,
    h: 683,
    route: [[405, 305], [428, 337], [449, 371], [489, 414], [529, 450], [565, 475], [600, 497], [616, 502]] as Pt[],
  },
  // c1: the bridge from Gelugor (island) to Perai (mainland)
  bridge: {
    w: 1273,
    h: 736,
    route: [
      [184, 436], [211, 443], [264, 451], [338, 462], [405, 473], [487, 485], [562, 496], [638, 508],
      [711, 520], [759, 525], [785, 523], [838, 519], [913, 512], [986, 504], [1038, 495], [1064, 475],
    ] as Pt[],
  },
  // c4: George Town, Butterworth, Perai and the bridge
  industry: {
    w: 1062,
    h: 829,
    route: [[299, 676], [331, 687], [392, 696], [451, 705], [511, 715], [572, 724], [602, 726], [661, 720], [721, 714], [737, 707]] as Pt[],
    port: [600, 330] as Pt,
    perai: [705, 625] as Pt,
    bayan: [236, 760] as Pt,
  },
} as const;

export type MapKey = keyof typeof MAPS;

const segLengths = (pts: readonly Pt[]) => {
  const out = [0];
  for (let i = 1; i < pts.length; i++) {
    out.push(out[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return out;
};

// Point at distance d along a polyline.
const along = (pts: readonly Pt[], cum: number[], d: number): Pt => {
  const total = cum[cum.length - 1];
  const x = clamp(d, 0, total);
  let i = 1;
  while (i < cum.length - 1 && cum[i] < x) i++;
  const t = (x - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)];
};

const pathOf = (pts: readonly Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");

// A label chip drawn in image pixels; `scale` undoes the map's cover scale so
// the type stays at a constant on-screen size.
const Chip: React.FC<{
  x: number;
  y: number;
  zh: string;
  en: string;
  k: number;
  opacity: number;
  anchor?: "left" | "right";
  color: string;
}> = ({ x, y, zh, en, k, opacity, anchor = "left", color }) => (
  <g transform={`translate(${x} ${y}) scale(${1 / k})`} opacity={opacity}>
    <circle r={9} fill={color} />
    <circle r={20} fill="none" stroke={color} strokeWidth={3} opacity={0.6} />
    <g textAnchor={anchor === "left" ? "start" : "end"} fill="#ffffff" stroke="rgba(4,8,16,0.75)" strokeWidth={6}
      strokeLinejoin="round" paintOrder="stroke">
      <text x={anchor === "left" ? 32 : -32} y={-2} fontFamily={ZH_SANS} fontSize={32} fontWeight={700}>{zh}</text>
      <text x={anchor === "left" ? 32 : -32} y={26} fontFamily={EN} fontSize={19} fontWeight={600} letterSpacing="0.1em"
        opacity={0.88}>{en}</text>
    </g>
  </g>
);

export const MapOverlay: React.FC<{
  kind: MapKey;
  frame: number;
  atBeat: number;
  clock: Clock;
  k: number; // on-screen pixels per image pixel
  warm: string;
  accent: string;
}> = ({ kind, frame, atBeat, clock, k, warm, accent }) => {
  const beat = clock.beatAt(frame) - atBeat; // beats since the shot started
  const glowW = 18 / k;
  const coreW = 5 / k;

  if (kind === "ferry") {
    const { route } = MAPS.ferry;
    const cum = segLengths(route);
    const total = cum[cum.length - 1];
    // drawn over the first 6 beats, finishing on the hit at beat 6
    const p = clamp(beat / 6);
    const drawn = total * (1 - (1 - p) ** 2);
    const boatT = (beat - 6) / 4;
    const boat = along(route, cum, total * (0.5 - 0.5 * Math.cos(Math.max(0, boatT) * Math.PI)));
    const ends = [route[0], route[route.length - 1]];
    const flash = hitEnv(frame - clock.f(atBeat + 6), 10);
    return (
      <g>
        <path d={pathOf(route)} stroke={warm} strokeWidth={glowW * (1 + flash)} strokeLinecap="round" fill="none"
          opacity={0.75} strokeDasharray={`${drawn} ${total}`} style={{ filter: `blur(${6 / k}px)` }} />
        <path d={pathOf(route)} stroke="#fff3df" strokeWidth={coreW} strokeLinecap="round" fill="none"
          strokeDasharray={`${drawn} ${total}`} />
        {ends.map((e, i) => (
          <circle key={i} cx={e[0]} cy={e[1]} r={(10 + 26 * flash) / k} fill="none" stroke={accent}
            strokeWidth={3 / k} opacity={clamp(beat - i * 5.5) * (0.9 - 0.5 * flash)} />
        ))}
        {beat > 6 ? <circle cx={boat[0]} cy={boat[1]} r={7 / k} fill="#ffffff" style={{ filter: `drop-shadow(0 0 ${8 / k}px ${warm})` }} /> : null}
      </g>
    );
  }

  if (kind === "bridge") {
    const { route } = MAPS.bridge;
    const cum = segLengths(route);
    const total = cum[cum.length - 1];
    // the light jumps forward on every beat and reaches Perai on beat 7
    const steps = 7;
    let p = 0;
    for (let b = 0; b < steps; b++) p += whip((frame - clock.f(atBeat + b + 0.0)) , 0.4, 7) / steps;
    const drawn = total * clamp(p);
    const head = along(route, cum, drawn);
    const headPulse = hitEnv(frame - clock.f(atBeat + Math.floor(clamp(beat, 0, steps - 1))), 6);
    const start = route[0];
    const end = route[route.length - 1];
    return (
      <g>
        <path d={pathOf(route)} stroke={warm} strokeWidth={glowW * 1.2} strokeLinecap="round" fill="none"
          opacity={0.8} strokeDasharray={`${drawn} ${total}`} style={{ filter: `blur(${6 / k}px)` }} />
        <path d={pathOf(route)} stroke="#fff3dc" strokeWidth={coreW * 1.3} strokeLinecap="round" fill="none"
          strokeDasharray={`${drawn} ${total}`} />
        {drawn > 1 ? (
          <circle cx={head[0]} cy={head[1]} r={(8 + 10 * headPulse) / k} fill="#ffffff"
            style={{ filter: `drop-shadow(0 0 ${14 / k}px ${warm})` }} />
        ) : null}
        <Chip x={start[0]} y={start[1] - 60} zh="Gelugor" en="PENANG ISLAND" k={k} opacity={clamp(beat * 2)} color={accent} />
        <Chip x={end[0]} y={end[1] + 70} zh="Perai" en="MAINLAND" k={k} anchor="right" opacity={clamp((beat - 6) * 2)} color={accent} />
      </g>
    );
  }

  // industry: the bridge glows, then the port, the Perai industrial area and
  // the way south to Bayan Lepas light up; dots flow both ways on the beats.
  const { route, port, perai, bayan } = MAPS.industry;
  const cum = segLengths(route);
  const total = cum[cum.length - 1];
  const on = clamp(beat * 2);
  const dots: React.ReactNode[] = [];
  for (let b = -2; b < 6; b++) {
    for (const dir of [1, -1]) {
      const t = (frame - clock.f(atBeat + b)) / (clock.f(1) - clock.f(0)) / 2.2; // 2.2 beats to cross
      if (t < 0 || t > 1) continue;
      const d = dir > 0 ? total * t : total * (1 - t);
      const p = along(route, cum, d);
      const o = Math.sin(Math.PI * t);
      dots.push(<circle key={`${b}${dir}`} cx={p[0]} cy={p[1] + dir * 3 / k} r={6 / k} fill="#fff8ea" opacity={o}
        style={{ filter: `drop-shadow(0 0 ${8 / k}px ${warm})` }} />);
    }
  }
  return (
    <g>
      <path d={pathOf(route)} stroke={warm} strokeWidth={glowW * 1.2} strokeLinecap="round" fill="none"
        opacity={0.8 * on} style={{ filter: `blur(${6 / k}px)` }} />
      <path d={pathOf(route)} stroke="#fff3dc" strokeWidth={coreW * 1.2} strokeLinecap="round" fill="none" opacity={on} />
      {dots}
      <Chip x={port[0]} y={port[1]} zh="北海港口" en="BUTTERWORTH PORT" k={k} opacity={inv(0.5, 1.2, beat)} color={accent} />
      <Chip x={perai[0]} y={perai[1]} zh="Perai 工业区" en="PERAI INDUSTRIAL AREA" k={k} opacity={inv(1, 1.7, beat)} color={accent} />
      <Chip x={bayan[0]} y={bayan[1]} zh="往南：峇六拜工业区" en="BAYAN LEPAS FIZ ↓" k={k} opacity={inv(1.5, 2.2, beat)} color={accent} />
    </g>
  );
};
