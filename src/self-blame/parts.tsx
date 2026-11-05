import React from "react";
import { clamp, hash, lerp, mix, pop, rgba, whip } from "./anim.ts";
import { EN, ZH, ZH_SERIF } from "./fonts";
import { C } from "./theme.ts";

// ------------------------------------------------------------------ layout
// A station is one place in the world; children use station-local coordinates
// (0, 0 = the station's centre, y down).
export const Station: React.FC<{ x: number; y?: number; children: React.ReactNode }> = ({ x, y = 0, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0 }}>{children}</div>
);

// One SVG canvas per station for all shapes, in the same local coordinates.
export const Canvas: React.FC<{ children: React.ReactNode; w?: number; h?: number }> = ({ children, w = 2800, h = 2600 }) => (
  <svg
    style={{ position: "absolute", left: -w / 2, top: -h / 2, overflow: "visible" }}
    width={w}
    height={h}
    viewBox={`${-w / 2} ${-h / 2} ${w} ${h}`}
  >
    {children}
  </svg>
);

// Text placed by its centre.
export const Txt: React.FC<{
  x: number;
  y: number;
  size: number;
  color?: string;
  font?: string;
  weight?: number;
  opacity?: number;
  scale?: number;
  dy?: number;
  spacing?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, size, color = C.ink, font = ZH, weight = 500, opacity = 1, scale = 1, dy = 0, spacing = 0, children, style }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(-50%, -50%) translateY(${dy}px) scale(${scale})`,
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      color,
      opacity,
      whiteSpace: "nowrap",
      letterSpacing: spacing,
      lineHeight: 1.25,
      textAlign: "center",
      ...style,
    }}
  >
    {children}
  </div>
);

// Characters that appear one by one on their own frame (typing on the grid).
// The whole line is laid out from the start, so nothing shifts while typing.
export const Typed: React.FC<{ text: string; times: number[]; s: number }> = ({ text, times, s }) => (
  <>
    {[...text].map((ch, i) => (
      <span key={i} style={{ opacity: pop(s - times[i], 3) }}>
        {ch}
      </span>
    ))}
  </>
);

// ------------------------------------------------------------------ character
export type Mood = "calm" | "flinch" | "sad" | "worried" | "happy" | "closed" | "away";

const heartPath = (cx: number, cy: number, w: number) => {
  const h = w * 0.9;
  return `M ${cx} ${cy + h * 0.42}
    C ${cx - w * 0.9} ${cy - h * 0.05}, ${cx - w * 0.45} ${cy - h * 0.72}, ${cx} ${cy - h * 0.28}
    C ${cx + w * 0.45} ${cy - h * 0.72}, ${cx + w * 0.9} ${cy - h * 0.05}, ${cx} ${cy + h * 0.42} Z`;
};
export const Heart: React.FC<{ x: number; y: number; w: number; fill: string; opacity?: number }> = ({ x, y, w, fill, opacity = 1 }) => (
  <path d={heartPath(x, y, w)} fill={fill} opacity={opacity} />
);

// A round "mochi" character. (x, y) is the point between its feet.
export const Blob: React.FC<{
  id: string;
  x: number;
  y: number;
  r?: number;
  tall?: number;
  body?: string;
  shade?: string;
  shame?: number;
  heart?: number;
  mood?: Mood;
  squash?: number;
  scale?: number;
  look?: number;
  s: number; // frame, for breathing and blinking
  seed?: number;
  flip?: boolean;
  arm?: { x: number; y: number } | null; // right hand position (local to the feet)
  shadow?: number;
  showHeart?: boolean;
}> = ({
  id,
  x,
  y,
  r = 90,
  tall = 1,
  body = C.cream,
  shade = C.creamShade,
  shame = 0,
  heart = 1,
  mood = "calm",
  squash = 0,
  scale = 1,
  look = 0,
  s,
  seed = 0,
  flip = false,
  arm = null,
  shadow = 0.28,
  showHeart = true,
}) => {
  const breathe = Math.sin((s + seed * 37) * 0.11) * 0.018;
  const rx = r * (1 + squash * 0.55 - breathe * 0.5);
  const ry = r * 0.93 * tall * (1 - squash + breathe);
  const cy = -ry;
  const eyeY = cy - ry * 0.16;
  const ex = r * 0.3;
  const lx = look * r * 0.08;
  const blink = (s + seed * 53) % 131 < 4 && mood !== "flinch" && mood !== "happy" && mood !== "closed";
  const gray = clamp(shame);
  const fill = mix(body, C.gray, gray * 0.85);
  const shadeFill = mix(shade, C.grayShade, gray * 0.85);
  const heartOn = clamp(heart) * (1 - gray * 0.7);
  const sad = mood === "sad" || mood === "worried";
  const eyeDrop = sad ? r * 0.05 : 0;
  const face = (
    <g>
      {/* blush */}
      <ellipse cx={-r * 0.5} cy={eyeY + r * 0.22} rx={r * 0.13} ry={r * 0.07} fill={C.blush} opacity={(mood === "happy" ? 0.55 : mood === "away" ? 0 : 0.28) * (1 - gray * 0.8)} />
      <ellipse cx={r * 0.5} cy={eyeY + r * 0.22} rx={r * 0.13} ry={r * 0.07} fill={C.blush} opacity={(mood === "happy" ? 0.55 : mood === "away" ? 0 : 0.28) * (1 - gray * 0.8)} />
      {/* eyes */}
      {mood === "flinch" ? (
        [-1, 1].map((d) => (
          <path
            key={d}
            d={`M ${d * ex - d * r * 0.09 + lx} ${eyeY - r * 0.07} L ${d * ex + d * r * 0.05 + lx} ${eyeY} L ${d * ex - d * r * 0.09 + lx} ${eyeY + r * 0.07}`}
            stroke={C.eye}
            strokeWidth={r * 0.045}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))
      ) : mood === "happy" || mood === "closed" ? (
        [-1, 1].map((d) => (
          <path
            key={d}
            d={
              mood === "happy"
                ? `M ${d * ex - r * 0.08 + lx} ${eyeY + r * 0.03} Q ${d * ex + lx} ${eyeY - r * 0.08} ${d * ex + r * 0.08 + lx} ${eyeY + r * 0.03}`
                : `M ${d * ex - r * 0.08 + lx} ${eyeY} Q ${d * ex + lx} ${eyeY + r * 0.07} ${d * ex + r * 0.08 + lx} ${eyeY}`
            }
            stroke={C.eye}
            strokeWidth={r * 0.04}
            fill="none"
            strokeLinecap="round"
          />
        ))
      ) : (
        [-1, 1].map((d) => (
          <ellipse
            key={d}
            cx={d * ex + lx}
            cy={eyeY + eyeDrop}
            rx={r * 0.062}
            ry={blink ? r * 0.012 : r * (sad ? 0.075 : 0.088)}
            fill={C.eye}
          />
        ))
      )}
      {/* brows when sad / worried */}
      {sad
        ? [-1, 1].map((d) => (
            <path
              key={d}
              d={`M ${d * (ex + r * 0.12) + lx} ${eyeY - r * 0.13} L ${d * (ex - r * 0.1) + lx} ${eyeY - r * (mood === "worried" ? 0.22 : 0.2)}`}
              stroke={C.eye}
              strokeWidth={r * 0.032}
              strokeLinecap="round"
              opacity={0.8}
            />
          ))
        : null}
      {/* mouth */}
      {mood === "happy" ? (
        <path d={`M ${-r * 0.13 + lx} ${eyeY + r * 0.2} Q ${lx} ${eyeY + r * 0.34} ${r * 0.13 + lx} ${eyeY + r * 0.2}`} stroke={C.eye} strokeWidth={r * 0.035} fill="none" strokeLinecap="round" />
      ) : mood === "flinch" ? (
        <ellipse cx={lx} cy={eyeY + r * 0.24} rx={r * 0.05} ry={r * 0.06} fill={C.eye} />
      ) : mood === "away" ? (
        <path d={`M ${-r * 0.08 + lx} ${eyeY + r * 0.25} L ${r * 0.06 + lx} ${eyeY + r * 0.25}`} stroke={C.eye} strokeWidth={r * 0.03} strokeLinecap="round" />
      ) : sad ? (
        <path d={`M ${-r * 0.09 + lx} ${eyeY + r * 0.29} Q ${lx} ${eyeY + r * 0.21} ${r * 0.09 + lx} ${eyeY + r * 0.29}`} stroke={C.eye} strokeWidth={r * 0.032} fill="none" strokeLinecap="round" />
      ) : (
        <path d={`M ${-r * 0.08 + lx} ${eyeY + r * 0.22} Q ${lx} ${eyeY + r * 0.29} ${r * 0.08 + lx} ${eyeY + r * 0.22}`} stroke={C.eye} strokeWidth={r * 0.032} fill="none" strokeLinecap="round" />
      )}
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${(flip ? -1 : 1) * scale} ${scale})`}>
      <defs>
        <radialGradient id={`${id}-body`} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor={shadeFill} />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.heart} stopOpacity={0.32 * heartOn} />
          <stop offset="100%" stopColor={C.heart} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={0} cy={2} rx={r * 0.95} ry={r * 0.13} fill="#000" opacity={shadow} />
      {showHeart ? <circle cx={0} cy={cy} r={r * 2.1} fill={`url(#${id}-glow)`} /> : null}
      {arm ? (
        <path
          d={`M ${r * 0.8} ${cy + ry * 0.25} Q ${(r * 0.8 + arm.x) / 2 + 10} ${(cy + ry * 0.25 + arm.y) / 2 + 20} ${arm.x} ${arm.y}`}
          stroke={shadeFill}
          strokeWidth={r * 0.17}
          strokeLinecap="round"
          fill="none"
        />
      ) : null}
      <ellipse cx={0} cy={cy} rx={rx} ry={ry} fill={`url(#${id}-body)`} />
      <ellipse cx={-rx * 0.38} cy={cy - ry * 0.48} rx={rx * 0.22} ry={ry * 0.12} fill="#fff" opacity={0.22 * (1 - gray * 0.6)} transform={`rotate(-25 ${-rx * 0.38} ${cy - ry * 0.48})`} />
      {showHeart ? (
        <Heart x={0} y={cy + ry * 0.36} w={r * 0.2} fill={mix(C.grayShade, C.heart, heartOn)} opacity={0.35 + 0.65 * heartOn} />
      ) : null}
      {face}
    </g>
  );
};

