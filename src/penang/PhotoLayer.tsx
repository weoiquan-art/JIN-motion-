// Picture layer: every shot of `props.shots`, in order, with its camera move
// and the transition into it. Shot boundaries are beats (clock.cut), so every
// cut lands on the frame nearest to a beat of the BGM. Photos fill the frame
// and keep moving (push, pull, pan, tilt, a little roll); the code-drawn shots
// (map, sunset, night, closure) get the same camera move as props.

import React, { useMemo } from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { clamp, drift, easeIn, easeInOut, easeOut, hash, inv, lerp, noise1, whip } from "./anim";
import type { Clock } from "./beats";
import { MapWorld } from "./MapWorld";
import { CrowdScene } from "./crowd";
import { FerryScene, JettyScene } from "./ferries";
import { BuildScene, ClosureScene, NightScene, type SceneProps, SunsetScene } from "./scenes";
import type { Move, PenangProps, Shot } from "./schema";

type Enter = Shot["enter"];
type Look = PenangProps["look"];

// Frames a shot is shown before its own start (fading in under the cut)
// and after the next shot starts (moving out).
const PRE: Record<Enter, number> = { cut: 0, flash: 0, whip: 0, whipUp: 0, leak: 6, zoom: 0, fade: 8, dark: 0 };
const POST: Record<Enter, number> = { cut: 0, flash: 0, whip: 9, whipUp: 9, leak: 8, zoom: 10, fade: 8, dark: 0 };

export type Slot = {
  readonly shot: Shot;
  readonly start: number;
  readonly end: number;
  readonly next: Shot | null;
  readonly nextStart: number;
};

// Shot frames, clamped to the film: a shot may start before beat 0 (the
// opening frames, before the first downbeat) or run past the end of a loop.
export const schedule = (shots: readonly Shot[], clock: Clock): Slot[] => {
  const cut = (beat: number) => Math.min(clock.durationInFrames, Math.max(0, clock.cut(beat)));
  return shots.map((shot, i) => {
    const next = shots[i + 1] ?? null;
    const end = cut(shot.at + shot.beats);
    return { shot, start: cut(shot.at), end, next, nextStart: next ? cut(next.at) : end };
  });
};

// Eased progress of the camera move: p = linear progress over the shot,
// tMid = frames since the shot's middle beat.
const easeOf = (shot: Shot, p: number, tMid: number) => {
  if (shot.ease === "inOut") return easeInOut(p);
  if (shot.ease === "linear") return clamp(p);
  // from rest, faster and faster (a dive into the next downbeat)
  if (shot.ease === "accel") return Math.pow(clamp(p), 2.6);
  if (shot.ease === "swoop") {
    // drift a little for the first half, then fly to the end on the middle beat
    return lerp(0.08 * clamp(p * 2), 1, whip(tMid, 0.2, 14));
  }
  return drift(p);
};

const mix = (a: Move, b: Move, e: number): Move => ({
  x: lerp(a.x, b.x, e),
  y: lerp(a.y, b.y, e),
  scale: lerp(a.scale, b.scale, e),
  rotate: lerp(a.rotate, b.rotate, e),
  tilt: lerp(a.tilt, b.tilt, e),
});

type TState = { opacity: number; tx: number; ty: number; scale: number; smearX: number; smearY: number; black: number };
const IDENTITY: TState = { opacity: 1, tx: 0, ty: 0, scale: 1, smearX: 0, smearY: 0, black: 0 };

const W = 1920 * 1.06;
const H = 1080 * 1.1;

// t = frames since this shot's own start
const incoming = (enter: Enter, t: number): TState => {
  // distance moved since the previous frame, so the frame before the beat stays sharp
  const speed = (fn: (x: number) => number) => fn(t) - fn(t - 1);
  switch (enter) {
    case "whip": {
      const u = (x: number) => whip(x, 0.25, 8);
      return { ...IDENTITY, tx: (1 - u(t)) * W, smearX: -speed(u) * W };
    }
    case "whipUp": {
      const u = (x: number) => whip(x, 0.25, 8);
      return { ...IDENTITY, ty: (1 - u(t)) * H, smearY: -speed(u) * H };
    }
    case "leak":
      return { ...IDENTITY, opacity: easeInOut(inv(-6, 6, t)) };
    case "zoom":
      // mostly in on the beat frame itself, so that frame carries the jump
      return { ...IDENTITY, scale: lerp(1.35, 1, whip(t, 0.15, 10)), opacity: inv(-0.75, 0.4, t) };
    case "fade":
      return { ...IDENTITY, opacity: easeInOut(inv(-8, 8, t)) };
    case "dark":
      return { ...IDENTITY, black: 1 - easeOut(inv(0, 14, t)) };
    default:
      return IDENTITY;
  }
};

