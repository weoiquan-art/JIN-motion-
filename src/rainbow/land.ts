// The landscape shots, drawn on a canvas: a plain after the rain, the low sun
// behind the viewer, a storm ahead, and the rainbow where it really is — the
// set of directions 42° (40.6–42.4° by colour) from the antisolar point. The
// bow is visible only where the line of sight runs through sunlit rain, so it
// ends at the horizon from the ground and closes into a circle from high up.
// World: metres, x right, y ahead (away from the sun), z up; the viewer stands
// at the origin. Every shape is a pure function of the camera and time.

import { clamp, hash, lerp, noise1 } from "../intro-free/anim.ts";
import { type Cam, type V3, view, type View } from "../lib/cam3d.ts";
import { rgba, spectral, xyz } from "../lib/spectrum.ts";
import { BANDS, bowAngle, DEG, nWater } from "./optics.ts";

export type LandOpts = {
  cam: Cam;
  /** seconds, for rain and cloud drift */
  t: number;
  /** sun elevation, degrees (the sun is behind the viewer) */
  sunEl: number;
  /** primary and secondary bow strength, 0…1 */
  bow: number;
  bow2: number;
  /** the viewer's shadow on the ground, 0…1 */
  shadow: number;
  /** "this is the centre" marks, 0…1 */
  mark: number;
  rain: number;
};

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, k: number): RGB => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

// ------------------------------------------------------------------ the world
const RAIN = { y0: 150, y1: 14000, z1: 2000, x: 14000 }; // the sunlit rain (a box ahead)
const CLOUD_Z = 2000;
const HAZE: RGB = [150, 156, 158];

// fields: cells of a grid, each inset a little so the darker ground shows
// between them like hedgerows; coarser far away
type Field = { pts: V3[]; c: RGB; y: number };
const FIELD_COLOURS: RGB[] = [
  [92, 132, 60],
  [106, 144, 64],
  [128, 152, 70],
  [158, 160, 82],
  [184, 168, 96],
  [118, 124, 62],
  [76, 114, 54],
  [140, 136, 74],
];
const FIELDS: Field[] = (() => {
  const out: Field[] = [];
  const bands = [
    { y0: 30, y1: 260, d: 58, meadow: true },
    { y0: 260, y1: 3000, d: 170, meadow: false },
    { y0: 3000, y1: 17000, d: 900, meadow: false },
  ];
  let id = 0;
  for (const b of bands) {
    for (let y = b.y0; y < b.y1; y += b.d) {
      const half = 2.5 * (y + b.d) + 700;
      for (let x = -half; x < half; x += b.d) {
        id++;
        const j = (k: number) => (hash(id * 7.1 + k) - 0.5) * b.d * 0.18;
        const ins = b.d * (0.05 + 0.04 * hash(id * 3.3));
        const pts: V3[] = [
          [x + ins + j(1), y + ins + j(2), 0],
          [x + b.d - ins + j(3), y + ins + j(4), 0],
          [x + b.d - ins + j(5), y + b.d - ins + j(6), 0],
          [x + ins + j(7), y + b.d - ins + j(8), 0],
        ];
        const c = b.meadow
          ? mix([84, 116, 56], [112, 136, 66], hash(id * 1.37))
          : mix(FIELD_COLOURS[Math.floor(hash(id * 1.37) * FIELD_COLOURS.length)], [112, 124, 84], 0.22);
        out.push({ pts, c, y: y + b.d / 2 });
      }
    }
  }
  return out;
})();

// a river winding away from the viewer
const riverX = (y: number) => -380 + 540 * Math.sin(y / 1900 + 0.6) + 260 * Math.sin(y / 760 + 2.1);
const RIVER: { l: V3[]; r: V3[] } = (() => {
  const l: V3[] = [];
  const r: V3[] = [];
  for (let y = 30; y <= 17000; y += y < 2000 ? 40 : 200) {
    const w = 22 + 0.0026 * y;
    l.push([riverX(y) - w / 2, y, 0]);
    r.push([riverX(y) + w / 2, y, 0]);
  }
  return { l, r };
})();

