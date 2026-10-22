// Picture layer: every shot of `props.shots`, in order, with its camera move,
// its beat kicks and the transition into it. Shot boundaries are beats
// (clock.cut), so every cut lands on the frame nearest to a beat of the BGM.

import React, { useMemo } from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { clamp, drift, easeIn, easeInOut, easeOut, inv, kickEnv, lerp, whip } from "./anim";
import type { Clock } from "./beats";
import { MapOverlay, MAPS } from "./overlays";
import { ClosureScene, NeedScene, WhyScene } from "./scenes";
import type { PenangProps, Shot } from "./schema";

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

export const schedule = (shots: readonly Shot[], clock: Clock): Slot[] =>
  shots.map((shot, i) => {
    const next = shots[i + 1] ?? null;
    const end = clock.cut(shot.at + shot.beats);
    return { shot, start: clock.cut(shot.at), end, next, nextStart: next ? clock.cut(next.at) : end };
  });

type TState = { opacity: number; tx: number; ty: number; scale: number; smearX: number; smearY: number; black: number };
const IDENTITY: TState = { opacity: 1, tx: 0, ty: 0, scale: 1, smearX: 0, smearY: 0, black: 0 };

const W = 1920 * 1.06;
const H = 1080 * 1.1;

// t = frames since this shot's own start
const incoming = (enter: Enter, t: number): TState => {
  const speed = (fn: (x: number) => number) => fn(t + 0.5) - fn(t - 0.5);
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
      return { ...IDENTITY, scale: lerp(1.35, 1, whip(t, 0.15, 10)), opacity: inv(-0.75, 4, t) };
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
  const speed = (fn: (x: number) => number) => fn(t + 0.5) - fn(t - 0.5);
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

const toneFilter = (shot: Shot) => {
  const tone = shot.tone === "bw" ? "grayscale(1) contrast(1.06)" : shot.tone === "aged" ? "sepia(0.3) saturate(0.85) contrast(0.95)" : "";
  const dim = shot.dim > 0 ? ` brightness(${1 - shot.dim})` : "";
  return (tone + dim).trim() || undefined;
};

const FullPhoto: React.FC<{ shot: Shot; p: number; kick: number; frame: number; clock: Clock; look: Look }> = ({
  shot,
  p,
  kick,
  frame,
  clock,
  look,
}) => {
  const e = drift(p);
  const fx = lerp(shot.from.x, shot.to.x, e);
  const fy = lerp(shot.from.y, shot.to.y, e);
  const s = lerp(shot.from.scale, shot.to.scale, e) * (1 + kick);
  const filter = toneFilter(shot);
  if (shot.overlay !== "none") {
    const map = MAPS[shot.overlay];
    const cover = Math.max(1920 / map.w, 1080 / map.h);
    const w = map.w * cover;
    const h = map.h * cover;
    const left = ((1920 - w) * fx) / 100;
    const top = ((1080 - h) * fy) / 100;
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <AbsoluteFill style={{ scale: `${s}` }}>
          <Img src={staticFile(shot.src)} style={{ position: "absolute", left, top, width: w, height: h, filter }} />
          <AbsoluteFill style={{ backgroundColor: "#0b1f38", mixBlendMode: "multiply", opacity: 0.55 }} />
          <svg viewBox={`0 0 ${map.w} ${map.h}`} style={{ position: "absolute", left, top, width: w, height: h, overflow: "visible" }}>
            <MapOverlay kind={shot.overlay} frame={frame} atBeat={shot.at} clock={clock} k={cover * s} warm={look.warm} accent={look.accent} />
          </svg>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ scale: `${s}`, transformOrigin: `${fx}% ${fy}%` }}>
        <Img
          src={staticFile(shot.src)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${fx}% ${fy}%`, filter }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// A photo as a print, floating over its own blurred, darkened copy. The copy
// is drawn small and scaled up, so the heavy blur stays cheap to render.
const PrintPhoto: React.FC<{ shot: Shot; p: number; kick: number }> = ({ shot, p, kick }) => {
  const e = drift(p);
  const dx = lerp(shot.from.x, shot.to.x, e);
  const dy = lerp(shot.from.y, shot.to.y, e);
  const s = lerp(shot.from.scale, shot.to.scale, e) * (1 + kick);
  const framed = shot.tone !== "none";
  const filter = toneFilter(shot);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#05070c" }}>
      <div
        style={{
          position: "absolute",
          left: -120,
          top: -68,
          width: 480,
          height: 270,
          transformOrigin: "0 0",
          scale: `${(2160 / 480) * (1.02 + 0.05 * e)}`,
          translate: `${-dx * 0.3}px ${-dy * 0.3}px`,
        }}
      >
        <Img
          src={staticFile(shot.src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: `blur(9px) brightness(${0.42 * (1 - shot.dim * 0.6)}) saturate(1.25)${shot.tone === "bw" ? " grayscale(1)" : ""}`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: shot.print.x + dx,
          top: shot.print.y + dy,
          translate: "-50% -50%",
          rotate: `${shot.print.rotate}deg`,
          scale: `${s}`,
        }}
      >
        <div
          style={{
            padding: framed ? "18px 18px 24px" : 0,
            backgroundColor: "#efe8da",
            borderRadius: framed ? 2 : 6,
            overflow: "hidden",
            boxShadow: "0 40px 90px rgba(0,0,0,0.6), 0 10px 24px rgba(0,0,0,0.45)",
          }}
        >
          <Img src={staticFile(shot.src)} style={{ height: shot.print.height, display: "block", filter }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ShotContent: React.FC<{ slot: Slot; frame: number; clock: Clock; look: Look }> = ({ slot, frame, clock, look }) => {
  const { shot } = slot;
  const scene = { frame, atBeat: shot.at, clock, warm: look.warm, accent: look.accent };
  if (shot.kind === "why") return <WhyScene {...scene} />;
  if (shot.kind === "need") return <NeedScene {...scene} />;
  if (shot.kind === "closure") return <ClosureScene {...scene} />;
  const p = clamp((frame - slot.start) / Math.max(1, slot.end - slot.start), -0.2, 1.25);
  // a small push on every beat, weighted by the beat's accent and the loudness
  let kick = 0;
  if (shot.kick > 0) {
    const b = Math.floor(clock.beatAt(frame));
    for (let k = b - 2; k <= b + 1; k++) {
      if (k < shot.at || k >= shot.at + shot.beats) continue;
      kick += kickEnv(frame - clock.f(k)) * (0.35 + clock.accent(k)) * clock.energy(frame);
    }
    kick *= shot.kick * 0.016;
  }
  return shot.style === "print" ? (
    <PrintPhoto shot={shot} p={p} kick={kick} />
  ) : (
    <FullPhoto shot={shot} p={p} kick={kick} frame={frame} clock={clock} look={look} />
  );
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