// ------------------------------------------------------------------ the cup
// Side view of a mug, cut into the pieces it breaks into. Unit: the mug is 1
// tall (y from −1 to 0) and 0.72 wide; the handle is a separate piece.
type Pt = [number, number];
export const CUP_PIECES: Pt[][] = [
  [[-0.36, -1], [-0.05, -1], [-0.12, -0.62], [-0.36, -0.55]],
  [[-0.05, -1], [0.36, -1], [0.36, -0.42], [0.08, -0.48], [-0.12, -0.62]],
  [[-0.36, -0.55], [-0.12, -0.62], [0.08, -0.48], [-0.02, 0], [-0.3, 0], [-0.36, -0.12]],
  [[0.08, -0.48], [0.36, -0.42], [0.36, -0.12], [0.3, 0], [-0.02, 0]],
];
export const CUP_CRACKS: Pt[][] = [
  [[-0.05, -1], [-0.12, -0.62], [-0.36, -0.55]],
  [[-0.12, -0.62], [0.08, -0.48], [0.36, -0.42]],
  [[0.08, -0.48], [-0.02, 0]],
];
const HANDLE = "M 0.36 -0.8 C 0.66 -0.8 0.66 -0.3 0.36 -0.3";
const centroid = (p: Pt[]): Pt => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];

