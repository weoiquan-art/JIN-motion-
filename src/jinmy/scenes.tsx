// The scenes of the jinmyaigc promo, in order:
//   Hook    – POV: the door opens on clip 1, she is waiting
//   Photo   – on the drop the frame freezes (shutter) and shrinks into a
//             photo; the photo lifts and drops into an upload slot (step 1)
//   Pick    – swipe up: two scenes to choose from (step 2)
//   Result  – the chosen card grows into the result, a second one joins
//             (step 3); in the end card the three clips fan out
//   Cta     – "Bring your character home", the name and the address
// Times come from timeline.ts; every state is a function of the frame.

import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile } from "remotion";
import { clamp, easeIn, easeInOut, easeOut, inv, lerp, pop, whip } from "../intro-free/anim.ts";
import { BEAT, CLIP_FROM, CLIP_GAIN, CLIPS, COPY, FAN_FROM, FAN_RATE, FPS, M, S } from "./timeline.ts";
import { BODY, C, Card, Chip, ClipView, HEAD, Sparkles, StepHeader, Words } from "./ui.tsx";

const W = 1080;
const H = 1920;
type F = { frame: number };

// ------------------------------------------------------------------ hook
export const Hook: React.FC<F> = ({ frame }) => {
  const push = 1 + 0.08 * easeInOut(frame / S.hook.to);
  const shadow = "0 4px 24px rgba(0,0,0,0.55)";
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ scale: `${push}` }}>
        <Sequence durationInFrames={S.hook.to + 1} layout="none">
          {/* its own sound (keys, the door, her voice), faded out under the shutter */}
          <ClipView src={CLIPS.welcome} fromSec={CLIP_FROM.hook} volume={(f) => CLIP_GAIN.hook * clamp((S.hook.to - f) / 6)} />
        </Sequence>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,10,20,0.62) 0%, rgba(20,10,20,0.25) 34%, rgba(20,10,20,0) 52%)" }} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 220, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div
          style={{
            opacity: clamp(pop(frame - 4)),
            scale: `${0.6 + 0.4 * whip(frame - 4, 1.4, 9)}`,
            padding: "10px 30px",
            borderRadius: 40,
            backgroundColor: C.lilac,
            color: C.white,
            fontFamily: HEAD,
            fontWeight: 700,
            fontSize: 58,
          }}
        >
          {COPY.pov}
        </div>
        <Words text={COPY.hookA} frame={frame} start={10} size={100} color={C.white} shadow={shadow} />
        <Words text={COPY.hookB} frame={frame} start={M.doorOpen} size={76} color={C.white} weight={600} shadow={shadow} />
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ photo and upload
// The frozen frame: clip 1 at 4.0 s (public/jinmy/frames/freeze.png, 960×720),
// the frame the hook ends on.
const SRC_W = 960;
const SRC_H = 720;
const FULL_CROP = { cx: 480, cy: 360, w: (SRC_H * W) / H }; // the cover crop of the hook
const FACE_CROP = { cx: 470, cy: 372, w: 480 }; // a square around her
const CARD = { cx: 540, cy: 1010, size: 600 };
const SLOT = { cx: 540, cy: 1060, w: 780, h: 860 };
const DROP_Y = SLOT.cy - 40; // where the photo sits in the slot

