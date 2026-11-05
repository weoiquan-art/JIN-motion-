// "彩虹为什么是圆的" — an 80 s science short, 1920×1080, cut to a 90 BPM
// soundtrack made in code (scripts/gen-audio-rainbow.ts). Three kinds of
// picture, all drawn on one canvas per frame: the landscape (land.ts), the
// magnified raindrop (lab.ts, labShots.ts) and the 3D cone (cone.ts).
// Scenes, captions and cues come from timeline.ts.

import React from "react";
import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from "remotion";
import { clamp, easeIn, easeInOut, easeOut, inv, lerp } from "../intro-free/anim";
import { FrameCanvas } from "../lib/FrameCanvas";
import { lookAt, type Cam, type V3 } from "../lib/cam3d";
import { drawCone, type Person } from "./cone";
import { ZH_SANS, ZH_SERIF } from "./fonts";
import { label } from "./lab";
import { drawDropShot, drawTwoBounce } from "./labShots";
import { bowCentre, bowPoint, drawLand } from "./land";
import { P_RED, P_VIOLET, S_MID } from "./optics";
import { groundLand, hookCam, hookLand } from "./shots";
import { CAPTIONS, CREDIT, DURATION, END_TITLE, FPS, HEIGHT, M, SUN_EL, TITLE, WIDTH } from "./timeline";

const W = WIDTH;
const H = HEIGHT;

// ------------------------------------------------------------------ landscape shots
// the title holds on the circle, drifting a little; then a dive into the bow
const titleCam = (frame: number): Cam => {
  const base = hookCam(frame);
  const drift = (frame - M.riseEnd) / FPS;
  const dive = easeIn(inv(M.dive, M.dropIn, frame));
  const cam = { ...base, yaw: base.yaw + 0.6 * Math.sin(drift * 0.5), fov: lerp(base.fov, 4, dive) };
  if (dive > 0) {
    // aim at a point on the bow (upper left) while zooming in
    const p = bowPoint(base, SUN_EL, 41.8, (150 * Math.PI) / 180);
    if (p) {
      const dx = (p[0] - W / 2) / (H / 2 / Math.tan((base.fov * Math.PI) / 360));
      const dy = (H / 2 - p[1]) / (H / 2 / Math.tan((base.fov * Math.PI) / 360));
      cam.yaw += (Math.atan(dx) * 180) / Math.PI * easeOut(clamp(dive * 1.6));
      cam.pitch += (Math.atan(dy) * 180) / Math.PI * easeOut(clamp(dive * 1.6));
    }
  }
  return cam;
};

const telephoto = (): Cam => ({ pos: [0, 0, 1.6], yaw: 0, pitch: 42 - SUN_EL - 0.9, fov: 8, w: W, h: H });
const doubleCam = (frame: number): Cam => ({ pos: [0, 0, 1.6], yaw: 0, pitch: lerp(14, 11, easeInOut(inv(M.doubleSky, M.ending, frame))), fov: lerp(80, 74, easeInOut(inv(M.doubleSky, M.ending, frame))), w: W, h: H });
const endCam = (frame: number): Cam => {
  const k = easeInOut(inv(M.ending, M.centre + 20, frame));
  return { pos: [0, 0, 1.6], yaw: 0, pitch: lerp(11, 4, k), fov: lerp(74, 78, k), w: W, h: H };
};

