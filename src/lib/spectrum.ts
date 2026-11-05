// Colour of monochromatic light (pure functions). CIE 1931 colour-matching
// functions from the analytic fit of Wyman, Sloan & Shirley (2013), then
// linear sRGB; spectral colours are outside sRGB, so negatives are clipped
// and the result is scaled to a maximum of 1 before gamma.

const g = (x: number, mu: number, s1: number, s2: number) => {
  const t = (x - mu) / (x < mu ? s1 : s2);
  return Math.exp(-0.5 * t * t);
};

export const xyz = (nm: number): [number, number, number] => [
  1.056 * g(nm, 599.8, 37.9, 31.0) + 0.362 * g(nm, 442.0, 16.0, 26.7) - 0.065 * g(nm, 501.1, 20.4, 26.2),
  0.821 * g(nm, 568.8, 46.9, 40.5) + 0.286 * g(nm, 530.9, 16.3, 31.1),
  1.217 * g(nm, 437.0, 11.8, 36.0) + 0.681 * g(nm, 459.0, 26.0, 13.8),
];

/** linear sRGB of light of one wavelength (not normalised; can be negative) */
export const linRgb = (nm: number): [number, number, number] => {
  const [X, Y, Z] = xyz(nm);
  return [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z];
};

const gamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

/** display colour (0–255) of a wavelength, at full saturation the screen can show */
export const spectral = (nm: number, desat = 0.12): [number, number, number] => {
  const c = linRgb(nm).map((v) => Math.max(0, v));
  const m = Math.max(...c, 1e-6);
  return c.map((v) => Math.round(255 * gamma(Math.min(1, v / m + desat) / (1 + desat)))) as [number, number, number];
};

export const rgba = (c: readonly number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