export const Photo: React.FC<F> = ({ frame }) => {
  // 1. freeze and shrink: from the full frame to a square photo, done before
  //    the caption comes in above it
  const e = easeInOut(inv(M.shutter + 2, M.shutter + 26, frame));
  const winW = lerp(W, CARD.size, e);
  const winH = lerp(H, CARD.size, e);
  const cx = lerp(W / 2, CARD.cx, e);
  let cy = lerp(H / 2, CARD.cy, e);
  const crop = { cx: lerp(FULL_CROP.cx, FACE_CROP.cx, e), cy: lerp(FULL_CROP.cy, FACE_CROP.cy, e), w: lerp(FULL_CROP.w, FACE_CROP.w, e) };
  const cropH = crop.w * (winH / winW);
  const s = winW / crop.w;
  const pad = 26 * easeOut(inv(M.shutter + 14, M.shutter + 30, frame));
  let rot = -3 * easeOut(inv(M.shutter + 16, M.shutter + 34, frame));
  let scale = 1;
  let squashX = 1;
  let squashY = 1;

  // 2. lift (anticipation) and drop into the slot, landing on the beat
  const up = easeOut(inv(M.lift, M.lift + 12, frame));
  const fall = easeIn(inv(M.lift + 14, M.land, frame));
  if (frame >= M.lift) {
    cy = lerp(lerp(CARD.cy, CARD.cy - 150, up), DROP_Y, fall);
    rot = lerp(lerp(-3, -9, up), 0, fall);
    scale = lerp(lerp(1, 1.05, up), 0.86, fall);
    const tl = frame - M.land;
    if (tl >= 0) {
      const settle = whip(tl, 2.2, 12);
      squashX = 1 + 0.07 * (1 - settle);
      squashY = 1 - 0.08 * (1 - settle);
    }
  }
  // 3. swipe up to the next step
  const swipe = easeInOut(inv(M.swipeToPick - 8, M.swipeToPick + 8, frame));
  const slotIn = easeOut(inv(M.lift + 4, M.lift + 22, frame));
  const landed = frame >= M.land;
  const ripple = landed ? clamp((frame - M.land) / 18) : 0;
  const progress = M.progress.reduce((acc, f) => acc + whip(frame - f, 0.4, 8) * 0.25, 0);
  const done = whip(frame - M.done, 1.8, 10);
  const textOut = easeIn(inv(M.lift, M.lift + 10, frame));

  return (
    <AbsoluteFill style={{ translate: `0 ${-H * swipe}px` }}>
      {/* the upload slot */}
      {frame >= M.lift ? (
        <div
          style={{
            position: "absolute",
            left: SLOT.cx - SLOT.w / 2,
            top: SLOT.cy - SLOT.h / 2,
            width: SLOT.w,
            height: SLOT.h,
            borderRadius: 56,
            border: `6px ${landed ? "solid" : "dashed"} ${C.lilac}`,
            backgroundColor: landed ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.45)",
            opacity: slotIn,
            scale: `${0.92 + 0.08 * slotIn}`,
            boxSizing: "border-box",
          }}
        >
          {/* up arrow while it waits */}
          <svg width={160} height={160} viewBox="0 0 160 160" style={{ position: "absolute", left: SLOT.w / 2 - 80, top: 120, opacity: 1 - fall }}>
            <path d="M80 30 L80 112 M46 64 L80 30 L114 64" stroke={C.lilac} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M30 128 L130 128" stroke={C.lilac} strokeWidth={14} strokeLinecap="round" />
          </svg>
          {/* progress */}
          <div style={{ position: "absolute", left: 110, right: 110, bottom: 70, height: 22, borderRadius: 11, backgroundColor: "rgba(123,92,255,0.16)", opacity: landed ? 1 : 0 }}>
            <div style={{ width: `${100 * clamp(progress)}%`, height: "100%", borderRadius: 11, backgroundColor: C.lilac }} />
          </div>
        </div>
      ) : null}
      {landed ? (
        <div
          style={{
            position: "absolute",
            left: SLOT.cx - SLOT.w / 2,
            top: SLOT.cy - SLOT.h / 2,
            width: SLOT.w,
            height: SLOT.h,
            borderRadius: 56,
            border: `5px solid ${C.lilac}`,
            boxSizing: "border-box",
            scale: `${1 + 0.12 * easeOut(ripple)}`,
            opacity: 0.6 * (1 - ripple),
          }}
        />
      ) : null}
      {/* the photo */}
      <div
        style={{
          position: "absolute",
          left: cx - winW / 2 - pad,
          top: cy - winH / 2 - pad,
          width: winW + 2 * pad,
          height: winH + 2 * pad,
          backgroundColor: pad > 0.5 ? C.white : "transparent",
          borderRadius: lerp(0, 34, e),
          boxShadow: pad > 0.5 ? `0 ${30 * e}px ${70 * e}px rgba(70,35,50,${0.25 * e})` : undefined,
          rotate: `${rot}deg`,
          scale: `${scale * squashX} ${scale * squashY}`,
          transformOrigin: "50% 100%",
        }}
      >
        <div style={{ position: "absolute", left: pad, top: pad, width: winW, height: winH, overflow: "hidden", borderRadius: lerp(0, 22, e) }}>
          <Img
            src={staticFile("jinmy/frames/freeze.png")}
            style={{
              position: "absolute",
              left: -(crop.cx - crop.w / 2) * s,
              top: -(crop.cy - cropH / 2) * s,
              width: SRC_W * s,
              height: SRC_H * s,
            }}
          />
        </div>
        {/* done: a check on the corner */}
        {frame >= M.done - 1 ? (
          <div
            style={{
              position: "absolute",
              right: -34,
              top: -34,
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: C.coral,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              scale: `${clamp(done, 0, 2)}`,
              boxShadow: "0 12px 26px rgba(255,122,89,0.45)",
            }}
          >
            <svg width={64} height={64} viewBox="0 0 64 64">
              <path d="M12 34 L27 48 L53 18" stroke={C.white} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
        ) : null}
      </div>
      <Sparkles frame={frame} start={M.done} cx={CARD.cx} cy={DROP_Y} radius={430} count={7} />
      {/* shutter flash */}
      {frame < M.shutter + 8 ? <AbsoluteFill style={{ backgroundColor: C.white, opacity: frame >= M.shutter ? 0.85 * Math.exp(-(frame - M.shutter) / 2.5) : 0 }} /> : null}
      {/* "Made from your photo": on the next two beats, once the photo is small */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 250,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: 1 - textOut,
          translate: `0 ${-80 * textOut}px`,
        }}
      >
        <Words text={COPY.madeFrom} frame={frame} start={M.shutter + BEAT} size={70} color={C.ink} weight={600} />
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: -10,
              right: -10,
              bottom: 22,
              height: 46,
              borderRadius: 23,
              backgroundColor: "rgba(255,122,89,0.35)",
              transformOrigin: "0% 50%",
              scale: `${easeOut(inv(M.shutter + 2 * BEAT + 6, M.shutter + 2 * BEAT + 18, frame))} 1`,
            }}
          />
          <Words text={COPY.yourPhoto} frame={frame} start={M.shutter + 2 * BEAT - 4} step={4} size={164} color={C.lilac} />
        </div>
      </div>
      {frame >= M.lift ? <StepHeader n={1} text={COPY.step1} frame={frame} start={M.lift + 6} /> : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ pick
const PICK_A = { cx: 290, cy: 980, w: 460, h: 780 };
const PICK_B = { cx: 790, cy: 980, w: 460, h: 780 };
const FOOT = 150;
const PICK_CLIP_START = M.swipeToPick - 8; // the clips start playing as the step slides in
// card B plays the height clip so that it reaches CLIP_FROM.height exactly when
// it turns into the result card
const PICK_B_FROM = CLIP_FROM.height - (M.expand - PICK_CLIP_START) / FPS;
const footer = (text: string, opacity = 1) => <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 50, color: C.ink, opacity, whiteSpace: "nowrap" }}>{text}</span>;

