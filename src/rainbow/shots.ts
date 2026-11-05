// Camera and lighting of the landscape shots as functions of the frame.
import { clamp, easeInOut, inv, lerp } from "../intro-free/anim.ts";
import type { Cam } from "../lib/cam3d.ts";
import type { LandOpts } from "./land.ts";
import { FPS, HEIGHT, M, SUN_EL, WIDTH } from "./timeline.ts";

const ground = (fov = 62, pitch = 8): Cam => ({ pos: [0, 0, 1.6], yaw: 0, pitch, fov, w: WIDTH, h: HEIGHT });

/** the opening: on the ground, then a crane up until the circle is closed */
export const hookCam = (frame: number): Cam => {
  const p = easeInOut(inv(M.rise, M.riseEnd, frame));
  const q = easeInOut(clamp(p * 1.08));
  return {
    pos: [0, 0, 1.6 * Math.pow(1400 / 1.6, q)],
    yaw: 0,
    pitch: lerp(8, -SUN_EL, p),
    fov: lerp(62, 100, p),
    w: WIDTH,
    h: HEIGHT,
  };
};

export const hookLand = (frame: number): LandOpts => ({
  cam: hookCam(frame),
  t: frame / FPS,
  sunEl: SUN_EL,
  bow: clamp(inv(M.bowIn, M.bowIn + 50, frame)),
  bow2: 0,
  shadow: 1,
  mark: 0,
  rain: 1,
});

export const groundLand = (frame: number, extra: Partial<LandOpts> & { fov?: number; pitch?: number }): LandOpts => ({
  cam: ground(extra.fov, extra.pitch),
  t: frame / FPS,
  sunEl: SUN_EL,
  bow: 1,
  bow2: 0,
  shadow: 1,
  mark: 0,
  rain: 1,
  ...extra,
});