// Where each piece (and the handle, index 4) comes to rest on the floor.
export const REST = [
  { x: -1.25, rot: -62 },
  { x: 0.95, rot: 74 },
  { x: -0.38, rot: 12 },
  { x: 0.42, rot: -24 },
  { x: 1.75, rot: 118 },
];

// t: 0 = whole; ≥ 1 = resting on the floor. Pieces fly on parabolas.
// mend: 0 = broken, 1 = put back together. seam: gold seams 0..1.
export const Cup: React.FC<{
  x: number;
  y: number;
  size: number;
  rot?: number;
  broken?: number; // 0..1 progress of the break (each piece has its own timing)
  mend?: number;
  seam?: number;
  color?: string;
  shade?: string;
  ring?: number; // amber guilt ring
  opacity?: number;
}> = ({ x, y, size, rot = 0, broken = 0, mend = 0, seam = 0, color = C.cup, shade = C.cupShade, ring = 0, opacity = 1 }) => {
  const k = clamp(broken) * (1 - clamp(mend));
  const pieceTransform = (i: number, c: Pt) => {
    if (k <= 0) return "";
    const rest = REST[i];
    // each piece lands a little later than the first (still within ~12 frames)
    const u = clamp(k * (1.15 + hash(i * 3.1) * 0.25));
    const dx = (rest.x - c[0]) * u;
    const arc = (0.35 + hash(i * 7.7) * 0.5) * 4 * u * (1 - u);
    const r = rest.rot * u;
    // keep the rotated piece on the floor once it lands: lift by its lowest point
    const rad = (r * Math.PI) / 180;
    const lowest = Math.max(
      ...(i < 4 ? CUP_PIECES[i] : ([[0.36, -0.8], [0.6, -0.55], [0.36, -0.3]] as Pt[])).map(
        ([px, py]) => (px - c[0]) * Math.sin(rad) + (py - c[1]) * Math.cos(rad) + c[1],
      ),
    );
    const settle = -lowest * u;
    return `translate(${dx} ${-arc + settle}) rotate(${r} ${c[0]} ${c[1]})`;
  };
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${size})`} opacity={opacity}>
      {ring > 0 ? (
        <ellipse cx={0.1} cy={-0.5} rx={0.95 + 0.6 * k} ry={0.78} fill="none" stroke={C.guilt} strokeWidth={0.05} opacity={ring} strokeDasharray={`${ring * 7} 7`} />
      ) : null}
      {CUP_PIECES.map((p, i) => {
        const c = centroid(p);
        return (
          <g key={i} transform={pieceTransform(i, c)}>
            <polygon points={p.map((q) => q.join(",")).join(" ")} fill={i % 2 ? shade : color} />
            {/* rim band and a soft highlight */}
            {i < 2 ? <rect x={i ? -0.05 : -0.36} y={-1} width={i ? 0.41 : 0.31} height={0.08} fill="#ffffff" opacity={0.25} /> : null}
          </g>
        );
      })}
      <g transform={pieceTransform(4, [0.5, -0.55])}>
        <path d={HANDLE} stroke={shade} strokeWidth={0.1} fill="none" strokeLinecap="round" />
      </g>
      {seam > 0
        ? CUP_CRACKS.map((line, i) => (
            <polyline
              key={i}
              points={line.map((q) => q.join(",")).join(" ")}
              fill="none"
              stroke={C.gold}
              strokeWidth={0.05}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={clamp(seam * 1.5 - i * 0.25)}
            />
          ))
        : null}
    </g>
  );
};

// ------------------------------------------------------------------ bubbles
// A speech bubble with a tail pointing at (tx, ty) (local to the bubble centre).
export const Bubble: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  tail: [number, number];
  fill: string;
  stroke: string;
  strokeWidth?: number;
  sharp?: boolean;
  dash?: string;
  opacity?: number;
  scale?: number;
  rot?: number;
  children?: React.ReactNode;
}> = ({ x, y, w, h, tail, fill, stroke, strokeWidth = 3, sharp = false, dash, opacity = 1, scale = 1, rot = 0, children }) => {
  const rr = sharp ? 14 : h / 2;
  const [tx, ty] = tail;
  // tail base: on the bubble edge closest to the tail tip
  const bx = clamp(tx, -w / 2 + rr + 10, w / 2 - rr - 10);
  const by = ty > 0 ? h / 2 : -h / 2;
  const half = sharp ? 18 : 16;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 0,
        height: 0,
        opacity,
        transform: `scale(${scale}) rotate(${rot}deg)`,
      }}
    >
      <svg style={{ position: "absolute", left: -w / 2 - 200, top: -h / 2 - 200, overflow: "visible" }} width={w + 400} height={h + 400} viewBox={`${-w / 2 - 200} ${-h / 2 - 200} ${w + 400} ${h + 400}`}>
        <path
          d={`M ${bx - half} ${by} L ${tx} ${ty} L ${bx + half} ${by}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin={sharp ? "miter" : "round"}
          strokeDasharray={dash}
        />
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rr} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} />
        {/* cover the seam between tail and body */}
        <path d={`M ${bx - half + 2} ${by} L ${bx + half - 2} ${by}`} stroke={fill} strokeWidth={strokeWidth + 2} />
      </svg>
      <div style={{ position: "absolute", left: 0, top: 0, transform: "translate(-50%, -50%)", textAlign: "center", whiteSpace: "nowrap" }}>{children}</div>
    </div>
  );
};

