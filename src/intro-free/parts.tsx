import type { CSSProperties } from "react";
import { clamp, hash, pop } from "./anim.ts";
import { FRAMES_PER_BEAT, HEIGHT, WIDTH } from "./beat.ts";
import { NO_SHAKE, type Pose, type Shake } from "./camera.ts";
import { ZH } from "./fonts";
import { cellOn } from "./pixels.ts";
import { C } from "./theme.ts";

// Absolutely positioned and centred on a world point.
export const at = (x: number, y: number, extra = ""): CSSProperties => ({
  position: "absolute",
  left: x,
  top: y,
  transform: `translate(-50%, -50%) ${extra}`,
  whiteSpace: "pre",
});

// Dot grid that belongs to the world: drawn in screen space from the camera so
// it pans, zooms and rotates with everything else.
export const DotGrid: React.FC<{ cam: Pose; sh?: Shake; color?: string; step?: number }> = ({
  cam,
  sh = NO_SHAKE,
  color = "rgba(255,255,255,0.07)",
  step = 80,
}) => {
  const st = step * cam.z;
  const size = 3600;
  const ox = (((size / 2 - cam.x * cam.z) % st) + st) % st;
  const oy = (((size / 2 - cam.y * cam.z) % st) + st) % st;
  const dot = clamp(1.4 * cam.z, 0.9, 3.4);
  return (
    <div
      style={{
        position: "absolute",
        left: WIDTH / 2 - size / 2 + sh.sx,
        top: HEIGHT / 2 - size / 2 + sh.sy,
        width: size,
        height: size,
        transform: `rotate(${cam.r + sh.sr}deg)`,
        backgroundImage: `radial-gradient(circle, ${color} ${dot}px, transparent ${dot + 0.7}px)`,
        backgroundSize: `${st}px ${st}px`,
        backgroundPosition: `${ox - st / 2}px ${oy - st / 2}px`,
      }}
    />
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${strength}) 100%)`,
    }}
  />
);

// Text cursor that blinks on the beat (on for the first half of every beat),
// solid while typing.
export const cursorOn = (s: number, solidUntil: number) =>
  s < solidUntil || ((s % FRAMES_PER_BEAT) + FRAMES_PER_BEAT) % FRAMES_PER_BEAT < FRAMES_PER_BEAT / 2;

const CursorBar: React.FC<{ color: string; visible: boolean }> = ({ color, visible }) => (
  <span style={{ display: "inline-block", position: "relative", width: 0, height: "1em" }}>
    <span
      style={{
        position: "absolute",
        left: "0.06em",
        top: "-0.02em",
        width: "0.075em",
        height: "1.04em",
        background: color,
        opacity: visible ? 1 : 0,
      }}
    />
  </span>
);

// A line typed one character at a time, each character landing on its own
// grid time (times[i]). Layout is fixed from the start (unseen characters are
// transparent), so nothing shifts while typing.
export const TypeLine: React.FC<{
  text: string;
  times: number[];
  s: number;
  style?: CSSProperties;
  highlight?: { text: string; color: string };
  cursor?: { color: string; from: number; solidUntil: number; until?: number };
  charStyle?: (i: number) => CSSProperties | undefined;
}> = ({ text, times, s, style, highlight, cursor, charStyle }) => {
  const chars = [...text];
  const hiStart = highlight ? text.indexOf(highlight.text) : -1;
  const hiFrom = hiStart < 0 ? -1 : [...text.slice(0, hiStart)].length;
  const hiTo = hiFrom < 0 ? -1 : hiFrom + [...(highlight as { text: string }).text].length;
  const shown = times.filter((t) => s >= t - 0.25).length;
  const showCursor = cursor && s >= cursor.from && (cursor.until === undefined || s < cursor.until);
  return (
    <div style={{ display: "flex", alignItems: "center", whiteSpace: "pre", lineHeight: 1, fontFamily: ZH, ...style }}>
      {showCursor && shown === 0 ? <CursorBar color={cursor.color} visible={cursorOn(s, cursor.solidUntil)} /> : null}
      {chars.map((ch, i) => {
        const p = pop(s - times[i]);
        const color = i >= hiFrom && i < hiTo ? (highlight as { color: string }).color : undefined;
        return (
          <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
            <span
              style={{
                display: "inline-block",
                opacity: p,
                color,
                transform: `translateY(${(1 - p) * 0.14}em) scale(${1 + (1 - p) * 0.35})`,
                ...charStyle?.(i),
              }}
            >
              {ch}
            </span>
            {showCursor && i === shown - 1 ? (
              <CursorBar color={cursor.color} visible={cursorOn(s, cursor.solidUntil)} />
            ) : null}
          </span>
        );
      })}
    </div>
  );
};

// A 16×16 bitmap drawn cell by cell. `alpha(r, c, on)` decides each cell's
// opacity, so the same component draws noise, denoising and partial glyphs.
export const PixelGlyph: React.FC<{
  bitmap: string[];
  cell: number;
  gap?: number;
  color: string;
  alpha?: (r: number, c: number, on: boolean) => number;
  style?: CSSProperties;
}> = ({ bitmap, cell, gap = 1, color, alpha, style }) => {
  const n = bitmap.length;
  const cells = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const on = cellOn(bitmap, r, c);
      const a = alpha ? alpha(r, c, on) : on ? 1 : 0;
      if (a <= 0.01) continue;
      cells.push(
        <div
          key={r * n + c}
          style={{
            position: "absolute",
            left: c * cell + gap / 2,
            top: r * cell + gap / 2,
            width: cell - gap,
            height: cell - gap,
            background: color,
            opacity: clamp(a),
          }}
        />,
      );
    }
  }
  return <div style={{ position: "relative", width: n * cell, height: n * cell, ...style }}>{cells}</div>;
};

// Per-cell random order (stable), for "partially rendered" effects.
export const cellRank = (r: number, c: number, seed = 0) => hash(r * 16 + c + seed * 1000);

// Small mono caption under a headline.
export const EnCaption: React.FC<{ text: string; style?: CSSProperties }> = ({ text, style }) => (
  <div style={{ letterSpacing: "0.16em", color: C.dim, whiteSpace: "pre", ...style }}>{text}</div>
);
