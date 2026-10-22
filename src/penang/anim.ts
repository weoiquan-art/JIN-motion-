// Curves for PenangBridge. The beat curves (whip, pop) and the deterministic
// noise come from IntroFree; the envelopes below drive the light effects.
// All of them accept fractional frames.

import { clamp } from "../intro-free/anim.ts";

export { clamp, easeIn, easeInOut, easeOut, hash, inv, lerp, noise1, pop, whip } from "../intro-free/anim.ts";

// A light hit that starts on a beat (t = frames since the beat): nothing
// before t = −0.75, full by t = 0.75 (so the beat frame carries the jump),
// then an exponential decay over `decay` frames.
export const hitEnv = (t: number, decay = 8) => {
  if (t <= -0.75) return 0;
  return clamp((t + 0.75) / 1.5) * Math.exp(-Math.max(0, t - 0.75) / decay);
};

// A camera "kick" on a beat: rises to its peak a frame after the beat and
// settles within ~10 frames.
export const kickEnv = (t: number) => {
  if (t <= -0.75) return 0;
  return clamp((t + 0.75) / 2) * Math.exp(-Math.max(0, t - 1.25) / 4.5);
};

// Gentle in-out for long camera drifts (no stop at the ends).
export const drift = (p: number) => {
  const x = clamp(p);
  return x - Math.sin(2 * Math.PI * x) / (2 * Math.PI) * 0.35;
};