// trees in small clusters
type Tree = { p: V3; h: number; r: number; c: RGB };
const TREES: Tree[] = (() => {
  const out: Tree[] = [];
  for (let i = 0; i < 150; i++) {
    const y = 420 + 7500 * hash(i * 2.17) ** 1.4;
    const x = (hash(i * 5.91) - 0.5) * 2 * (2.2 * y + 150);
    if (Math.abs(x - riverX(y)) < 40) continue;
    const n = 2 + Math.floor(hash(i * 8.3) * 5);
    for (let k = 0; k < n; k++) {
      const h = 6 + 6 * hash(i * 11 + k);
      out.push({
        p: [x + (hash(i * 13 + k) - 0.5) * 30, y + (hash(i * 17 + k) - 0.5) * 30, 0],
        h,
        r: h * (0.32 + 0.12 * hash(i * 19 + k)),
        c: mix([40, 66, 38], [70, 96, 46], hash(i * 23 + k)),
      });
    }
  }
  return out.sort((a, b) => b.p[1] - a.p[1]);
})();

// two mountain ridges far beyond the storm
const ridge = (y: number, h0: number, h1: number, seed: number): V3[] => {
  const pts: V3[] = [];
  for (let x = -90000; x <= 90000; x += 1200) {
    const n = 0.5 + 0.5 * noise1(x / 9000, seed) + 0.25 * noise1(x / 2600, seed + 3);
    pts.push([x, y, h0 + (h1 - h0) * clamp(n)]);
  }
  return pts;
};
const RIDGES = [
  { pts: ridge(34000, 500, 1500, 11), c: [104, 114, 130] as RGB },
  { pts: ridge(23000, 150, 600, 4), c: [88, 102, 104] as RGB },
];

// the cloud deck over the storm: soft blobs on a plane
type Puff = { x: number; y: number; r: number; dark: number };
const PUFFS: Puff[] = Array.from({ length: 420 }, (_, i) => ({
  x: (hash(i * 3.7) - 0.5) * 70000,
  y: 300 + 26000 * hash(i * 9.1) ** 1.2,
  r: 1500 + 3500 * hash(i * 4.3),
  dark: hash(i * 6.6),
})).sort((a, b) => b.y - a.y);

// grass blades in front of a viewer standing on the ground
type Blade = { x: number; y: number; h: number; lean: number; c: RGB };
const BLADES: Blade[] = Array.from({ length: 1400 }, (_, i) => {
  const y = 2.2 + 26 * hash(i * 1.91) ** 2;
  return {
    x: (hash(i * 7.77) - 0.5) * 2 * (y * 1.25 + 1),
    y,
    h: 0.12 + 0.3 * hash(i * 3.03),
    lean: (hash(i * 5.55) - 0.5) * 0.5,
    c: mix([92, 122, 50], [176, 172, 92], hash(i * 2.22)),
  };
}).sort((a, b) => b.y - a.y);

// ------------------------------------------------------------------ helpers
const elevationY = (v: View, cam: Cam, el: number) => {
  const a = (el - cam.pitch) * DEG;
  if (a >= Math.PI / 2 - 0.01) return -1e5;
  if (a <= -Math.PI / 2 + 0.01) return 1e5;
  return cam.h / 2 - v.focal * Math.tan(a);
};

const fillPoly = (ctx: CanvasRenderingContext2D, pts: [number, number][]) => {
  if (pts.length < 3) return false;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  return true;
};

