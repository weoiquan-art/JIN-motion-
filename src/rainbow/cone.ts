// The 3D diagram: a viewer with the sun behind them, the line from the sun
// through their eye down to the shadow of their head ("影子方向"), and the
// cone of directions 42° around it. Raindrops on that cone light up in the
// colour that reaches the eye (violet 40.6° … red 42.4°); drops only exist
// above the ground, so the ground cuts the circle. Units are metres, but the
// drops are drawn much closer than real ones (a diagram).

import { clamp, hash, lerp } from "../intro-free/anim.ts";
import { type Cam, dirOf, view, type V3, type View } from "../lib/cam3d.ts";
import { rgba, spectral } from "../lib/spectrum.ts";
import { ZH_SANS } from "./fonts.ts";
import { bowAngle, DEG, nWater } from "./optics.ts";

export type Person = {
  x: number;
  y: number;
  /** 0…1, everything of this person */
  show: number;
  /** 0…1, just the body (hidden when the camera is their eye) */
  body: number;
  /** 0…1, the cone and its lit drops */
  ring: number;
  /** the cone's colour */
  tint: readonly number[];
  /** walking phase (bobbing), 0 = standing */
  walk: number;
  /** 0 = lit drops in their own colours, 1 = in the cone's tint */
  tinted: number;
};

export type ConeOpts = {
  cam: Cam;
  sunEl: number;
  people: Person[];
  /** the 42° label in the side view */
  angle: number;
  /** the "影子方向" line */
  axis: number;
  /** emphasis of the part of the circle under the ground */
  below: number;
  /** the sun elevation read-out */
  gauge: number;
  /** the camera is the first person's eye: no axis line through it */
  firstPerson: number;
  /** 1 = show only the drops near the vertical plane through the axis (side view) */
  slice: number;
  t: number;
};

const EYE = 1.62;
const GEN = 19; // length of the cone's lines (m)
const COLS = [400, 440, 480, 520, 560, 600, 650, 700].map((nm) => ({ rho: bowAngle(nWater(nm), 1), c: spectral(nm, 0.04) }));

// random drops in the air ahead, and drops placed on the cone of each person
const AIR: V3[] = Array.from({ length: 360 }, (_, i) => [(hash(i * 1.7) - 0.5) * 44, 4 + 26 * hash(i * 3.1), 0.3 + 15 * hash(i * 5.3)]);
const ON = Array.from({ length: 1100 }, (_, i) => ({ phi: hash(i * 7.3) * Math.PI * 2, d: 13 + 7 * hash(i * 9.7), col: i % COLS.length, tw: hash(i * 2.9) }));

const axisOf = (sunEl: number) => {
  const e = sunEl * DEG;
  const A: V3 = [0, Math.cos(e), -Math.sin(e)];
  const U: V3 = [1, 0, 0];
  const V: V3 = [0, Math.sin(e), Math.cos(e)];
  return { A, U, V };
};
const onCone = (eye: V3, b: ReturnType<typeof axisOf>, rho: number, phi: number, d: number): V3 => {
  const cr = Math.cos(rho * DEG);
  const sr = Math.sin(rho * DEG);
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  return [0, 1, 2].map((k) => eye[k] + d * (b.A[k] * cr + (b.U[k] * c + b.V[k] * s) * sr)) as unknown as V3;
};

const line = (ctx: CanvasRenderingContext2D, v: View, a: V3, b: V3) => {
  const pa = v.project(a);
  const pb = v.project(b);
  if (!pa || !pb) return;
  ctx.beginPath();
  ctx.moveTo(pa[0], pa[1]);
  ctx.lineTo(pb[0], pb[1]);
  ctx.stroke();
};