export const Pick: React.FC<F> = ({ frame }) => {
  const swipe = easeInOut(inv(M.swipeToPick - 8, M.swipeToPick + 8, frame));
  const aIn = whip(frame - (M.swipeToPick + 2), 0.7, 14);
  const bIn = whip(frame - (M.swipeToPick + 6), 0.7, 14);
  // the ring hops between the cards on the beats and stays on B
  const targets = [PICK_A, PICK_B, PICK_A, PICK_B];
  let ring = PICK_A;
  let prev = PICK_A;
  let hopT = -1;
  for (let i = 0; i < M.hops.length; i++) {
    if (frame >= M.hops[i] - 1) {
      prev = i > 0 ? targets[i - 1] : PICK_A;
      ring = targets[i];
      hopT = frame - M.hops[i];
    }
  }
  const hop = hopT < 0 ? 0 : whip(hopT, 1.3, 9);
  const ringX = lerp(prev.cx, ring.cx, hop);
  const ringOn = clamp(pop(frame - (M.hops[0] - 2)));
  const chosen = frame - M.chosen;
  const chosenK = chosen >= -0.75 ? whip(chosen, 2, 10) : 0;
  // ring, check and header clear away before the step 3 header comes in
  const clear = easeIn(inv(M.expand - 6, M.expand, frame));
  const headerOut = easeIn(inv(M.expand - 6, M.expand + 2, frame));
  const out = easeIn(inv(M.expand, M.expand + 10, frame)); // card A leaves
  const dimA = 1 - 0.45 * clamp(chosen / 6);
  return (
    <AbsoluteFill style={{ translate: `0 ${H * (1 - swipe)}px` }}>
      <StepHeader n={2} text={COPY.step2} frame={frame} start={M.swipeToPick + 4} out={headerOut} />
      <div style={{ opacity: 1 - out, translate: `${-140 * out}px 0` }}>
        <Card x={lerp(-300, PICK_A.cx, aIn)} y={PICK_A.cy} w={PICK_A.w} h={PICK_A.h} rotate={-2} opacity={dimA} footer={footer(COPY.sceneA)} footerH={FOOT}>
          <Sequence from={PICK_CLIP_START} layout="none">
            <ClipView src={CLIPS.welcomeDuo} fromSec={5} />
          </Sequence>
        </Card>
      </div>
      {/* card B becomes the result card at M.expand (Result draws it from then on) */}
      {frame < M.expand ? (
        <Card x={lerp(W + 300, PICK_B.cx, bIn)} y={PICK_B.cy} w={PICK_B.w} h={PICK_B.h} rotate={2} scale={1 + 0.05 * Math.sin(Math.PI * clamp(chosen / 10))} footer={footer(COPY.sceneB)} footerH={FOOT}>
          <Sequence from={PICK_CLIP_START} layout="none">
            <ClipView src={CLIPS.height} fromSec={PICK_B_FROM} focusX={45} />
          </Sequence>
        </Card>
      ) : null}
      {/* selection ring and the check on the chosen card */}
      {frame < M.expand ? (
        <div
          style={{
            position: "absolute",
            left: ringX - PICK_A.w / 2 - 18,
            top: PICK_A.cy - PICK_A.h / 2 - 18,
            width: PICK_A.w + 36,
            height: PICK_A.h + 36,
            borderRadius: 54,
            border: `9px solid ${C.lilac}`,
            boxSizing: "border-box",
            opacity: ringOn * (1 - clear),
            rotate: `${lerp(prev === PICK_A ? -2 : 2, ring === PICK_A ? -2 : 2, hop)}deg`,
          }}
        />
      ) : null}
      {chosen >= -1 && frame < M.expand ? (
        <div
          style={{
            position: "absolute",
            left: PICK_B.cx + PICK_B.w / 2 - 70,
            top: PICK_B.cy - PICK_B.h / 2 - 40,
            width: 110,
            height: 110,
            borderRadius: 55,
            backgroundColor: C.lilac,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            scale: `${chosenK * (1 - clear)}`,
          }}
        >
          <svg width={60} height={60} viewBox="0 0 64 64">
            <path d="M12 34 L27 48 L53 18" stroke={C.white} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      ) : null}
      <Sparkles frame={frame} start={M.chosen} cx={PICK_B.cx} cy={PICK_B.cy - 120} radius={300} count={6} seed={9} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ result
// the big card: a 4:3 clip in a white card (952×714 inside a 14 px border)
const BIG = { cx: 540, cy: 960, w: 980, h: 742 };
const TOP = { cx: 540, cy: 765, rot: -3, scale: 0.8 };
const LOW = { cx: 540, cy: 1290, rot: 3, scale: 0.8 };
// the end-card fan; the middle card (the chosen scene) stays on top
const FAN = {
  left: { cx: 232, cy: 975, rot: -11, scale: 0.42 },
  mid: { cx: 540, cy: 930, rot: 0, scale: 0.5 },
  right: { cx: 848, cy: 975, rot: 11, scale: 0.42 },
};

export const Result: React.FC<F> = ({ frame }) => {
  const grow = easeInOut(inv(M.expand, M.expand + 18, frame));
  const join = whip(frame - M.second, 0.8, 16);
  const toFan = easeInOut(inv(S.cta.from, S.cta.from + 20, frame));
  const headerOut = easeIn(inv(S.cta.from, S.cta.from + 10, frame));
  const inCta = frame >= S.cta.from;
  // card 1 ("Height Check"): on its first frame it is pick card B (same box,
  // footer and clip time); it grows into the result, moves up when the second
  // one joins, then takes the middle of the fan
  let x = lerp(PICK_B.cx, BIG.cx, grow);
  let y = lerp(PICK_B.cy, BIG.cy, grow);
  const w = lerp(PICK_B.w, BIG.w, grow);
  const h = lerp(PICK_B.h, BIG.h, grow);
  let rot = lerp(2, 0, grow);
  let sc = 1;
  if (frame >= M.second - 1) {
    x = lerp(BIG.cx, TOP.cx, join);
    y = lerp(BIG.cy, TOP.cy, join);
    rot = lerp(0, TOP.rot, join);
    sc = lerp(1, TOP.scale, join);
  }
  if (inCta) {
    x = lerp(TOP.cx, FAN.mid.cx, toFan);
    y = lerp(TOP.cy, FAN.mid.cy, toFan);
    rot = lerp(TOP.rot, FAN.mid.rot, toFan);
    sc = lerp(TOP.scale, FAN.mid.scale, toFan);
  }
  // card 2 ("Welcome Home"): rises from below, tucked under card 1
  const lowX = inCta ? lerp(LOW.cx, FAN.right.cx, toFan) : LOW.cx;
  const lowY = inCta ? lerp(LOW.cy, FAN.right.cy, toFan) : lerp(H + 500, LOW.cy, join);
  const lowRot = inCta ? lerp(LOW.rot, FAN.right.rot, toFan) : LOW.rot;
  const lowSc = inCta ? lerp(LOW.scale, FAN.right.scale, toFan) : LOW.scale;
  // card 0 (clip 1, the hook's scene) flies into the fan from the top left
  const leftIn = whip(frame - (S.cta.from + 6), 0.9, 18);
  const chipIn = (start: number) => whip(frame - start, 1.5, 10);
  const chipOut = 1 - easeIn(inv(S.cta.from, S.cta.from + 8, frame));
  // the clips' own sound: card 1 steps back when card 2 joins, both fade out
  // before the end card
  const fadeOut = (abs: number) => 1 - inv(S.cta.from - 10, S.cta.from, abs);
  const vol1 = (f: number) => lerp(CLIP_GAIN.height, CLIP_GAIN.heightUnder, inv(M.second - 2, M.second + 6, f + M.expand)) * fadeOut(f + M.expand);
  const vol2 = (f: number) => CLIP_GAIN.duo * fadeOut(f + M.second);
  return (
    <AbsoluteFill>
      <StepHeader n={3} text={COPY.step3} frame={frame} start={M.expand + 8} out={headerOut} />
      {inCta ? (
        <Card
          x={lerp(-300, FAN.left.cx, leftIn)}
          y={lerp(700, FAN.left.cy, leftIn)}
          w={BIG.w}
          h={BIG.h}
          rotate={lerp(-25, FAN.left.rot, leftIn)}
          scale={FAN.left.scale}
        >
          <Sequence from={S.cta.from} layout="none">
            <ClipView src={CLIPS.welcome} fromSec={FAN_FROM.welcome} rate={FAN_RATE} />
          </Sequence>
        </Card>
      ) : null}
      {frame >= M.second - 1 ? (
        <Card x={lowX} y={lowY} w={BIG.w} h={BIG.h} rotate={lowRot} scale={lowSc}>
          {inCta ? (
            // in the end card it keeps playing from where it is, slowed down
            <Sequence from={S.cta.from} layout="none">
              <ClipView src={CLIPS.welcomeDuo} fromSec={FAN_FROM.duo} rate={FAN_RATE} />
            </Sequence>
          ) : (
            <Sequence from={M.second} layout="none">
              <ClipView src={CLIPS.welcomeDuo} fromSec={CLIP_FROM.duo} volume={vol2} />
            </Sequence>
          )}
          <div style={{ position: "absolute", left: 26, bottom: 26, scale: `${chipIn(M.second + 8)}`, transformOrigin: "0% 100%", opacity: chipOut }}>
            <Chip text={COPY.sceneA} />
          </div>
        </Card>
      ) : null}
      <Card x={x} y={y} w={w} h={h} rotate={rot} scale={sc} footer={grow < 1 ? footer(COPY.sceneB, 1 - clamp(grow * 2)) : undefined} footerH={FOOT * (1 - grow)}>
        {inCta ? (
          <Sequence from={S.cta.from} layout="none">
            <ClipView src={CLIPS.height} fromSec={FAN_FROM.height} rate={FAN_RATE} focusX={45} />
          </Sequence>
        ) : (
          <Sequence from={M.expand} layout="none">
            <ClipView src={CLIPS.height} fromSec={CLIP_FROM.height} volume={vol1} focusX={45} />
          </Sequence>
        )}
        <div style={{ position: "absolute", left: 26, bottom: 26, scale: `${chipIn(M.expand + 16)}`, transformOrigin: "0% 100%", opacity: chipOut }}>
          <Chip text={COPY.sceneB} />
        </div>
      </Card>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ call to action
export const Cta: React.FC<F> = ({ frame }) => {
  const nameK = whip(frame - M.url, 1.6, 12);
  const urlK = whip(frame - (M.url + 6), 1.6, 12);
  // the URL pill breathes on each beat once it has landed (element only)
  const sinceUrl = frame - M.url;
  const breathe = sinceUrl >= BEAT ? 0.025 * Math.exp(-((sinceUrl / BEAT) % 1) * 4) : 0;
  const glint = inv(M.final, M.final + 18, frame);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 60, right: 60, top: 300, display: "flex", justifyContent: "center" }}>
        <Words text={COPY.cta} frame={frame} start={S.cta.from + 8} step={5} size={112} color={C.ink} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1240, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <div
          style={{
            fontFamily: HEAD,
            fontWeight: 700,
            fontSize: 118,
            lineHeight: 1,
            color: C.ink,
            letterSpacing: "0.01em",
            opacity: clamp(pop(frame - M.url)),
            scale: `${0.6 + 0.4 * nameK}`,
          }}
        >
          {COPY.name}
        </div>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "22px 48px",
            borderRadius: 60,
            backgroundColor: C.lilac,
            color: C.white,
            fontFamily: BODY,
            fontWeight: 650,
            fontSize: 52,
            opacity: clamp(pop(frame - (M.url + 6))),
            scale: `${(0.6 + 0.4 * urlK) * (1 + breathe)}`,
            boxShadow: "0 16px 34px rgba(123,92,255,0.4)",
          }}
        >
          {COPY.url}
          {/* one glint across the pill on the last downbeat, clipped to it */}
          {glint > 0 && glint < 1 ? (
            <div
              style={{
                position: "absolute",
                top: -20,
                bottom: -20,
                left: `${lerp(-30, 120, glint)}%`,
                width: 90,
                rotate: "20deg",
                background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 100%)",
              }}
            />
          ) : null}
        </div>
      </div>
      <Sparkles frame={frame} start={M.final} cx={540} cy={1420} radius={360} count={8} seed={21} />
    </AbsoluteFill>
  );
};