// Bilingual text block used inside bubbles and cards.
export const Two: React.FC<{
  zh: React.ReactNode;
  en: React.ReactNode;
  size?: number;
  color?: string;
  enColor?: string;
  serif?: boolean;
  weight?: number;
  enOpacity?: number;
}> = ({ zh, en, size = 44, color = C.ink, enColor = C.sub, serif = false, weight = 600, enOpacity = 1 }) => (
  <div style={{ lineHeight: 1.25 }}>
    <div style={{ fontFamily: serif ? ZH_SERIF : ZH, fontSize: size, fontWeight: weight, color }}>{zh}</div>
    <div style={{ fontFamily: EN, fontSize: Math.round(size * 0.52), fontWeight: 400, color: enColor, marginTop: size * 0.14, opacity: enOpacity }}>{en}</div>
  </div>
);

// ------------------------------------------------------------------ misc shapes
export const Floor: React.FC<{ y: number; w?: number; opacity?: number }> = ({ y, w = 1500, opacity = 0.14 }) => (
  <line x1={-w / 2} y1={y} x2={w / 2} y2={y} stroke="#ffffff" strokeOpacity={opacity} strokeWidth={2} strokeDasharray="2 10" strokeLinecap="round" />
);

// A soft pool of light on the floor / behind a character.
export const Glow: React.FC<{ id: string; x: number; y: number; r: number; color: string; opacity: number }> = ({ id, x, y, r, color, opacity }) => (
  <>
    <defs>
      <radialGradient id={id} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={color} stopOpacity={opacity} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </radialGradient>
    </defs>
    <circle cx={x} cy={y} r={r} fill={`url(#${id})`} />
  </>
);