// ------------------------------------------------------------------ cone shots
// side view → orbit behind the viewer → into their eye (first person: the
// cone is an exact circle, colours in rings) → the sun climbs → back out to a
// wide view for the second person
const PIVOT: V3 = [0, 8, 1.5];
const EYE_Z = 1.62;
const orbitPos = (deg: number, r: number, z: number): V3 => [PIVOT[0] + r * Math.cos((deg * Math.PI) / 180), PIVOT[1] + r * Math.sin((deg * Math.PI) / 180), z];
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const FP_TARGET: V3 = [0, 10, EYE_Z - 10 * Math.tan((SUN_EL * Math.PI) / 180)];
const coneShot = (frame: number): { cam: Cam; inside: number } => {
  const side = { pos: orbitPos(0, 19, 3.2), target: [0, 7.5, 1.3] as V3, fov: 50 };
  const behind = { pos: [0, -4.2, 1.95] as V3, target: FP_TARGET, fov: 70 };
  const eye = { pos: [0, 0.02, EYE_Z] as V3, target: FP_TARGET, fov: 100 };
  const wide = { pos: [20, -15, 13] as V3, target: [2.5, 11, 1] as V3, fov: 46 };
  if (frame < M.orbit) return { cam: lookAt(side.pos, side.target, side.fov, W, H), inside: 0 };
  if (frame < M.second) {
    const k = easeInOut(inv(M.orbit, M.orbitEnd, frame));
    if (k < 0.72) {
      const q = easeInOut(k / 0.72);
      const pos = orbitPos(lerp(0, -90, q), lerp(19, 12.2, q), lerp(side.pos[2], behind.pos[2], q));
      return { cam: lookAt(pos, lerp3(side.target, behind.target, q), lerp(side.fov, behind.fov, q), W, H), inside: 0 };
    }
    const q = easeInOut((k - 0.72) / 0.28);
    return { cam: lookAt(lerp3(behind.pos, eye.pos, q), FP_TARGET, lerp(behind.fov, eye.fov, q), W, H), inside: q };
  }
  const k = easeInOut(inv(M.second, M.second + 34, frame));
  return { cam: lookAt(lerp3(eye.pos, wide.pos, k), lerp3(FP_TARGET, wide.target, k), lerp(eye.fov, wide.fov, k), W, H), inside: 1 - k };
};
const coneSun = (frame: number) => {
  if (frame < M.second) return lerp(SUN_EL, 50, easeInOut(inv(M.sunUp, M.sunUpEnd, frame)));
  return lerp(50, SUN_EL, easeInOut(inv(M.second, M.second + 16, frame)));
};
const GOLD = [255, 214, 120];
const CYAN = [120, 220, 255];
const conePeople = (frame: number, inside: number): Person[] => {
  const walkK = easeInOut(inv(M.walk, M.walk + 64, frame));
  const own = easeInOut(inv(M.second, M.second + 20, frame));
  return [
    {
      x: 0,
      y: lerp(0, 6, walkK),
      show: 1,
      body: 1 - clamp(inside * 3),
      ring: easeOut(inv(M.coneIn + 30, M.coneIn + 60, frame)),
      tint: GOLD,
      walk: walkK > 0 && walkK < 1 ? ((frame - M.walk) / 10) % 2 : 0,
      // gold while we look from the side, true colours from the eye, gold again for "whose drops"
      tinted: Math.max(1 - clamp(inside * 1.5), own),
    },
    { x: 5, y: 0, show: own, body: 1, ring: easeOut(inv(M.second + 10, M.second + 30, frame)), tint: CYAN, walk: 0, tinted: 1 },
  ];
};

// ------------------------------------------------------------------ one frame of picture
type Draw = (ctx: CanvasRenderingContext2D) => void;