const text = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, alpha: number, color: string, align: CanvasTextAlign = "left") => {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.font = `700 ${size}px ${ZH_SANS}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 10;
  ctx.fillText(s, x, y);
  ctx.restore();
};

// a person seen from any side: a simple rounded silhouette standing at (x, y)
const drawPerson = (ctx: CanvasRenderingContext2D, v: View, p: Person) => {
  const bob = Math.abs(Math.sin(p.walk * Math.PI)) * 0.04;
  const feet = v.project([p.x, p.y, bob]);
  const head = v.project([p.x, p.y, 1.75 + bob]);
  if (!feet || !head) return;
  const hgt = feet[1] - head[1];
  if (hgt < 2) return;
  const cx = feet[0];
  const top = head[1];
  ctx.save();
  ctx.globalAlpha = p.show * p.body;
  ctx.fillStyle = "rgba(236,226,206,1)";
  const u = hgt / 1.75;
  // head
  ctx.beginPath();
  ctx.arc(cx, top + 0.12 * u, 0.12 * u, 0, Math.PI * 2);
  ctx.fill();
  // body
  ctx.beginPath();
  ctx.moveTo(cx - 0.2 * u, top + 0.3 * u);
  ctx.quadraticCurveTo(cx, top + 0.24 * u, cx + 0.2 * u, top + 0.3 * u);
  ctx.lineTo(cx + 0.17 * u, top + 0.95 * u);
  ctx.lineTo(cx + 0.13 * u + Math.sin(p.walk * Math.PI) * 0.08 * u, feet[1]);
  ctx.lineTo(cx + 0.02 * u, feet[1]);
  ctx.lineTo(cx, top + 1.0 * u);
  ctx.lineTo(cx - 0.02 * u, feet[1]);
  ctx.lineTo(cx - 0.13 * u - Math.sin(p.walk * Math.PI) * 0.08 * u, feet[1]);
  ctx.lineTo(cx - 0.17 * u, top + 0.95 * u);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

export const drawCone = (ctx: CanvasRenderingContext2D, o: ConeOpts) => {
  const { w, h } = o.cam;
  const v = view(o.cam);
  const b = axisOf(o.sunEl);

  // sky and ground
  const hor = v.horizon;
  const sky = ctx.createLinearGradient(0, Math.min(hor - 700, 0), 0, hor);
  sky.addColorStop(0, "#070b16");
  sky.addColorStop(1, "#1c2a45");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  if (hor < h) {
    const g = ctx.createLinearGradient(0, hor, 0, h);
    g.addColorStop(0, "#1a2735");
    g.addColorStop(1, "#0e1620");
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.max(0, hor), w, h - Math.max(0, hor));
  }
  // ground grid
  ctx.lineWidth = 1.2;
  for (let x = -30; x <= 30; x += 2) {
    ctx.strokeStyle = "rgba(120,160,210,0.16)";
    line(ctx, v, [x, -12, 0], [x, 44, 0]);
  }
  for (let y = -12; y <= 44; y += 2) {
    ctx.strokeStyle = "rgba(120,160,210,0.16)";
    line(ctx, v, [-30, y, 0], [30, y, 0]);
  }

  // the sun and its light
  const S = dirOf(o.sunEl, 180);
  const sp = v.dir(S);
  if (sp) {
    const g = ctx.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], 120);
    g.addColorStop(0, "rgba(255,240,200,1)");
    g.addColorStop(0.18, "rgba(255,220,150,0.9)");
    g.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sp[0], sp[1], 120, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,220,150,0.3)";
  ctx.lineWidth = 2.5;
  for (const [dx, dz] of [
    [-1.2, 2.6],
    [1.4, 2.2],
    [-2.6, 1.2],
    [2.4, 3.4],
  ]) {
    const p0: V3 = [dx - 40 * b.A[0], -40 * b.A[1], dz - 40 * b.A[2]];
    const p1: V3 = [dx + 4 * b.A[0], 4 * b.A[1], dz + 4 * b.A[2]];
    line(ctx, v, p0, p1);
  }

  // drops in the air
  for (const d of AIR) {
    const p = v.project(d);
    if (!p) continue;
    const r = clamp(0.05 * v.scale(p[2]), 1.2, 5);
    ctx.fillStyle = `rgba(160,190,240,${(0.28 * clamp((p[2] - 3) / 6)).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of o.people) {
    if (p.show <= 0) continue;
    const eye: V3 = [p.x, p.y, EYE];
    // shadow on the ground
    const L = 1.75 / Math.tan(o.sunEl * DEG);
    ctx.save();
    ctx.globalAlpha = p.show;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    const sh = v.poly([
      [p.x - 0.22, p.y, 0],
      [p.x + 0.22, p.y, 0],
      [p.x + 0.16, p.y + L, 0],
      [p.x - 0.16, p.y + L, 0],
    ]);
    if (sh.length > 2) {
      ctx.beginPath();
      sh.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.fill();
    }
    ctx.restore();

    if (p.ring > 0) {
      // the cone: lines from the eye, the circle (dashed under the ground)
      ctx.save();
      ctx.globalAlpha = p.ring;
      ctx.strokeStyle = rgba(p.tint, 0.22);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 12; i++) line(ctx, v, eye, onCone(eye, b, 42, (i / 12) * Math.PI * 2 + Math.PI / 2, GEN));
      const n = 160;
      for (let i = 0; i < n; i++) {
        const a = onCone(eye, b, 42, (i / n) * Math.PI * 2, GEN);
        const c = onCone(eye, b, 42, ((i + 1) / n) * Math.PI * 2, GEN);
        const under = a[2] < 0 || c[2] < 0;
        ctx.strokeStyle = under ? `rgba(150,160,180,${(0.25 + 0.25 * o.below).toFixed(3)})` : rgba(p.tint, 0.9 * (1 - 0.75 * o.firstPerson));
        ctx.lineWidth = under ? 2 : 4;
        if (under && i % 2) continue;
        line(ctx, v, a, c);
      }
      ctx.restore();
      // the lit drops on the cone, in the colour the eye gets from them
      ON.forEach((d) => {
        const col = COLS[d.col];
        const q = onCone(eye, b, col.rho, d.phi, d.d);
        if (q[2] < 0.15) return;
        const s = v.project(q);
        if (!s) return;
        const r = clamp(0.06 * v.scale(s[2]) * (1 + 0.6 * o.firstPerson), 1.6, 7);
        const c = col.c.map((x, k) => lerp(x, p.tint[k], p.tinted));
        const sl = lerp(1, Math.exp(-(Math.cos(d.phi) ** 2) / 0.012), o.slice);
        if (sl < 0.02) return;
        ctx.fillStyle = rgba(c, (0.75 + 0.25 * Math.sin(o.t * 3 + d.tw * 6)) * p.ring * sl);
        ctx.beginPath();
        ctx.arc(s[0], s[1], r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    // the line from the sun through the eye to the shadow of the head, and on
    if (o.axis > 0) {
      const tg = EYE / Math.tan(o.sunEl * DEG);
      const lineK = 1 - o.firstPerson;
      const shadowHead: V3 = [p.x, p.y + tg, 0];
      ctx.save();
      ctx.globalAlpha = o.axis * lineK;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([12, 10]);
      line(ctx, v, [eye[0] - 30 * b.A[0], eye[1] - 30 * b.A[1], eye[2] - 30 * b.A[2]], shadowHead);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      line(ctx, v, shadowHead, [eye[0] + GEN * b.A[0], eye[1] + GEN * b.A[1], eye[2] + GEN * b.A[2]]);
      ctx.setLineDash([]);
      ctx.globalAlpha = o.axis;
      const sh = v.project(shadowHead);
      if (sh) {
        ctx.fillStyle = "rgba(255,236,170,1)";
        ctx.beginPath();
        ctx.arc(sh[0], sh[1], 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (p.show * p.body > 0.01) drawPerson(ctx, v, p);
  }

  // labels
  const p0 = o.people[0];
  if (p0 && o.axis > 0) {
    const tg = EYE / Math.tan(o.sunEl * DEG);
    const sh = v.project([p0.x, p0.y + tg, 0]);
    if (sh) text(ctx, "影子方向", sh[0] + 24, sh[1] + 34, 34, o.axis, "rgba(255,255,255,0.95)");
  }
  if (p0 && o.angle > 0) {
    // 42° between the axis and the top line of the cone, at the eye
    const eye: V3 = [p0.x, p0.y, EYE];
    const e = v.project(eye);
    const ax = v.project([eye[0] + 3 * b.A[0], eye[1] + 3 * b.A[1], eye[2] + 3 * b.A[2]]);
    const tp = v.project(onCone(eye, b, 42, Math.PI / 2, 3));
    if (e && ax && tp) {
      const a0 = Math.atan2(ax[1] - e[1], ax[0] - e[0]);
      const a1 = Math.atan2(tp[1] - e[1], tp[0] - e[0]);
      const r = 0.75 * Math.hypot(ax[0] - e[0], ax[1] - e[1]);
      ctx.save();
      ctx.globalAlpha = o.angle;
      ctx.strokeStyle = "rgba(255,236,170,0.95)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(e[0], e[1], r, Math.min(a0, a1), Math.max(a0, a1));
      ctx.stroke();
      ctx.restore();
      const mid = (a0 + a1) / 2;
      text(ctx, "42°", e[0] + Math.cos(mid) * (r + 46), e[1] + Math.sin(mid) * (r + 46), 44, o.angle, "rgba(255,236,170,1)", "center");
    }
  }
  if (o.gauge > 0) {
    text(ctx, `太阳高度 ${Math.round(o.sunEl)}°`, 80, 92, 44, o.gauge, o.sunEl > 42 ? "rgba(255,170,140,1)" : "rgba(255,226,160,1)");
  }
  // the drops are drawn metres away, real ones are hundreds of metres or more
  text(ctx, "示意图 · 距离不按比例", w - 60, 90, 28, 0.7, "rgba(200,215,255,1)", "right");
};

export { lerp };