/** length of a ray inside the sunlit rain box (slab method) */
const rainPath = (o: V3, d: V3) => {
  let t0 = 0;
  let t1 = 1e9;
  const lo = [-RAIN.x, RAIN.y0, 0];
  const hi = [RAIN.x, RAIN.y1, RAIN.z1];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) {
      if (o[a] < lo[a] || o[a] > hi[a]) return 0;
      continue;
    }
    let ta = (lo[a] - o[a]) / d[a];
    let tb = (hi[a] - o[a]) / d[a];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 >= t1) return 0;
  }
  // a ray going down ends on the ground; one going up ends at the cloud base
  return t1 - t0;
};

// reusable offscreen canvases (frames render one after another in a tab)
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

// visibility of the bow (sunlit rain along the line of sight) on a coarse
// grid, as an alpha mask the size of the frame
const MW = 192;
const MH = 108;
const masks = (v: View, cam: Cam) => {
  const bow = layer("mask", MW, MH);
  const veil = layer("veil", MW, MH);
  const a = bow.ctx.createImageData(MW, MH);
  const b = veil.ctx.createImageData(MW, MH);
  for (let my = 0; my < MH; my++) {
    for (let mx = 0; mx < MW; mx++) {
      const d = v.ray(((mx + 0.5) / MW) * cam.w, ((my + 0.5) / MH) * cam.h);
      const L = rainPath(cam.pos, d);
      const k = (my * MW + mx) * 4;
      for (const img of [a, b]) {
        img.data[k] = 255;
        img.data[k + 1] = 255;
        img.data[k + 2] = 255;
      }
      a.data[k + 3] = Math.round(255 * (1 - Math.exp(-L / 350)));
      // the veil only over the ground (the sky colour already is the view through the rain)
      b.data[k + 3] = d[2] < 0 ? Math.round(255 * (1 - Math.exp(-L / 2600))) : 0;
    }
  }
  bow.ctx.putImageData(a, 0, 0);
  veil.ctx.putImageData(b, 0, 0);
  return { bow: bow.c, veil: veil.c };
};

// the bow: directions at angle rho from the antisolar point A
const antisolar = (sunEl: number): { A: V3; U: V3; V: V3 } => {
  const e = sunEl * DEG;
  return { A: [0, Math.cos(e), -Math.sin(e)], U: [1, 0, 0], V: [0, Math.sin(e), Math.cos(e)] };
};
const onCone = (b: { A: V3; U: V3; V: V3 }, rho: number, phi: number): V3 => {
  const cr = Math.cos(rho * DEG);
  const sr = Math.sin(rho * DEG);
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  return [
    b.A[0] * cr + (b.U[0] * c + b.V[0] * s) * sr,
    b.A[1] * cr + (b.U[1] * c + b.V[1] * s) * sr,
    b.A[2] * cr + (b.U[2] * c + b.V[2] * s) * sr,
  ];
};
const ring = (v: View, b: ReturnType<typeof antisolar>, rho: number, n = 240) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const p = v.dir(onCone(b, rho, (i / n) * Math.PI * 2));
    if (p) pts.push(p);
  }
  return pts;
};
const strip = (ctx: CanvasRenderingContext2D, v: View, b: ReturnType<typeof antisolar>, r0: number, r1: number) => {
  const a = ring(v, b, r0);
  const c = ring(v, b, r1).reverse();
  return fillPoly(ctx, [...a, ...c]);
};

const Y_MAX = Math.max(...BANDS.map((nm) => xyz(nm)[1]));
const BAND_W = BANDS.map((nm) => 0.3 + 0.7 * Math.sqrt(xyz(nm)[1] / Y_MAX));

