// A first-person pinhole camera for code-drawn 3D scenes (pure functions, no
// React, so Node scripts can use it too). World: x right, y forward, z up.
// yaw 0 looks along +y, positive yaw turns right; pitch > 0 looks up; no roll,
// so the horizon is always a horizontal line on screen.

export type V3 = readonly [number, number, number];
export type Cam = {
  pos: V3;
  /** degrees */
  yaw: number;
  /** degrees */
  pitch: number;
  /** vertical field of view, degrees */
  fov: number;
  /** frame size in px */
  w: number;
  h: number;
};

const D = Math.PI / 180;
const NEAR = 0.05;

export type View = {
  focal: number;
  /** camera-space coordinates [right, up, forward] of a world point */
  toCam: (p: V3) => V3;
  /** screen x, y and depth of a world point, or null if behind the camera */
  project: (p: V3) => V3 | null;
  /** screen x, y of a direction (a point at infinity), or null if behind */
  dir: (d: V3) => [number, number] | null;
  /** world direction (unit) through a screen point */
  ray: (sx: number, sy: number) => V3;
  /** screen y of the horizon */
  horizon: number;
  /** polygon clipped to the near plane, as screen points */
  poly: (pts: readonly V3[]) => [number, number][];
  /** px per world unit at a depth */
  scale: (depth: number) => number;
};

export const view = (cam: Cam): View => {
  const ps = Math.sin(cam.yaw * D);
  const pc = Math.cos(cam.yaw * D);
  const ts = Math.sin(cam.pitch * D);
  const tc = Math.cos(cam.pitch * D);
  const f: V3 = [ps * tc, pc * tc, ts];
  const r: V3 = [pc, -ps, 0];
  const u: V3 = [-ps * ts, -pc * ts, tc];
  const focal = cam.h / 2 / Math.tan((cam.fov * D) / 2);
  const cx = cam.w / 2;
  const cy = cam.h / 2;
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const toCamDir = (d: V3): V3 => [dot(d, r), dot(d, u), dot(d, f)];
  const toCam = (p: V3): V3 => toCamDir([p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]]);
  const scr = (c: V3): V3 => [cx + (focal * c[0]) / c[2], cy - (focal * c[1]) / c[2], c[2]];
  const cut = (a: V3, b: V3): V3 => {
    const t = (NEAR - a[2]) / (b[2] - a[2]);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR];
  };
  return {
    focal,
    toCam,
    project: (p) => {
      const c = toCam(p);
      return c[2] < NEAR ? null : scr(c);
    },
    dir: (d) => {
      const c = toCamDir(d);
      if (c[2] <= 1e-6) return null;
      return [cx + (focal * c[0]) / c[2], cy - (focal * c[1]) / c[2]];
    },
    ray: (sx, sy) => {
      const x = (sx - cx) / focal;
      const y = (cy - sy) / focal;
      const d: V3 = [r[0] * x + u[0] * y + f[0], r[1] * x + u[1] * y + f[1], r[2] * x + u[2] * y + f[2]];
      const l = Math.hypot(d[0], d[1], d[2]);
      return [d[0] / l, d[1] / l, d[2] / l];
    },
    horizon: cy + focal * Math.tan(cam.pitch * D),
    poly: (pts) => {
      const cs = pts.map(toCam);
      const out: V3[] = [];
      for (let i = 0; i < cs.length; i++) {
        const a = cs[i];
        const b = cs[(i + 1) % cs.length];
        if (a[2] >= NEAR) out.push(a);
        if (a[2] >= NEAR !== b[2] >= NEAR) out.push(cut(a, b));
      }
      return out.map((c) => {
        const s = scr(c);
        return [s[0], s[1]];
      });
    },
    scale: (depth) => focal / Math.max(NEAR, depth),
  };
};

/** a camera at `pos` looking at `target` */
export const lookAt = (pos: V3, target: V3, fov: number, w: number, h: number): Cam => {
  const dx = target[0] - pos[0];
  const dy = target[1] - pos[1];
  const dz = target[2] - pos[2];
  return { pos, yaw: Math.atan2(dx, dy) / D, pitch: Math.atan2(dz, Math.hypot(dx, dy)) / D, fov, w, h };
};

/** unit direction from elevation and azimuth (degrees; azimuth 0 = +y, 90 = +x) */
export const dirOf = (el: number, az: number): V3 => [Math.cos(el * D) * Math.sin(az * D), Math.cos(el * D) * Math.cos(az * D), Math.sin(el * D)];