// t = frames since the *next* shot's start
const outgoing = (nextEnter: Enter, t: number): TState => {
  // distance moved since the previous frame, so the frame before the beat stays sharp
  const speed = (fn: (x: number) => number) => fn(t) - fn(t - 1);
  switch (nextEnter) {
    case "whip": {
      const u = (x: number) => whip(x, 0.25, 8);
      return { ...IDENTITY, tx: -u(t) * W, smearX: -speed(u) * W };
    }
    case "whipUp": {
      const u = (x: number) => whip(x, 0.25, 8);
      return { ...IDENTITY, ty: -u(t) * H, smearY: -speed(u) * H };
    }
    case "zoom":
      return { ...IDENTITY, scale: lerp(1, 1.7, easeIn(inv(-0.75, 10, t))), opacity: 1 - inv(0, 9, t) };
    case "dark":
      return { ...IDENTITY, black: easeIn(inv(-14, 0, t)) };
    default:
      return IDENTITY;
  }
};

const combine = (a: TState, b: TState): TState => ({
  opacity: a.opacity * b.opacity,
  tx: a.tx + b.tx,
  ty: a.ty + b.ty,
  scale: a.scale * b.scale,
  smearX: a.smearX + b.smearX,
  smearY: a.smearY + b.smearY,
  black: Math.max(a.black, b.black),
});

// Old photos are shown like a film print: a little flicker and gate weave
// (random, not on the beat), and the odd scratch on black-and-white ones.
const toneFilter = (shot: Shot, frame: number) => {
  const flicker = shot.tone === "none" ? 0 : 0.035 * noise1(frame * 0.9, 5);
  const tone =
    shot.tone === "bw"
      ? `grayscale(1) contrast(1.12) brightness(${0.98 + flicker})`
      : shot.tone === "aged"
        ? `sepia(0.28) saturate(0.85) contrast(1.02) brightness(${1 + flicker})`
        : "";
  const dim = shot.dim > 0 ? ` brightness(${1 - shot.dim})` : "";
  return (tone + dim).trim() || undefined;
};

const Scratches: React.FC<{ frame: number }> = ({ frame }) => {
  const f = Math.floor(frame / 2);
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < 2; i++) {
    if (hash(f * 3.7 + i * 11) > 0.45) continue;
    const x = hash(f * 1.9 + i * 5) * 1920;
    lines.push(<div key={i} style={{ position: "absolute", left: x, top: 0, width: 1.5, height: 1080, backgroundColor: "rgba(255,255,255,0.22)" }} />);
  }
  const speck = hash(f * 7.3) < 0.35;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {lines}
      {speck ? (
        <div style={{ position: "absolute", left: hash(f * 2.3) * 1900, top: hash(f * 4.1) * 1060, width: 5, height: 4, borderRadius: 3,
          backgroundColor: "rgba(20,20,20,0.7)" }} />
      ) : null}
    </AbsoluteFill>
  );
};

// The camera over a photo. The image element is the frame scaled by
// `mv.scale`, filled with object-fit: cover; it is offset by x % / y % of its
// own overflow and the picture inside it by the same x % / y % of the cover
// overflow, so together x and y always mean "that far across everything the
// camera can reach", whatever the photo's aspect ratio. A roll is covered by
// a little extra zoom so the corners never show.
const FullPhoto: React.FC<{ shot: Shot; mv: Move; frame: number }> = ({ shot, mv, frame }) => {
  const old = shot.tone !== "none";
  const wx = old ? noise1(frame / 2.3, 3) * 1.2 : 0;
  const wy = old ? noise1(frame / 2.9, 8) * 1.2 : 0;
  const th = (Math.abs(mv.rotate) * Math.PI) / 180;
  const roll = Math.cos(th) + (1920 / 1080) * Math.sin(th);
  const w = 1920 * mv.scale;
  const h = 1080 * mv.scale;
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#05070c" }}>
      <AbsoluteFill style={{ rotate: `${mv.rotate}deg`, scale: `${roll}`, translate: `${wx}px ${wy}px` }}>
        <Img
          src={staticFile(shot.src)}
          style={{
            position: "absolute",
            left: -(w - 1920) * (mv.x / 100),
            top: -(h - 1080) * (mv.y / 100),
            width: w,
            height: h,
            objectFit: "cover",
            objectPosition: `${mv.x}% ${mv.y}%`,
            filter: toneFilter(shot, frame),
          }}
        />
      </AbsoluteFill>
      {shot.tone === "bw" ? <Scratches frame={frame} /> : null}
    </AbsoluteFill>
  );
};

