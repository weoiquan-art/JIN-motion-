import { easeInOut, inv, lerp } from "../intro/math";
import { PAN_LEAD, PAN_TAIL, SCENES } from "./timeline";

// The day is one horizontal strip: scene i is centred at i * SPAN on the near
// layer. The camera drifts slowly while a scene holds and whip-pans to the
// next one around each bar line.
export const SPAN = 2400;
export const DRIFT = 90;

export const sceneX = (i: number) => i * SPAN;

export const camX = (f: number) => {
  const last = SCENES.length - 1;
  for (let i = 0; i <= last; i++) {
    const s = SCENES[i];
    const holdFrom = i === 0 ? s.from : s.from + PAN_TAIL;
    const holdTo = i === last ? s.to : s.to - PAN_LEAD;
    if (f < holdFrom) {
      if (i === 0) return sceneX(0) - DRIFT;
      // whip pan from the previous scene's drift end to this one's start
      const t = easeInOut(inv(SCENES[i - 1].to - PAN_LEAD, holdFrom, f));
      return lerp(sceneX(i - 1) + DRIFT, sceneX(i) - DRIFT, t);
    }
    if (f <= holdTo) return lerp(sceneX(i) - DRIFT, sceneX(i) + DRIFT, inv(holdFrom, holdTo, f));
  }
  return sceneX(last) + DRIFT;
};

// Slow push-in while a scene holds, eased back out across the pan.
export const camZ = (f: number) => {
  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i];
    if (f < s.to - PAN_LEAD || i === SCENES.length - 1) {
      const from = i === 0 ? s.from : s.from + PAN_TAIL;
      const back = i === 0 ? 1 : lerp(1.05, 1, easeInOut(inv(SCENES[i - 1].to - PAN_LEAD, from, f)));
      return f < from ? back : lerp(1, 1.05, inv(from, s.to - PAN_LEAD, f));
    }
  }
  return 1;
};

// Camera position relative to scene i (0 = centred on it).
export const sceneDx = (f: number, i: number) => camX(f) - sceneX(i);

// Pan speed in px/frame, for motion blur and whoosh placement.
export const panSpeed = (f: number) => Math.abs(camX(f + 0.5) - camX(f - 0.5));
