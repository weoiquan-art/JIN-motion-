import { createContext, useContext } from "react";
import { useCurrentFrame } from "remotion";
import { hash, noise1 } from "../intro/math";
import { SPAN } from "./camera";
import { HEIGHT, WIDTH } from "./timeline";

// ------------------------------------------------------------------ colour
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number) => {
  const x = hex(a);
  const y = hex(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};
export const mixHex = (a: string, b: string, t: number) => {
  const x = hex(a);
  const y = hex(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

// ------------------------------------------------------------------ paths
// Closed / open Catmull-Rom spline through points, as cubic Béziers.
export const smoothPath = (pts: [number, number][], closed = false, tension = 0.5) => {
  const n = pts.length;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.min(n - 1, Math.max(0, i))]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return closed ? d + " Z" : d;
};

// Ridge line from x0 to x1 made of value noise, closed down to `bottom`.
export const ridge = (x0: number, x1: number, base: number, amp: number, freq: number, seed: number, bottom = HEIGHT) => {
  const pts: [number, number][] = [];
  for (let x = x0; x <= x1; x += 40) {
    const n = noise1(x * freq, seed) * 0.65 + noise1(x * freq * 2.7, seed + 3) * 0.35;
    pts.push([x, base - amp * (0.5 + 0.5 * n)]);
  }
  return `${smoothPath(pts)} L${x1},${bottom} L${x0},${bottom} Z`;
};

// ------------------------------------------------------------------ strip
// Inside a scene window, layers shift by the camera offset times (1 - k):
// k = 1 moves with the near ground, k = 0 stays put on screen.
const DxContext = createContext(0);
export const DxProvider = DxContext.Provider;
export const useDx = () => useContext(DxContext);

export const Layer: React.FC<{ k: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ k, children, style }) => {
  const dx = useDx();
  return (
    <div style={{ position: "absolute", left: (SPAN - WIDTH) / 2 + dx * (1 - k), top: 0, width: WIDTH, height: HEIGHT, ...style }}>
      {children}
    </div>
  );
};

// Scene-local SVG canvas. x runs from -400 to 2320 so a layer still covers
// the window while the camera is half a scene away.
export const X0 = -400;
export const XW = WIDTH + 800;
export const Svg: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg
    width={XW}
    height={HEIGHT}
    viewBox={`${X0} 0 ${XW} ${HEIGHT}`}
    style={{ position: "absolute", left: X0, top: 0, overflow: "visible", ...style }}
  >
    {children}
  </svg>
);

// ------------------------------------------------------------------ props
// Coconut palm: curved trunk and drooping fronds, swaying slightly.
export const Palm: React.FC<{ x: number; y: number; h: number; lean?: number; color: string; seed?: number; fronds?: number }> = ({
  x,
  y,
  h,
  lean = 0.18,
  color,
  seed = 1,
  fronds = 7,
}) => {
  const f = useCurrentFrame();
  const sway = noise1(f * 0.02, seed) * 0.05 + Math.sin(f * 0.05 + seed) * 0.02;
  const tx = x + h * (lean + sway);
  const ty = y - h;
  const w = Math.max(5, h * 0.035);
  const trunk = `M${x - w},${y} Q${x + h * lean * 0.2},${y - h * 0.55} ${tx - w * 0.6},${ty} L${tx + w * 0.6},${ty} Q${x + h * lean * 0.2 + w * 1.6},${y - h * 0.55} ${x + w},${y} Z`;
  const leaves = new Array(fronds).fill(0).map((_, i) => {
    const a = -Math.PI + (i / (fronds - 1)) * Math.PI + (hash(seed * 13 + i) - 0.5) * 0.3 + sway * 2;
    const len = h * (0.42 + hash(seed * 7 + i) * 0.16);
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.45 + len * 0.42;
    const cx = tx + Math.cos(a) * len * 0.55;
    const cy = ty + Math.sin(a) * len * 0.7 - len * 0.12;
    const t = len * 0.07;
    return `M${tx},${ty} Q${cx},${cy - t} ${ex},${ey} Q${cx},${cy + t * 1.6} ${tx},${ty + t * 0.6} Z`;
  });
  return (
    <g fill={color}>
      <path d={trunk} />
      {leaves.map((d, i) => (
        <path key={i} d={d} />
      ))}
      <circle cx={tx} cy={ty + 4} r={w * 1.4} />
    </g>
  );
};

// Gull: a flapping "v" moving along a line.
export const Gull: React.FC<{ x: number; y: number; s: number; color: string; phase?: number }> = ({ x, y, s, color, phase = 0 }) => {
  const f = useCurrentFrame();
  const flap = Math.sin(f * 0.32 + phase);
  const wy = -flap * 0.55 * s;
  return (
    <path
      d={`M${x - s},${y + wy} Q${x - s * 0.45},${y - s * 0.35 + wy * 0.4} ${x},${y} Q${x + s * 0.45},${y - s * 0.35 + wy * 0.4} ${x + s},${y + wy}`}
      fill="none"
      stroke={color}
      strokeWidth={Math.max(2, s * 0.16)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
};

// Rising wisps (steam, incense, grill smoke).
export const Wisps: React.FC<{ x: number; y: number; h: number; n?: number; color: string; width?: number; seed?: number; drift?: number }> = ({
  x,
  y,
  h,
  n = 3,
  color,
  width = 6,
  seed = 1,
  drift = 0,
}) => {
  const f = useCurrentFrame();
  return (
    <g fill="none" stroke={color} strokeLinecap="round">
      {new Array(n).fill(0).map((_, i) => {
        const cycle = 46 + hash(seed + i) * 20;
        const t = ((f + hash(seed * 3 + i) * cycle) % cycle) / cycle;
        const ox = x + (i - (n - 1) / 2) * width * 2.2;
        const pts: [number, number][] = [];
        for (let k = 0; k <= 6; k++) {
          const v = k / 6;
          pts.push([ox + Math.sin(v * 5 + f * 0.08 + i * 2) * width * 1.4 + drift * v * h, y - v * h * (0.55 + t * 0.45)]);
        }
        return <path key={i} d={smoothPath(pts)} strokeWidth={width * (1 - t * 0.4)} opacity={Math.sin(Math.PI * t) * 0.8} />;
      })}
    </g>
  );
};

// Hanging string of lights / lanterns along a catenary-ish curve.
export const sagPoint = (x0: number, y0: number, x1: number, y1: number, sag: number, t: number) => ({
  x: x0 + (x1 - x0) * t,
  y: y0 + (y1 - y0) * t + sag * 4 * t * (1 - t),
});