const ShotContent: React.FC<{ slot: Slot; frame: number; clock: Clock; look: Look }> = ({ slot, frame, clock, look }) => {
  const { shot } = slot;
  const len = Math.max(1, slot.end - 1 - slot.start);
  // 1 on the shot's last frame, so a loop's last frame matches its first
  const p = clamp((frame - slot.start) / len, -0.2, 1.25);
  const e = easeOf(shot, p, frame - clock.f(shot.at + shot.beats / 2));
  const mv = mix(shot.from, shot.to, e);
  const scene: SceneProps = {
    frame,
    b: clock.beatAt(frame) - shot.at,
    at: (beat: number) => clock.f(shot.at + beat),
    beats: shot.beats,
    e,
    mv,
    fps: clock.fps,
    warm: look.warm,
    accent: look.accent,
  };
  switch (shot.kind) {
    case "map":
      return <MapWorld mode={shot.mapMode} {...scene} />;
    case "sunset":
      return <SunsetScene {...scene} catamaran={false} />;
    case "catamaran":
      return <SunsetScene {...scene} catamaran />;
    case "ferry":
      return <FerryScene {...scene} />;
    case "jetty":
      return <JettyScene {...scene} />;
    case "build":
      return <BuildScene {...scene} />;
    case "closure":
      return <ClosureScene {...scene} />;
    case "walk":
      return <CrowdScene {...scene} variant="walk" />;
    case "marathon":
      return <CrowdScene {...scene} variant="marathon" />;
    case "dusk":
      return <NightScene {...scene} dusk />;
    case "night":
      return <NightScene {...scene} dusk={false} />;
    default:
      return <FullPhoto shot={shot} mv={mv} frame={frame} />;
  }
};

const ShotFrame: React.FC<{ slot: Slot; from: number; clock: Clock; look: Look }> = ({ slot, from, clock, look }) => {
  const frame = useCurrentFrame() + from;
  let st = incoming(slot.shot.enter, frame - slot.start);
  if (slot.next) st = combine(st, outgoing(slot.next.enter, frame - slot.nextStart));
  const content = <ShotContent slot={slot} frame={frame} clock={clock} look={look} />;
  const smear = Math.hypot(st.smearX, st.smearY);
  const blurId = `pb-whip-${slot.start}`;
  return (
    <AbsoluteFill style={{ opacity: st.opacity, translate: `${st.tx}px ${st.ty}px`, scale: `${st.scale}` }}>
      {smear > 2 ? (
        // Motion blur for the whips: a Gaussian blur along the motion only,
        // about a third of the distance travelled in one frame.
        <>
          <svg width={0} height={0} style={{ position: "absolute" }}>
            <filter id={blurId} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={`${Math.min(140, Math.abs(st.smearX) * 0.32)} ${Math.min(140, Math.abs(st.smearY) * 0.32)}`} />
            </filter>
          </svg>
          <AbsoluteFill style={{ filter: `url(#${blurId})` }}>{content}</AbsoluteFill>
        </>
      ) : (
        content
      )}
      {st.black > 0 ? <AbsoluteFill style={{ backgroundColor: "#000", opacity: clamp(st.black) }} /> : null}
    </AbsoluteFill>
  );
};

export const PhotoLayer: React.FC<{ shots: readonly Shot[]; clock: Clock; look: Look }> = ({ shots, clock, look }) => {
  const slots = useMemo(() => schedule(shots, clock), [shots, clock]);
  return (
    <AbsoluteFill>
      {slots.map((slot, i) => {
        const from = slot.start - PRE[slot.shot.enter];
        const until = slot.next ? slot.nextStart + POST[slot.next.enter] : slot.end;
        return (
          <Sequence key={i} name={slot.shot.name} from={from} durationInFrames={Math.max(1, until - from)} layout="none">
            <ShotFrame slot={slot} from={from} clock={clock} look={look} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
