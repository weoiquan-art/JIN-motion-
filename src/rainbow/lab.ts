// The raindrop "lab" shots, drawn on a canvas: one drop, magnified, with
// sunlight coming in from the left. Every ray path is traced with Snell's law
// (optics.ts); nothing is drawn by hand. Diagram units: the drop is the unit
// circle, y up; `Lab` maps them to the screen and can move like a camera.

import { clamp, easeInOut, easeOut, hash, inv, lerp } from "../intro-free/anim.ts";
import { rgba, spectral } from "../lib/spectrum.ts";
import { ZH_SANS } from "./fonts.ts";
import { BANDS, descartesB, exitAngle, nWater, trace, type V2 } from "./optics.ts";

export type Lab = { cx: number; cy: number; s: number };
export const LAB: Lab = { cx: 1180, cy: 450, s: 290 };
const scr = (L: Lab, p: V2): V2 => [L.cx + L.s * p[0], L.cy - L.s * p[1]];

export const lerpLab = (a: Lab, b: Lab, k: number): Lab => {
  // zoom in log space so the move feels even
  const s = Math.exp(lerp(Math.log(a.s), Math.log(b.s), k));
  // keep the point under the screen centre moving smoothly
  const ca: V2 = [(960 - a.cx) / a.s, (a.cy - 540) / a.s];
  const cb: V2 = [(960 - b.cx) / b.s, (b.cy - 540) / b.s];
  const c: V2 = [lerp(ca[0], cb[0], k), lerp(ca[1], cb[1], k)];
  return { cx: 960 - c[0] * s, cy: 540 + c[1] * s, s };
};

const N589 = nWater(589);
export const B1 = descartesB(N589, 1); // 0.861
export const B2 = -descartesB(N589, 2); // -0.950, the lower half