const drawBows = (ctx: CanvasRenderingContext2D, v: View, o: LandOpts, w: number, h: number, mask: HTMLCanvasElement) => {
  const b = antisolar(o.sunEl);
  const { c: L, ctx: lc } = layer("bow", w, h);
  lc.globalCompositeOperation = "lighter";
  // the sky inside the primary bow is brighter (all the rays bent less than 42°)
  if (o.bow > 0) {
    lc.fillStyle = `rgba(255,250,240,${(0.032 * o.bow).toFixed(3)})`;
    if (fillPoly(lc, ring(v, b, 40.2))) lc.fill();
    lc.fillStyle = `rgba(255,250,240,${(0.026 * o.bow).toFixed(3)})`;
    if (strip(lc, v, b, 37.5, 40.4)) lc.fill();
  }
  // outside the secondary bow too
  if (o.bow2 > 0) {
    for (const [r0, r1, a] of [
      [53.6, 56, 0.026],
      [56, 61, 0.018],
      [61, 68, 0.01],
    ]) {
      lc.fillStyle = `rgba(255,250,240,${(a * o.bow2).toFixed(3)})`;
      if (strip(lc, v, b, r0, r1)) lc.fill("evenodd");
    }
  }
  // the coloured bands, one per wavelength, as wide as the sun (0.53°)
  BANDS.forEach((nm, i) => {
    const n = nWater(nm);
    const col = spectral(nm, 0.03);
    if (o.bow > 0) {
      const r = bowAngle(n, 1);
      lc.fillStyle = rgba(col, 0.5 * BAND_W[i] * o.bow);
      if (strip(lc, v, b, r - 0.34, r + 0.3)) lc.fill();
    }
    if (o.bow2 > 0) {
      const r = bowAngle(n, 2);
      lc.fillStyle = rgba(col, 0.24 * BAND_W[i] * o.bow2);
      if (strip(lc, v, b, r - 0.3, r + 0.4)) lc.fill();
    }
  });
  // soften, keep only where there is sunlit rain, add to the picture
  const pxDeg = v.focal * DEG;
  const { c: B, ctx: bc } = layer("bowBlur", w, h);
  bc.filter = `blur(${Math.max(1, 0.16 * pxDeg).toFixed(1)}px)`;
  bc.drawImage(L, 0, 0);
  bc.filter = "none";
  bc.globalCompositeOperation = "destination-in";
  bc.imageSmoothingEnabled = true;
  bc.imageSmoothingQuality = "high";
  bc.drawImage(mask, 0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(B, 0, 0);
  ctx.restore();
};

// ------------------------------------------------------------------ drawing
export const drawLand = (ctx: CanvasRenderingContext2D, o: LandOpts) => {
  const cam = o.cam;
  const { w, h } = cam;
  const v = view(cam);
  const camZ = cam.pos[2];
  const hor = v.horizon;

  // sky: dark storm overhead, a pale band where the storm ends
  const sky = ctx.createLinearGradient(0, elevationY(v, cam, 60), 0, hor);
  sky.addColorStop(0, "#22262f");
  sky.addColorStop(0.45, "#2f3540");
  sky.addColorStop(0.78, "#4b525d");
  sky.addColorStop(0.93, "#7d8288");
  sky.addColorStop(1, "#b9b4a8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, Math.max(0, Math.min(h, hor + 2)));

  // the cloud deck
  for (const p of PUFFS) {
    const x = p.x + o.t * 14;
    const c = v.project([x, p.y, CLOUD_Z]);
    if (!c) continue;
    const s = v.scale(c[2]);
    const rx = p.r * s;
    if (rx < 2 || c[0] + rx < 0 || c[0] - rx > w) continue;
    const dz = Math.abs(CLOUD_Z - camZ);
    const ry = rx * clamp(dz / Math.hypot(c[2], dz), 0.16, 1);
    if (c[1] + ry < 0 || c[1] - ry > hor + 4) continue;
    const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], rx);
    const col: RGB = p.dark > 0.5 ? [22, 25, 32] : [96, 102, 112];
    const a = p.dark > 0.5 ? 0.26 : 0.12;
    const fade = clamp((c[2] - 400) / 800) * (1 - clamp((c[2] - 18000) / 10000));
    g.addColorStop(0, css(col, a * fade));
    g.addColorStop(1, css(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(c[0], c[1], rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // mountains
  for (const r of RIDGES) {
    const top = r.pts;
    const base = top.map((p) => [p[0], p[1], 0] as V3).reverse();
    if (fillPoly(ctx, v.poly([...top, ...base]))) {
      ctx.fillStyle = css(r.c);
      ctx.fill();
    }
  }

  // ground
  if (hor < h) {
    const g = ctx.createLinearGradient(0, hor, 0, h);
    g.addColorStop(0, "#8f948c");
    g.addColorStop(0.06, "#6f7f5c");
    g.addColorStop(0.3, "#54703f");
    g.addColorStop(1, "#46632f");
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.max(0, hor - 1), w, h - Math.max(0, hor - 1));
  }
  // fields, with haze growing with distance; warm low sunlight
  for (const f of FIELDS) {
    const pts = v.poly(f.pts);
    if (pts.length < 3) continue;
    let minx = 1e9;
    let maxx = -1e9;
    let miny = 1e9;
    for (const p of pts) {
      minx = Math.min(minx, p[0]);
      maxx = Math.max(maxx, p[0]);
      miny = Math.min(miny, p[1]);
    }
    if (maxx < 0 || minx > w || miny > h) continue;
    const dist = Math.hypot(f.y, camZ);
    const k = 1 - Math.exp(-dist / 7000);
    const lit: RGB = [f.c[0] * 1.1, f.c[1] * 1.02, f.c[2] * 0.86];
    fillPoly(ctx, pts);
    ctx.fillStyle = css(mix(lit, HAZE, k));
    ctx.fill();
  }
  // river
  if (fillPoly(ctx, v.poly([...RIVER.l, ...[...RIVER.r].reverse()]))) {
    const g = ctx.createLinearGradient(0, hor, 0, h);
    g.addColorStop(0, "#b4b2a8");
    g.addColorStop(0.25, "#8d96a0");
    g.addColorStop(1, "#5d6b78");
    ctx.fillStyle = g;
    ctx.fill();
  }
  // trees
  for (const t of TREES) {
    const b = v.project(t.p);
    if (!b || b[0] < -60 || b[0] > w + 60) continue;
    const s = v.scale(b[2]);
    const top = v.project([t.p[0], t.p[1], t.h]);
    if (!top) continue;
    const r = Math.max(0.6, t.r * s);
    const k = 1 - Math.exp(-Math.hypot(t.p[1], camZ) / 7000);
    const cy = lerp(b[1], top[1], 0.62);
    ctx.fillStyle = css(mix(t.c, HAZE, k));
    ctx.beginPath();
    ctx.ellipse(b[0], cy, r, Math.max(0.6, Math.abs(top[1] - b[1]) * 0.42), 0, 0, Math.PI * 2);
    ctx.fill();
    if (r > 2) {
      ctx.fillRect(b[0] - r * 0.12, cy, r * 0.24, b[1] - cy);
    }
  }

  // the rain veil darkens the ground under the storm
  const mk = masks(v, cam);
  {
    const { c: V, ctx: vc } = layer("veilFill", w, h);
    vc.fillStyle = "rgba(52,60,72,1)";
    vc.fillRect(0, 0, w, h);
    vc.globalCompositeOperation = "destination-in";
    vc.imageSmoothingEnabled = true;
    vc.imageSmoothingQuality = "high";
    vc.drawImage(mk.veil, 0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.62;
    ctx.drawImage(V, 0, 0);
    ctx.restore();
  }

  // the bow
  if (o.bow > 0 || o.bow2 > 0) drawBows(ctx, v, o, w, h, mk.bow);

  // rain streaks in the sunlit rain
  if (o.rain > 0) {
    const { c: R, ctx: rc } = layer("rain", w, h);
    rc.strokeStyle = "rgba(220,226,236,0.5)";
    rc.lineWidth = 1.2;
    rc.beginPath();
    const sp = v.focal / 900;
    for (let i = 0; i < 520; i++) {
      const x0 = hash(i * 1.3) * (w + 200) - 100;
      const len = (20 + 26 * hash(i * 2.9)) * sp;
      const y0 = ((hash(i * 4.1) * (h + len) + o.t * (700 + 300 * hash(i * 7.7)) * sp) % (h + len)) - len;
      rc.moveTo(x0, y0);
      rc.lineTo(x0 - len * 0.14, y0 + len);
    }
    rc.stroke();
    rc.globalCompositeOperation = "destination-in";
    rc.drawImage(mk.bow, 0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.16 * o.rain;
    ctx.drawImage(R, 0, 0);
    ctx.restore();
  }

  // the viewer's shadow and the grass, while the camera is near the ground
  const near = 1 - clamp((camZ - 3) / 12);
  if (near > 0) {
    const k = 1 / Math.tan(o.sunEl * DEG);
    if (o.shadow > 0) {
      const prof: [number, number][] = [
        [0, 0.3],
        [0.85, 0.36],
        [0.92, 0.4],
        [1.25, 0.44],
        [1.42, 0.47],
        [1.47, 0.15],
        [1.52, 0.2],
        [1.62, 0.23],
        [1.72, 0.18],
        [1.77, 0.03],
      ];
      const right = prof.map(([z, wd]) => [wd / 2, z * k, 0] as V3);
      const left = prof.map(([z, wd]) => [-wd / 2, z * k, 0] as V3).reverse();
      ctx.save();
      ctx.filter = "blur(2px)";
      if (fillPoly(ctx, v.poly([...right, ...left]))) {
        ctx.fillStyle = `rgba(16,22,24,${(0.42 * o.shadow * near).toFixed(3)})`;
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.lineCap = "round";
    for (const bl of BLADES) {
      const b = v.project([bl.x, bl.y, 0]);
      if (!b || b[0] < -20 || b[0] > w + 20) continue;
      const tp = v.project([bl.x + bl.lean * bl.h, bl.y, bl.h]);
      if (!tp) continue;
      const s = v.scale(b[2]);
      ctx.strokeStyle = css(bl.c, 0.9 * near);
      ctx.lineWidth = Math.max(0.8, 0.012 * s);
      ctx.beginPath();
      ctx.moveTo(b[0], b[1]);
      ctx.quadraticCurveTo(b[0], lerp(b[1], tp[1], 0.6), tp[0], tp[1]);
      ctx.stroke();
    }
  }

  // "the centre": the shadow of the head, and radii out to the bow
  if (o.mark > 0) {
    const bb = antisolar(o.sunEl);
    const c = v.dir(bb.A);
    if (c) {
      ctx.save();
      ctx.globalAlpha = o.mark;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 12]);
      for (const phi of [20, 55, 90, 125, 160]) {
        const p = v.dir(onCone(bb, 41.6, (phi * Math.PI) / 180));
        if (!p) continue;
        ctx.beginPath();
        ctx.moveTo(c[0], c[1]);
        ctx.lineTo(lerp(c[0], p[0], o.mark), lerp(c[1], p[1], o.mark));
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,236,170,0.95)";
      ctx.beginPath();
      ctx.arc(c[0], c[1], 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,236,170,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c[0], c[1], 26 + 6 * Math.sin(o.t * 4), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // grade: warm light from behind on the ground, a soft vignette
  const vg = ctx.createRadialGradient(w / 2, h * 0.55, h * 0.35, w / 2, h * 0.55, h * 1.05);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/** screen position of the antisolar point (the centre of the bow) */
export const bowCentre = (cam: Cam, sunEl: number) => view(cam).dir(antisolar(sunEl).A);
/** screen position of a point on the bow (angle rho, position phi in radians; phi = π/2 is the top) */
export const bowPoint = (cam: Cam, sunEl: number, rho: number, phi: number) => view(cam).dir(onCone(antisolar(sunEl), rho, phi));
