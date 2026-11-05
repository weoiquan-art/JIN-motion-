// Geometric optics of one raindrop (pure functions, no React): the numbers
// the film shows are computed here, not typed in.
//   water:   n(λ) = A + B/λ², a Cauchy fit through n = 1.331 at 700 nm and
//            1.3435 at 400 nm (1.3335 at 589 nm)
//   bows:    primary (1 reflection) 42.4° red … 40.6° violet,
//            secondary (2 reflections) 50.4° red … 53.6° violet

export const DEG = Math.PI / 180;
const A = 1.32494;
const B = 0.0029697; // µm²
export const nWater = (nm: number) => A + B / (nm / 1000) ** 2;

/** angle of the k-th order bow from the antisolar point, degrees */
export const bowAngle = (n: number, k: 1 | 2) => {
  const i = Math.acos(Math.sqrt((n * n - 1) / (k * (k + 2))));
  const r = Math.asin(Math.sin(i) / n);
  const dev = k * Math.PI + 2 * i - 2 * (k + 1) * r;
  return (k === 1 ? Math.PI - dev : dev - Math.PI) / DEG;
};
/** impact parameter (0…1) of the minimum-deviation (Descartes) ray */
export const descartesB = (n: number, k: 1 | 2) => Math.sqrt(1 - (n * n - 1) / (k * (k + 2)));

export type V2 = [number, number];
const refract = (d: V2, nrm: V2, eta: number): V2 => {
  // nrm faces the side the light comes from (d·nrm < 0); eta = n1 / n2
  const cosi = -(d[0] * nrm[0] + d[1] * nrm[1]);
  const k = 1 - eta * eta * (1 - cosi * cosi);
  const c = eta * cosi - Math.sqrt(Math.max(0, k));
  return [eta * d[0] + c * nrm[0], eta * d[1] + c * nrm[1]];
};

/**
 * A ray through a unit circle at the origin. It arrives from the left going
 * +x at height b (y up) and reflects k times inside. Returns the entry point,
 * the reflection points and the exit point, and the exit direction.
 */
export const trace = (b: number, n: number, k: number): { pts: V2[]; out: V2 } => {
  let p: V2 = [-Math.sqrt(Math.max(0, 1 - b * b)), b];
  const pts: V2[] = [p];
  let d = refract([1, 0], p, 1 / n);
  for (let j = 0; j <= k; j++) {
    const s = -2 * (p[0] * d[0] + p[1] * d[1]);
    p = [p[0] + s * d[0], p[1] + s * d[1]];
    pts.push(p);
    if (j < k) {
      const dn = d[0] * p[0] + d[1] * p[1];
      d = [d[0] - 2 * dn * p[0], d[1] - 2 * dn * p[1]];
    }
  }
  return { pts, out: refract(d, [-p[0], -p[1]], n) };
};

/** angle (degrees) between an exit direction and the way back to the sun (−x) */
export const exitAngle = (out: V2) => Math.acos(Math.max(-1, Math.min(1, -out[0]))) / DEG;

/** the wavelengths drawn for a rainbow, violet to red */
export const BANDS = Array.from({ length: 16 }, (_, i) => 400 + i * 20);

export const RED = 700;
export const VIOLET = 400;
export const P_RED = bowAngle(nWater(RED), 1); // 42.37
export const P_VIOLET = bowAngle(nWater(VIOLET), 1); // 40.58
export const S_RED = bowAngle(nWater(RED), 2); // 50.37
export const S_VIOLET = bowAngle(nWater(VIOLET), 2); // 53.61
export const P_MID = bowAngle(nWater(589), 1); // 42.01
export const S_MID = bowAngle(nWater(589), 2); // 51.02