// Arrow drawn from a to b as it grows (0..1).
export const Arrow: React.FC<{ a: Pt; b: Pt; grow: number; color?: string; width?: number; dash?: string }> = ({ a, b, grow, color = C.sub, width = 4, dash }) => {
  const g = clamp(grow);
  if (g <= 0) return null;
  const x = lerp(a[0], b[0], g);
  const y = lerp(a[1], b[1], g);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const hl = 16;
  return (
    <g>
      <line x1={a[0]} y1={a[1]} x2={x} y2={y} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dash} />
      <path
        d={`M ${x - hl * Math.cos(ang - 0.5)} ${y - hl * Math.sin(ang - 0.5)} L ${x} ${y} L ${x - hl * Math.cos(ang + 0.5)} ${y - hl * Math.sin(ang + 0.5)}`}
        stroke={color}
        strokeWidth={width}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
};

// Small pill used for chips, tags and thought chips.
export const Pill: React.FC<{
  x: number;
  y: number;
  zh: string;
  en: string;
  size?: number;
  color?: string;
  bg?: string;
  border?: string;
  opacity?: number;
  scale?: number;
  rot?: number;
}> = ({ x, y, zh, en, size = 34, color = C.ink, bg = "rgba(255,255,255,0.07)", border = "rgba(255,255,255,0.22)", opacity = 1, scale = 1, rot = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(-50%, -50%) scale(${scale}) rotate(${rot}deg)`,
      opacity,
      background: bg,
      border: `2px solid ${border}`,
      borderRadius: 999,
      padding: `${size * 0.32}px ${size * 0.7}px`,
      whiteSpace: "nowrap",
      textAlign: "center",
      lineHeight: 1.2,
    }}
  >
    <div style={{ fontFamily: ZH, fontSize: size, fontWeight: 600, color }}>{zh}</div>
    <div style={{ fontFamily: EN, fontSize: Math.round(size * 0.5), color: C.sub, marginTop: 3 }}>{en}</div>
  </div>
);

// Pop-in helper for a thing that appears on frame `at`: scale, opacity, offset.
export const appear = (s: number, at: number, bounce = 1.2, dur = 8) => {
  const t = s - at;
  return { o: pop(t), k: t < -0.75 ? 0 : 0.6 + 0.4 * whip(t, bounce, dur) };
};

export const toRgba = rgba;
