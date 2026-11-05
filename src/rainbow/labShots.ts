// The drop shots in order: the drop appears; one ray (in, one reflection,
// out) and its 42°; 48 rays and the histogram of where they go; Descartes;
// white light splitting into colours, with the camera travelling along the
// coloured fan. And the two-reflection ray of the secondary bow.

import { clamp, easeInOut, easeOut, inv, lerp } from "../intro-free/anim.ts";
import {
  B1,
  B2,
  type Beam,
  drawAngle,
  drawBeams,
  drawDrop,
  drawHistogram,
  LAB,
  type Lab,
  label,
  labBackground,
  lenTo,
  lerpLab,
  PALE,
  pathLen,
  rayPath,
  softBand,
  SPLIT,
} from "./lab.ts";
import { exitAngle, nWater, trace, type V2 } from "./optics.ts";
import { FPS, M } from "./timeline.ts";

const N589 = nWater(589);
const ONE = rayPath(B1, N589, 1, 3.8, 2.4);
const ONE_T = trace(B1, N589, 1);
const ONE_EXIT = ONE_T.pts[ONE_T.pts.length - 1];

// piecewise light front: reaches vertex i of the path at frame f[i]
const front = (pts: V2[], frame: number, keys: number[]) => {
  for (let i = 1; i < keys.length; i++) {
    if (frame < keys[i]) {
      const k = clamp((frame - keys[i - 1]) / (keys[i] - keys[i - 1]));
      return lerp(lenTo(pts, i - 1), i < pts.length ? lenTo(pts, i) : pathLen(pts), k);
    }
  }
  return pathLen(pts);
};

// 48 rays across the upper half
const MANY = Array.from({ length: 48 }, (_, j) => {
  const b = (j + 0.5) / 48;
  const pts = rayPath(b, N589, 1, 3.8, 4.2);
  return { b, pts, len: pathLen(pts) };
});

// the colour fan: where the camera goes to see it
const FAN_AT: V2 = [ONE_EXIT[0] + ONE_T.out[0] * 2.3, ONE_EXIT[1] + ONE_T.out[1] * 2.3];
const ZOOM: Lab = { s: 900, cx: 1000 - 900 * FAN_AT[0], cy: 500 + 900 * FAN_AT[1] };
const SPLIT_PATHS = SPLIT.map((c) => {
  const pts = rayPath(B1, c.n, 1, 3.8, 3.6);
  const t = trace(B1, c.n, 1);
  return { ...c, pts, exit: t.pts[t.pts.length - 1], out: t.out, angle: exitAngle(t.out) };
});

export const dropCam = (frame: number): Lab => {
  if (frame < M.split) return LAB;
  const k = easeInOut(inv(M.split + 18, M.labels + 4, frame));
  return lerpLab(LAB, ZOOM, k);
};