const sceneAt = (frame: number): Draw => {
  if (frame < M.dropIn) {
    const opts = frame < M.riseEnd ? hookLand(frame) : { ...hookLand(frame), cam: titleCam(frame) };
    return (ctx) => drawLand(ctx, opts);
  }
  if (frame < M.order) return (ctx) => drawDropShot(ctx, frame, W, H);
  if (frame < M.coneIn) {
    const cam = telephoto();
    return (ctx) => {
      drawLand(ctx, { ...groundLand(frame, {}), cam, rain: 0.6, shadow: 0 });
      const k = easeOut(inv(M.order + 8, M.order + 22, frame));
      const red = bowPoint(cam, SUN_EL, P_RED + 0.3, Math.PI / 2);
      const vio = bowPoint(cam, SUN_EL, P_VIOLET - 0.34, Math.PI / 2);
      if (red && vio && k > 0) {
        ctx.save();
        ctx.globalAlpha = k;
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 3;
        for (const [p, dy] of [
          [red, -150],
          [vio, 150],
        ] as const) {
          ctx.beginPath();
          ctx.moveTo(p[0] + 220, p[1]);
          ctx.lineTo(p[0] + 220, p[1] + dy * 0.62);
          ctx.stroke();
        }
        ctx.restore();
        label(ctx, `外圈 · 红光 ${P_RED.toFixed(1)}°`, red[0] + 240, red[1] - 120, 48, k, "rgba(255,170,150,1)", "left", 700);
        label(ctx, `内圈 · 紫光 ${P_VIOLET.toFixed(1)}°`, vio[0] + 240, vio[1] + 120, 48, k, "rgba(205,180,255,1)", "left", 700);
      }
    };
  }
  if (frame < M.twoBounce) {
    const own = frame >= M.second;
    const shot = coneShot(frame);
    return (ctx) =>
      drawCone(ctx, {
        cam: shot.cam,
        sunEl: coneSun(frame),
        people: conePeople(frame, shot.inside),
        firstPerson: shot.inside,
        slice: 1 - easeInOut(inv(M.orbit + 10, M.orbit + 50, frame)),
        angle: easeOut(inv(M.coneIn + 40, M.coneIn + 60, frame)) * (1 - clamp(inv(M.orbit, M.orbit + 16, frame))),
        axis: easeOut(inv(M.coneIn + 10, M.coneIn + 30, frame)) * (own ? 1 - clamp(inv(M.second, M.second + 10, frame)) : 1),
        below: easeOut(inv(M.ground, M.ground + 20, frame)),
        gauge: clamp(inv(M.sunUp - 10, M.sunUp + 6, frame)) * (1 - clamp(inv(M.second, M.second + 10, frame))),
        t: frame / FPS,
      });
  }
  if (frame < M.doubleSky) return (ctx) => drawTwoBounce(ctx, frame, W, H);
  if (frame < M.ending) {
    const cam = doubleCam(frame);
    return (ctx) => {
      drawLand(ctx, { ...groundLand(frame, {}), cam, bow2: easeOut(inv(M.doubleSky, M.doubleSky + 30, frame)) });
      const k = easeOut(inv(M.doubleSky + 30, M.doubleSky + 44, frame));
      const p1 = bowPoint(cam, SUN_EL, 42, (148 * Math.PI) / 180);
      const p2 = bowPoint(cam, SUN_EL, S_MID, (140 * Math.PI) / 180);
      const pd = bowPoint(cam, SUN_EL, 46.6, (100 * Math.PI) / 180);
      if (p1) label(ctx, "主虹 42°", p1[0] + 40, p1[1] + 30, 40, k, "rgba(255,255,255,0.95)", "left", 700);
      if (p2) label(ctx, "副虹 51°", p2[0] - 30, p2[1] - 34, 40, k, "rgba(255,255,255,0.95)", "right", 700);
      if (pd) label(ctx, "亚历山大暗带", pd[0], pd[1], 38, easeOut(inv(M.darkBand, M.darkBand + 14, frame)), "rgba(255,236,170,1)", "center", 700);
    };
  }
  const cam = endCam(frame);
  return (ctx) => {
    drawLand(ctx, { ...groundLand(frame, {}), cam, bow2: 0.8, mark: easeInOut(inv(M.centre, M.centre + 26, frame)) * (1 - clamp(inv(M.endTitle, M.endTitle + 16, frame))) });
    const c = bowCentre(cam, SUN_EL);
    const k = easeOut(inv(M.centre + 14, M.centre + 28, frame)) * (1 - clamp(inv(M.endTitle, M.endTitle + 16, frame)));
    if (c) label(ctx, "圆心：你头部的影子", c[0] + 40, c[1] - 40, 40, k, "rgba(255,236,170,1)", "left", 700);
  };
};

