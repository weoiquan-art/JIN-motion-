// Effect layer, drawn over the pictures and under the text. Every light here
// follows the music: a warm pulse on each beat (beat accent × loudness) and a
// bloom with an anamorphic streak on the strong hits, both coming from the
// light source of the shot on screen (`shot.light`); white flashes and light
// leaks on the cuts; dust that glows a little on the beats. Then the grade,
// grain, vignette and the letterbox bars.

import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { clamp, hash, hitEnv, inv, lerp, noise1 } from "./anim";
import type { Clock } from "./beats";
import type { Slot } from "./PhotoLayer";
import type { PenangProps } from "./schema";

type Look = PenangProps["look"];
type Flare = PenangProps["flares"][number];

const Grain: React.FC<{ frame: number; amount: number }> = ({ frame, amount }) => {
  if (amount <= 0) return null;
  const f = Math.floor(frame);
  const ox = Math.floor(hash(f * 1.31) * 512);
  const oy = Math.floor(hash(f * 2.17 + 4) * 512);
  const tile = staticFile(`penang/fx/grain-${f % 4}.png`);
  return (
    <AbsoluteFill style={{ overflow: "hidden", mixBlendMode: "overlay", opacity: amount }}>
      <div style={{ position: "absolute", left: -ox, top: -oy, width: 2560, height: 1536 }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <Img
            key={i}
            src={tile}
            style={{ position: "absolute", left: (i % 5) * 512, top: Math.floor(i / 5) * 512, width: 512, height: 512 }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const LightLeak: React.FC<{ phase: number; strength: number; warm: string }> = ({ phase, strength, warm }) => (
  <AbsoluteFill style={{ mixBlendMode: "screen", opacity: clamp(strength) }}>
    <div
      style={{
        position: "absolute",
        left: lerp(-1100, 1300, phase),
        top: -420,
        width: 1500,
        height: 1500,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${warm} 0%, rgba(255,120,60,0.55) 32%, rgba(255,90,60,0) 68%)`,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: lerp(1600, -300, phase),
        top: 380,
        width: 1100,
        height: 1100,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,80,120,0.75) 0%, rgba(255,80,120,0) 64%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: lerp(-500, 1000, phase),
        top: 520,
        width: 1000,
        height: 760,
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(255,232,170,0.9) 0%, rgba(255,232,170,0) 62%)",
      }}
    />
  </AbsoluteFill>
);

// Dust in the air, at three depths: far specks drift slowly and stay sharp,
// near ones are big soft discs that cross the frame faster (parallax).
const DUST = Array.from({ length: 54 }, (_, i) => {
  const d = hash(i * 9.1 + 2); // 0 = far, 1 = near
  return {
    x0: hash(i * 3.3) * 2000,
    y0: hash(i * 5.7) * 1180,
    d,
    vx: (6 + 30 * d) * (hash(i * 1.1) > 0.3 ? 1 : -0.6),
    vy: -(3 + 16 * d) * (0.5 + hash(i * 2.2)),
    seed: i,
  };
});

const Dust: React.FC<{ frame: number; fps: number; amount: number; glow: number }> = ({ frame, fps, amount, glow }) => {
  if (amount <= 0) return null;
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
      {DUST.map((p) => {
        const x = (((p.x0 + p.vx * t + noise1(t * 0.25 + p.seed, 4) * 40 * p.d) % 2000) + 2000) % 2000 - 40;
        const y = (((p.y0 + p.vy * t + noise1(t * 0.2 + p.seed, 7) * 20) % 1180) + 1180) % 1180 - 50;
        const near = p.d > 0.78;
        const size = near ? 26 + 46 * (p.d - 0.78) * 4.5 : 2 + 5 * p.d;
        const twinkle = 0.65 + 0.35 * noise1(t * 1.2 + p.seed * 7, 2);
        const a = amount * (near ? 0.22 : 0.3 + 0.5 * p.d) * twinkle * (0.75 + 0.5 * glow);
        return (
          <div
            key={p.seed}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: near
                ? "radial-gradient(circle, rgba(255,230,200,0.55) 0%, rgba(255,220,180,0.35) 55%, rgba(255,220,180,0.5) 64%, rgba(255,220,180,0) 70%)"
                : "radial-gradient(circle, rgba(255,240,215,1) 0%, rgba(255,220,170,0.5) 40%, rgba(255,220,170,0) 70%)",
              opacity: clamp(a),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const FxLayer: React.FC<{ clock: Clock; slots: readonly Slot[]; flares: readonly Flare[]; look: Look }> = ({
  clock,
  slots,
  flares,
  look,
}) => {
  const frame = useCurrentFrame();
  // A loop ends on its opening frame: let the beat light die out in the last
  // frames so the seam does not flicker.
  const loopFade = clock.loop ? 1 - inv(clock.durationInFrames - 20, clock.durationInFrames - 4, frame) : 1;
  const energy = clock.energy(frame) * loopFade;
  // the dust drifts with time, so in a loop it is faded out at both ends
  const dustFade = clock.loop ? inv(0, 24, frame) * (1 - inv(clock.durationInFrames - 26, clock.durationInFrames - 2, frame)) : 1;

  // the shot on screen and its light source
  let cur = slots[0];
  for (const s of slots) if (s.start <= frame) cur = s;
  const light = cur ? cur.shot.light : { x: 50, y: 40, amount: 1 };

  // 1. pulse on every beat
  const b = Math.floor(clock.beatAt(frame));
  let pulse = 0;
  for (let k = b - 1; k <= b + 1; k++) {
    if (k < 0 || k > clock.beatsInFilm) continue;
    pulse += hitEnv(frame - clock.f(k), 5) * clock.accent(k);
  }
  const pulseA = clamp(pulse * energy * look.pulse * light.amount * 0.3, 0, 0.45);

  // 2. blooms on the strong hits (automatic, at the shot's light) and on the manual flares
  const manual = flares.map((fl) => ({ frame: clock.f(fl.at), strength: fl.strength, x: fl.x, y: fl.y }));
  const auto = look.autoHits
    ? clock.hits
        .filter((h) => !flares.some((fl) => Math.abs(fl.at - h.beat) < 0.25))
        .map((h) => ({ frame: h.frame, strength: (0.5 + h.strength) * light.amount, x: light.x, y: light.y }))
    : [];
  let bloom = { a: 0, x: 50, y: 44 };
  for (const ev of [...auto, ...manual]) {
    const a = hitEnv(frame - ev.frame, 13) * ev.strength * look.flare;
    if (a > bloom.a) bloom = { a, x: ev.x, y: ev.y };
  }
  // the anamorphic streak: on the blooms, and faintly on the accented beats
  const streak = Math.max(bloom.a, pulseA * 1.2);
  const streakY = bloom.a > pulseA * 1.2 ? bloom.y : light.y;
  const streakX = bloom.a > pulseA * 1.2 ? bloom.x : light.x;

  // 3. flashes and leaks on the cuts
  let flash = 0;
  let leak = 0;
  let leakPhase = 0;
  for (const s of slots) {
    const t = frame - s.start;
    // full white on the cut frame itself, then decay (the cut frame carries the jump)
    if (s.shot.enter === "flash" && t >= 0) flash = Math.max(flash, Math.exp(-t / 4.5));
    if (s.shot.enter === "zoom") flash = Math.max(flash, 0.3 * hitEnv(t, 4));
    if (s.shot.enter === "leak" && t > -16 && t < 20) {
      const a = Math.exp(-(t * t) / (2 * 7.5 * 7.5));
      if (a > leak) {
        leak = a;
        leakPhase = (t + 16) / 36;
      }
    }
  }
  const bar = look.letterbox;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Dust frame={frame} fps={clock.fps} amount={look.dust * dustFade} glow={clamp(pulse * energy)} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 70% at ${light.x}% ${light.y}%, ${look.warm} 0%, rgba(0,0,0,0) 70%)`,
          mixBlendMode: "screen",
          opacity: pulseA,
        }}
      />
      {bloom.a > 0.005 ? (
        <>
          <AbsoluteFill
            style={{
              background: `radial-gradient(circle at ${bloom.x}% ${bloom.y}%, #ffffff 0%, ${look.warm} 12%, rgba(0,0,0,0) 42%)`,
              mixBlendMode: "screen",
              opacity: clamp(bloom.a * 0.75),
            }}
          />
          <AbsoluteFill style={{ backgroundColor: "#fff3e0", mixBlendMode: "screen", opacity: clamp(bloom.a * 0.1) }} />
        </>
      ) : null}
      {streak > 0.01 ? (
        <div
          style={{
            position: "absolute",
            left: `calc(${streakX}% - 950px)`,
            width: 1900,
            top: `calc(${streakY}% - 7px)`,
            height: 14,
            background: "radial-gradient(closest-side, rgba(255,255,255,0.95) 0%, rgba(160,196,255,0.55) 30%, rgba(160,196,255,0) 100%)",
            mixBlendMode: "screen",
            opacity: clamp(streak * streak * 1.3),
            scale: `${0.7 + 0.5 * streak} ${1 + 1.2 * streak}`,
          }}
        />
      ) : null}
      {flash > 0.005 ? <AbsoluteFill style={{ backgroundColor: "#ffffff", opacity: clamp(flash) }} /> : null}
      {leak * look.leak > 0.005 ? <LightLeak phase={leakPhase} strength={leak * look.leak} warm={look.warm} /> : null}
      {look.grade > 0 ? (
        <>
          <AbsoluteFill
            style={{ background: "linear-gradient(180deg, rgba(255,168,92,0.55) 0%, rgba(255,168,92,0) 58%)", mixBlendMode: "soft-light", opacity: look.grade }}
          />
          <AbsoluteFill
            style={{ background: "linear-gradient(0deg, rgba(18,104,128,0.6) 0%, rgba(18,104,128,0) 62%)", mixBlendMode: "soft-light", opacity: look.grade }}
          />
        </>
      ) : null}
      <Grain frame={frame} amount={look.grain} />
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.9) 100%)",
          opacity: look.vignette,
        }}
      />
      {bar > 0 ? (
        <>
          <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: bar, backgroundColor: "#000" }} />
          <div style={{ position: "absolute", left: 0, bottom: 0, width: 1920, height: bar, backgroundColor: "#000" }} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