// ------------------------------------------------------------------ pieces
export const labBackground = (ctx: CanvasRenderingContext2D, w: number, h: number, L: Lab) => {
  const g = ctx.createRadialGradient(w * 0.6, h * 0.42, 0, w * 0.6, h * 0.42, w * 0.75);
  g.addColorStop(0, "#14203a");
  g.addColorStop(1, "#060a14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // a faint grid that moves with the diagram
  const step = 0.25 * L.s;
  if (step > 14) {
    ctx.strokeStyle = "rgba(140,170,230,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const x0 = ((L.cx % step) + step) % step;
    const y0 = ((L.cy % step) + step) % step;
    for (let x = x0; x < w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = y0; y < h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }
};

/** the drop; `k` 0…1 grows it in with a small wobble */
export const drawDrop = (ctx: CanvasRenderingContext2D, L: Lab, k: number, t: number) => {
  if (k <= 0) return;
  const [x, y] = scr(L, [0, 0]);
  const wob = 1 + 0.03 * Math.sin(t * 9) * Math.exp(-t * 2.5) * (1 - clamp(k - 0.99));
  const r = L.s * easeOut(k) * wob;
  ctx.save();
  ctx.globalAlpha = clamp(k * 1.5);
  const body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  body.addColorStop(0, "rgba(160,205,255,0.20)");
  body.addColorStop(0.7, "rgba(90,140,220,0.10)");
  body.addColorStop(1, "rgba(120,170,255,0.22)");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(190,220,255,0.65)";
  ctx.lineWidth = Math.max(1.5, r * 0.012);
  ctx.stroke();
  // highlight
  const hl = ctx.createRadialGradient(x - r * 0.45, y - r * 0.5, 0, x - r * 0.45, y - r * 0.5, r * 0.35);
  hl.addColorStop(0, "rgba(255,255,255,0.35)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** the points of a traced ray, from far left to far out */
export const rayPath = (b: number, n: number, k: number, inLen = 6, outLen = 8): V2[] => {
  const t = trace(b, n, k);
  const first = t.pts[0];
  const last = t.pts[t.pts.length - 1];
  return [[first[0] - inLen, first[1]], ...t.pts, [last[0] + t.out[0] * outLen, last[1] + t.out[1] * outLen]];
};

/** the part of a polyline from its start to arc length s */
const upTo = (pts: V2[], s: number): V2[] => {
  const out: V2[] = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + seg >= s) {
      const k = (s - acc) / seg;
      out.push([lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]);
      return out;
    }
    acc += seg;
    out.push(pts[i]);
  }
  return out;
};
export const pathLen = (pts: V2[]) => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
/** arc length at which the path reaches vertex i */
export const lenTo = (pts: V2[], i: number) => pathLen(pts.slice(0, i + 1));

export type Beam = { pts: V2[]; s: number; color: readonly number[]; alpha: number; width: number };

/** glowing light: everything is added on an offscreen layer, then a blurred copy and the sharp lines are added to the picture */
const pool: Record<string, HTMLCanvasElement> = {};
const layer = (name: string, w: number, h: number) => {
  let c = pool[name];
  if (!c) {
    c = document.createElement("canvas");
    pool[name] = c;
  }
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.clearRect(0, 0, w, h);
  return { c, ctx };
};

/** a band of light from the left edge to x1, soft at its top, bottom and right end */
export const softBand = (ctx: CanvasRenderingContext2D, y0: number, y1: number, x1: number, alpha: number, w: number, h: number) => {
  const { c, ctx: bc } = layer("band", w, h);
  const pad = (y1 - y0) * 0.1;
  const v = bc.createLinearGradient(0, y0 - pad, 0, y1 + pad);
  v.addColorStop(0, "rgba(255,236,190,0)");
  v.addColorStop(0.15, "rgba(255,236,190,1)");
  v.addColorStop(0.85, "rgba(255,236,190,1)");
  v.addColorStop(1, "rgba(255,236,190,0)");
  bc.fillStyle = v;
  bc.fillRect(0, y0 - pad, x1, y1 - y0 + 2 * pad);
  bc.globalCompositeOperation = "destination-in";
  const hz = bc.createLinearGradient(0, 0, x1, 0);
  hz.addColorStop(0, "rgba(0,0,0,1)");
  hz.addColorStop(0.65, "rgba(0,0,0,1)");
  hz.addColorStop(1, "rgba(0,0,0,0)");
  bc.fillStyle = hz;
  bc.fillRect(0, 0, x1, h);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(c, 0, 0);
  ctx.restore();
};

export const drawBeams = (ctx: CanvasRenderingContext2D, L: Lab, beams: Beam[], w: number, h: number, glow = 1) => {
  const { c, ctx: lc } = layer("beams", w, h);
  lc.globalCompositeOperation = "lighter";
  lc.lineCap = "round";
  lc.lineJoin = "round";
  for (const b of beams) {
    if (b.alpha <= 0 || b.s <= 0) continue;
    const pts = upTo(b.pts, b.s).map((p) => scr(L, p));
    lc.strokeStyle = rgba(b.color, b.alpha);
    lc.lineWidth = b.width;
    lc.beginPath();
    lc.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) lc.lineTo(pts[i][0], pts[i][1]);
    lc.stroke();
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if (glow > 0) {
    ctx.globalAlpha = 0.9 * glow;
    ctx.filter = "blur(9px)";
    ctx.drawImage(c, 0, 0);
    ctx.filter = "none";
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(c, 0, 0);
  ctx.restore();
};

const WHITE = [255, 247, 228];

/** the dashed line back towards the sun and the angle between it and a ray */
export const drawAngle = (ctx: CanvasRenderingContext2D, L: Lab, at: V2, out: V2, k: number, label: string, r = 0.55) => {
  if (k <= 0) return;
  const p = scr(L, at);
  const ang = Math.atan2(-out[1], -out[0]); // screen angle of the exit ray measured from −x … in diagram units
  ctx.save();
  ctx.globalAlpha = k;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  ctx.lineTo(p[0] - L.s * 1.6 * easeOut(k), p[1]);
  ctx.stroke();
  ctx.setLineDash([]);
  // arc from the dashed line (pointing −x, screen angle π) to the ray
  const a0 = Math.PI;
  const a1 = Math.PI + ang * easeOut(k); // diagram y up → screen y down
  ctx.strokeStyle = "rgba(255,236,170,0.95)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(p[0], p[1], L.s * r, Math.min(a0, a1), Math.max(a0, a1));
  ctx.stroke();
  const mid = (a0 + a1) / 2;
  ctx.fillStyle = "rgba(255,236,170,1)";
  ctx.font = `700 ${Math.round(L.s * 0.2)}px ${ZH_SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, p[0] + Math.cos(mid) * L.s * (r + 0.24), p[1] + Math.sin(mid) * L.s * (r + 0.24));
  ctx.restore();
};

export const label = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, alpha: number, color = "rgba(235,240,255,1)", align: CanvasTextAlign = "left", weight = 600) => {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${ZH_SANS}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 10;
  ctx.fillText(text, x, y);
  ctx.restore();
};

// ------------------------------------------------------------------ data
// exit angles of evenly spaced rays (k = 1), for the histogram
const HIST_N = 4000;
export const HIST_ANGLES = Array.from({ length: HIST_N }, (_, i) => exitAngle(trace((i + 0.5) / HIST_N, N589, 1).out));
export const HIST_BINS = 43; // 1° bins, 0…43°

/** histogram of the rays with impact parameter below bMax; counts as shares of all rays */
export const histogram = (bMax: number) => {
  const bins = new Array(HIST_BINS).fill(0);
  const n = Math.floor(clamp(bMax) * HIST_N);
  for (let i = 0; i < n; i++) bins[Math.min(HIST_BINS - 1, Math.floor(HIST_ANGLES[i]))] += 1 / HIST_N;
  return bins;
};

export const drawHistogram = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hgt: number, bMax: number, alpha: number, peak: number) => {
  if (alpha <= 0) return;
  const bins = histogram(bMax);
  const bw = w / HIST_BINS;
  const scale = hgt / 0.1; // 10 % of all rays fills the panel
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(10,16,30,0.55)";
  ctx.fillRect(x - 24, y - hgt - 70, w + 48, hgt + 128);
  ctx.strokeStyle = "rgba(200,215,255,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  bins.forEach((v, i) => {
    const hh = v * scale;
    const hot = i === 41 ? peak : 0;
    ctx.fillStyle = hot > 0 ? `rgba(255,${Math.round(lerp(220, 236, hot))},${Math.round(lerp(190, 150, hot))},1)` : "rgba(170,195,255,0.85)";
    ctx.fillRect(x + i * bw + 1, y - hh, bw - 2, hh);
  });
  for (const deg of [0, 10, 20, 30, 40]) {
    label(ctx, `${deg}°`, x + deg * bw, y + 26, 22, 1, "rgba(200,215,255,0.9)", "center", 500);
  }
  label(ctx, "射出角度", x, y - hgt - 38, 26, 1, "rgba(220,230,255,0.95)", "left", 600);
  if (peak > 0) label(ctx, "42°", x + 41.5 * bw, y - bins[41] * scale - 26, 30, peak, "rgba(255,236,170,1)", "center", 700);
  ctx.restore();
};

/** wavelength colours for the split beam (violet → red) */
export const SPLIT = BANDS.map((nm) => ({ nm, n: nWater(nm), color: spectral(nm, 0.02) }));
export const PALE = WHITE;
export const jitter = (i: number) => hash(i * 12.9898);
export const ease = easeInOut;
export const invf = inv;
