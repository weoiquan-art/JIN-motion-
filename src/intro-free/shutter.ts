import { T } from "./timeline.ts";

// Hard cuts between scenes: a motion-blur sample never reaches across one.
export const CUTS = [T.nice, T.squeeze, T.stop, T.drop, T.land];

// Frames that get motion blur: a few frames from every whip / slam.
const HITS = [
  ...T.windows,
  T.squeeze,
  ...T.slams,
  T.pour,
  T.chainIn,
  T.toLlm,
  T.toVideo,
  T.noise,
  T.reveal,
  T.drop,
  ...T.accents,
  T.q1b,
  ...T.q2,
  T.q2Last,
  T.thanks,
];

// More samples where the motion is fastest (the beat frame and the next one).
export const shutter = (f: number): number[] => {
  const since = Math.min(...HITS.map((h) => (f >= h ? f - h : Infinity)));
  if (since > 4) return [0];
  const n = since <= 1 ? 14 : 8;
  return new Array(n).fill(0).map((_, i) => {
    const o = -0.25 + (0.5 * i) / (n - 1);
    const cut = CUTS.find((c) => f >= c && f + o < c);
    return cut === undefined ? o : cut - f;
  });
};
