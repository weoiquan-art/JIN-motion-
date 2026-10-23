// A pinhole camera over the flat map, for the map shots (MapWorld.tsx). It
// looks at a point of the map from a heading (yaw) and a tilt, the way a
// drone would. Map coordinates are the px of the projection below (x east,
// y south); z is height in the same px. Everything here is a pure function of
// the camera, so it holds for fractional frames.

import { ISLAND, MAINLAND } from "../butterworth/geo";

// ------------------------------------------------------------ map projection
// Equirectangular × cos(lat), 3600 px per degree of latitude (1 km ≈ 32 px).
const LON0 = 100.33;
const LAT0 = 5.37;
const K = 3600;
const COS = Math.cos((LAT0 * Math.PI) / 180);
export type Pt = readonly [number, number];
export const P = ([lon, lat]: Pt): [number, number] => [960 + (lon - LON0) * COS * K, 540 - (lat - LAT0) * K];
export const KM = (K / 111.2) * 1; // map px per km (north-south)

// Closed Catmull-Rom spline through the points, `per` samples per segment.
const spline = (pts: readonly Pt[], closed: boolean, per: number): [number, number][] => {
  const n = pts.length;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const out: [number, number][] = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push([...pts[n - 1]] as [number, number]);
  return out;
};

export const ISLAND_PTS = spline(ISLAND.map(P), true, 7);
// The mainland coast is smoothed; the two far corners that close the
// polygon in the east stay straight.
export const MAINLAND_PTS = [...spline(MAINLAND.slice(0, -2).map(P), false, 7), ...MAINLAND.slice(-2).map(P)];

export const inside = (poly: readonly Pt[], x: number, y: number) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

// ------------------------------------------------------------------ camera
export type MapCam = {
  readonly x: number;
  readonly y: number;
  /** screen px per map px at the point looked at */
  readonly zoom: number;
  /** heading in degrees (0 = north up) */
  readonly yaw: number;
  /** 0 = straight down, 70 = low over the water */
  readonly tilt: number;
};

export const FOCAL = 1500;
const CX = 960;
const CY = 540;
const NEAR = 12;

export type V3 = [number, number, number];

export type View = {
  /** screen x, y and depth of a map point, or null behind the camera */
  project: (x: number, y: number, z?: number) => V3 | null;
  /** SVG path of a polyline / polygon on the map at height z, clipped to the near plane */
  path: (pts: readonly Pt[], closed: boolean, z?: number) => string;
  /** screen px per map px at a depth */
  scaleAt: (depth: number) => number;
  /** screen y of the horizon (far above the frame when looking down) */
  horizon: number;
  /** camera position in map px */
  eye: V3;
};

export const makeView = (cam: MapCam): View => {
  const psi = (cam.yaw * Math.PI) / 180;
  const th = (Math.min(80, Math.max(0, cam.tilt)) * Math.PI) / 180;
  const D = FOCAL / Math.max(0.05, cam.zoom);
  const sp = Math.sin(psi);
  const cp = Math.cos(psi);
  const st = Math.sin(th);
  const ct = Math.cos(th);
  // the camera sits behind and above the point it looks at
  const ex = cam.x - sp * D * st;
  const ey = cam.y + cp * D * st;
  const ez = D * ct;
  const toCam = (x: number, y: number, z: number): V3 => {
    const dx = x - ex;
    const dy = y - ey;
    const dz = z - ez;
    return [dx * cp + dy * sp, dx * sp * ct - dy * cp * ct + dz * st, dx * sp * st - dy * cp * st - dz * ct];
  };
  const scr = (c: V3): V3 => [CX + (FOCAL * c[0]) / c[2], CY - (FOCAL * c[1]) / c[2], c[2]];
  const cut = (a: V3, b: V3): V3 => {
    const t = (NEAR - a[2]) / (b[2] - a[2]);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR];
  };
  const fmt = (c: V3, cmd: string) => {
    const s = scr(c);
    return `${cmd}${s[0].toFixed(1)} ${s[1].toFixed(1)}`;
  };
  const path = (pts: readonly Pt[], closed: boolean, z = 0) => {
    const cs = pts.map(([x, y]) => toCam(x, y, z));
    if (closed) {
      // Sutherland–Hodgman against the near plane
      const out: V3[] = [];
      for (let i = 0; i < cs.length; i++) {
        const a = cs[i];
        const b = cs[(i + 1) % cs.length];
        if (a[2] >= NEAR) out.push(a);
        if (a[2] >= NEAR !== b[2] >= NEAR) out.push(cut(a, b));
      }
      return out.length < 3 ? "" : out.map((c, i) => fmt(c, i ? "L" : "M")).join("") + "Z";
    }
    let d = "";
    let pen = false;
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i];
      if (a[2] >= NEAR) {
        d += fmt(a, pen ? "L" : "M");
        pen = true;
      }
      const b = cs[i + 1];
      if (b && a[2] >= NEAR !== b[2] >= NEAR) {
        d += fmt(cut(a, b), pen ? "L" : "M");
        pen = b[2] >= NEAR;
      }
    }
    return d;
  };
  return {
    project: (x, y, z = 0) => {
      const c = toCam(x, y, z);
      return c[2] < NEAR ? null : scr(c);
    },
    path,
    scaleAt: (depth) => FOCAL / Math.max(NEAR, depth),
    horizon: st < 1e-4 ? -1e5 : CY - (FOCAL * ct) / st,
    eye: [ex, ey, ez],
  };
};

// Length-parametrised polyline: point at distance s, total length.
export const polyline = (pts: readonly Pt[]) => {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const length = acc[acc.length - 1];
  const at = (s: number): [number, number] => {
    const d = Math.max(0, Math.min(length, s));
    let i = 1;
    while (i < acc.length - 1 && acc[i] < d) i++;
    const t = (d - acc[i - 1]) / Math.max(1e-9, acc[i] - acc[i - 1]);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
  };
  // the part of the line from 0 to s, as points
  const upTo = (s: number): [number, number][] => {
    const d = Math.max(0, Math.min(length, s));
    const out: [number, number][] = [[...pts[0]] as [number, number]];
    for (let i = 1; i < pts.length && acc[i] < d; i++) out.push([...pts[i]] as [number, number]);
    out.push(at(d));
    return out;
  };
  return { length, at, upTo };
};