// crossfades between kinds of picture
const CUTS = [
  { at: M.order, len: 10 },
  { at: M.coneIn, len: 12 },
  { at: M.twoBounce, len: 10 },
  { at: M.doubleSky, len: 12 },
];
const pool: { c?: HTMLCanvasElement } = {};
const drawFrame = (ctx: CanvasRenderingContext2D, frame: number) => {
  const cut = CUTS.find((c) => frame >= c.at - c.len / 2 && frame < c.at + c.len / 2);
  if (!cut) sceneAt(frame)(ctx);
  else {
    // the old scene holds its last frame while the new one fades in over it
    sceneAt(Math.min(frame, cut.at - 1))(ctx);
    if (!pool.c) {
      pool.c = document.createElement("canvas");
      pool.c.width = W;
      pool.c.height = H;
    }
    const o = pool.c.getContext("2d") as CanvasRenderingContext2D;
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.globalAlpha = 1;
    o.globalCompositeOperation = "source-over";
    o.filter = "none";
    o.clearRect(0, 0, W, H);
    sceneAt(Math.max(frame, cut.at))(o);
    ctx.save();
    ctx.globalAlpha = easeInOut(clamp((frame - (cut.at - cut.len / 2)) / cut.len));
    ctx.drawImage(pool.c, 0, 0);
    ctx.restore();
  }
  // the flash of the dive into the drop
  const flash = frame < M.dropIn ? easeIn(inv(M.dropIn - 14, M.dropIn, frame)) : Math.exp(-(frame - M.dropIn) / 5);
  if (flash > 0.01) {
    ctx.fillStyle = `rgba(255,252,240,${(0.92 * flash).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
  // fade in and out
  const black = Math.max(1 - clamp(frame / 16), easeInOut(inv(M.fadeOut, DURATION - 4, frame)));
  if (black > 0) {
    ctx.fillStyle = `rgba(0,0,0,${black.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
};

// ------------------------------------------------------------------ text
const Caption: React.FC<{ frame: number }> = ({ frame }) => {
  const c = CAPTIONS.find((x) => frame >= x.from - 2 && frame < x.to + 8);
  if (!c) return null;
  const k = easeOut(clamp((frame - c.from) / 9)) * (1 - easeIn(clamp((frame - c.to) / 8)));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 64,
        textAlign: "center",
        fontFamily: ZH_SANS,
        fontWeight: 600,
        fontSize: 52,
        color: "#fff",
        letterSpacing: "0.04em",
        opacity: k,
        translate: `0 ${(1 - k) * 16}px`,
        textShadow: "0 2px 18px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.6)",
      }}
    >
      {c.text}
    </div>
  );
};

const Title: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame - M.title;
  if (t < 0 || frame > M.dropIn) return null;
  const out = easeIn(inv(M.dive, M.dive + 16, frame));
  const lines = ["彩虹", TITLE.slice(2)];
  let n = 0;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: 1 - out, scale: `${1 + 0.4 * out}` }}>
      {lines.map((line, li) => (
        <div
          key={li}
          style={{
            fontFamily: ZH_SERIF,
            fontWeight: 800,
            fontSize: li ? 84 : 150,
            lineHeight: 1.25,
            color: "#fff",
            letterSpacing: li ? "0.08em" : "0.2em",
            textShadow: "0 0 40px rgba(255,240,210,0.45), 0 4px 30px rgba(0,0,0,0.6)",
          }}
        >
          {[...line].map((ch) => {
            const i = n++;
            const k = easeOut(clamp((t - i * 2.5) / 10));
            return (
              <span key={i} style={{ display: "inline-block", opacity: k, translate: `0 ${(1 - k) * 30}px` }}>
                {ch}
              </span>
            );
          })}
        </div>
      ))}
    </AbsoluteFill>
  );
};

const EndTitle: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame - M.endTitle;
  if (t < 0) return null;
  const k = easeOut(clamp(t / 20));
  const k2 = easeOut(clamp((t - 8) / 20));
  const c = easeOut(clamp((t - 30) / 16));
  const style = (a: number): React.CSSProperties => ({
    fontFamily: ZH_SERIF,
    fontWeight: 800,
    fontSize: 92,
    lineHeight: 1.3,
    color: "#fff",
    letterSpacing: "0.1em",
    opacity: a,
    translate: `0 ${(1 - a) * 24}px`,
    textShadow: "0 0 36px rgba(255,240,210,0.4), 0 4px 30px rgba(0,0,0,0.75)",
  });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
      <div style={style(k)}>{END_TITLE.slice(0, 3)}</div>
      <div style={style(k2)}>{END_TITLE.slice(3)}</div>
      <div style={{ marginTop: 26, fontFamily: ZH_SANS, fontWeight: 600, fontSize: 38, color: "rgba(255,255,255,0.9)", letterSpacing: "0.2em", opacity: c, textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}>{CREDIT}</div>
    </AbsoluteFill>
  );
};

export const Rainbow: React.FC = () => {
  const frame = useCurrentFrame();
  const hideCaptions = frame >= M.endTitle;
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070c" }}>
      <FrameCanvas width={W} height={H} draw={(ctx) => drawFrame(ctx, frame)} />
      <Title frame={frame} />
      {hideCaptions ? null : <Caption frame={frame} />}
      <EndTitle frame={frame} />
      {AUDIO ? <Html5Audio src={staticFile("audio/rainbow.wav")} /> : null}
    </AbsoluteFill>
  );
};
const AUDIO = true;