export const drawDropShot = (ctx: CanvasRenderingContext2D, frame: number, w: number, h: number) => {
  const L = dropCam(frame);
  labBackground(ctx, w, h, L);
  const t = (frame - M.dropIn) / FPS;

  // soft sunlight over the upper half, from the left
  const sun = clamp(inv(M.dropIn + 10, M.dropIn + 40, frame)) * (1 - 0.6 * clamp(inv(M.split, M.split + 20, frame)));
  if (sun > 0) {
    const y0 = L.cy - L.s;
    // a soft band over the upper half, fading towards the drop
    softBand(ctx, y0, y0 + L.s, L.cx - L.s * 1.02, 0.085 * sun, w, h);
    label(ctx, "阳光", 70, L.cy - L.s * 1.12, 40, sun * (1 - clamp(inv(M.split, M.split + 12, frame))), "rgba(255,236,190,1)", "left", 700);
    // arrows
    ctx.save();
    ctx.globalAlpha = sun * (1 - clamp(inv(M.split, M.split + 12, frame)));
    ctx.strokeStyle = "rgba(255,236,190,0.8)";
    ctx.lineWidth = 3;
    for (const yy of [0.25, 0.5, 0.75]) {
      const y = L.cy - L.s * yy;
      const x = 70 + ((frame * 4) % 60);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 90, y);
      ctx.lineTo(x + 76, y - 10);
      ctx.moveTo(x + 90, y);
      ctx.lineTo(x + 76, y + 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawDrop(ctx, L, clamp(inv(M.dropIn, M.dropIn + 24, frame)), t);
  const label2 = clamp(inv(M.dropIn + 20, M.dropIn + 36, frame)) * (1 - clamp(inv(M.ray1 - 10, M.ray1, frame)));
  label(ctx, "一颗雨滴（放大）", L.cx, L.cy + L.s + 46, 34, label2, "rgba(190,215,255,0.95)", "center", 500);

  const beams: Beam[] = [];
  // one ray
  const oneFade = 1 - 0.7 * clamp(inv(M.sweep - 10, M.sweep + 10, frame));
  const oneOut = 1 - clamp(inv(M.split - 4, M.split + 10, frame));
  if (frame >= M.ray1 - 18) {
    const s = front(ONE, frame, [M.ray1 - 18, M.ray1, M.ray1 + 20, M.ray1 + 40, M.ray1 + 58]);
    beams.push({ pts: ONE, s, color: PALE, alpha: 0.95 * oneFade * oneOut, width: 4 });
  }
  // many rays, one after another, then all of them
  if (frame >= M.sweep) {
    const dim = 1 - clamp(inv(M.split - 6, M.split + 12, frame));
    MANY.forEach((r, j) => {
      const start = M.sweep + j * (66 / MANY.length);
      const s = clamp((frame - start) / 16) * r.len;
      beams.push({ pts: r.pts, s, color: PALE, alpha: 0.32 * dim, width: 2.2 });
    });
    // the minimum-deviation ray glows once they have piled up
    const pile = easeOut(inv(M.pile, M.pile + 16, frame)) * dim;
    if (pile > 0) beams.push({ pts: ONE, s: pathLen(ONE), color: [255, 226, 140], alpha: 0.9 * pile * (0.75 + 0.25 * Math.sin(frame / 4)), width: 5 });
  }
  // white light splitting into colours
  if (frame >= M.split) {
    const s = front(SPLIT_PATHS[0].pts, frame, [M.split - 10, M.split + 4, M.split + 20, M.split + 34, M.split + 70]);
    for (const c of SPLIT_PATHS) beams.push({ pts: c.pts, s, color: c.color, alpha: 0.55, width: 3.2 });
  }
  drawBeams(ctx, L, beams, w, h);

  // the 42° of the single ray
  const ang = easeOut(inv(M.angle1, M.angle1 + 18, frame)) * (1 - clamp(inv(M.sweep - 10, M.sweep + 6, frame)));
  drawAngle(ctx, L, ONE_EXIT, ONE_T.out, ang, "42°");

  // histogram of the 48 rays (computed from 4000)
  const hist = clamp(inv(M.sweep - 6, M.sweep + 10, frame)) * (1 - clamp(inv(M.split - 6, M.split + 8, frame)));
  drawHistogram(ctx, 1500, 960, 344, 210, inv(M.sweep, M.sweepEnd + 6, frame), hist, easeOut(inv(M.pile, M.pile + 14, frame)));

  // Descartes
  const dc = clamp(inv(M.descartes, M.descartes + 14, frame)) * (1 - clamp(inv(M.split - 8, M.split + 4, frame)));
  label(ctx, "René Descartes · Les Météores · 1637", 1840, 86, 34, dc, "rgba(255,236,190,0.95)", "right", 500);

  // the colour labels at the end of the fan
  const lab = easeOut(inv(M.labels, M.labels + 14, frame));
  if (lab > 0) {
    const red = SPLIT_PATHS[SPLIT_PATHS.length - 1];
    const vio = SPLIT_PATHS[0];
    const at = (c: (typeof SPLIT_PATHS)[number], d: number): V2 => [c.exit[0] + c.out[0] * d, c.exit[1] + c.out[1] * d];
    const pr = at(red, 2.55);
    const pv = at(vio, 2.55);
    const sr: V2 = [L.cx + L.s * pr[0], L.cy - L.s * pr[1]];
    const sv: V2 = [L.cx + L.s * pv[0], L.cy - L.s * pv[1]];
    label(ctx, `红光 ${red.angle.toFixed(1)}°`, sr[0] + 40, sr[1] + 34, 44, lab, "rgba(255,150,130,1)", "left", 700);
    label(ctx, `紫光 ${vio.angle.toFixed(1)}°`, sv[0] - 40, sv[1] - 34, 44, lab, "rgba(196,170,255,1)", "right", 700);
  }
};

// ------------------------------------------------------------------ the secondary bow's ray
const TWO = rayPath(B2, N589, 2, 3.8, 2.6);
const TWO_T = trace(B2, N589, 2);
const TWO_EXIT = TWO_T.pts[TWO_T.pts.length - 1];
const TWO_SPLIT = SPLIT.map((c) => ({ ...c, pts: rayPath(B2, c.n, 2, 3.8, 3) }));
const LAB2: Lab = { cx: 1150, cy: 560, s: 270 };

export const drawTwoBounce = (ctx: CanvasRenderingContext2D, frame: number, w: number, h: number) => {
  const L = LAB2;
  labBackground(ctx, w, h, L);
  drawDrop(ctx, L, clamp(inv(M.twoBounce - 8, M.twoBounce + 10, frame)), 9);
  const f0 = M.twoBounce + 4;
  const s = front(TWO, frame, [f0, f0 + 14, f0 + 26, f0 + 38, f0 + 50, f0 + 70]);
  const split = clamp(inv(f0 + 50, f0 + 62, frame));
  const beams: Beam[] = [{ pts: TWO, s, color: PALE, alpha: 0.95 * (1 - split), width: 4 }];
  if (split > 0) for (const c of TWO_SPLIT) beams.push({ pts: c.pts, s: pathLen(c.pts), color: c.color, alpha: 0.6 * split, width: 3.2 });
  drawBeams(ctx, L, beams, w, h);
  drawAngle(ctx, L, TWO_EXIT, TWO_T.out, easeOut(inv(f0 + 52, f0 + 68, frame)), "51°", 0.5);
  label(ctx, "反射两次", L.cx + L.s * 1.15, L.cy - L.s * 0.2, 40, clamp(inv(f0 + 30, f0 + 44, frame)), "rgba(255,236,190,1)", "left", 700);
};
