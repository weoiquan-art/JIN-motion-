// Effect layer, drawn over the pictures and under the text. Every light here
// follows the music: a warm pulse on each beat (beat accent × loudness), a
// bloom with a horizontal streak on the strong hits the analysis found, white
// flashes and light leaks on the cuts, plus grain and a vignette.

import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { clamp, hash, hitEnv, lerp } from "./anim";
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

export const FxLayer: React.FC<{ clock: Clock; slots: readonly Slot[]; flares: readonly Flare[]; look: Look }> = ({
  clock,
  slots,
  flares,
  look,
}) => {
  const frame = useCurrentFrame();
  const energy = clock.energy(frame);

  // 1. pulse on every beat
  const b = Math.floor(clock.beatAt(frame));
  let pulse = 0;
  for (let k = b - 1; k <= b + 1; k++) {
    if (k < 0 || k > clock.beatsInFilm) continue;
    pulse += hitEnv(frame - clock.f(k), 5) * clock.accent(k);
  }
  const pulseA = clamp(pulse * energy * look.pulse * 0.3, 0, 0.4);

  // 2. blooms on the strong hits (automatic) and on the manual flares
  const manual = flares.map((fl) => ({ frame: clock.f(fl.at), at: fl.at, strength: fl.strength, x: fl.x, y: fl.y }));
  const auto = look.autoHits
    ? clock.hits
        .filter((h) => !flares.some((fl) => Math.abs(fl.at - h.beat) < 0.25))
        .map((h) => ({ frame: h.frame, at: h.beat, strength: 0.5 + h.strength, x: 50, y: 44 }))
    : [];
  let bloom = { a: 0, x: 50, y: 44 };
  for (const ev of [...auto, ...manual]) {
    const a = hitEnv(frame - ev.frame, 13) * ev.strength * look.flare;
    if (a > bloom.a) bloom = { a, x: ev.x, y: ev.y };
  }

  // 3. flashes on the cuts
  let flash = 0;
  let leak = 0;
  let leakPhase = 0;
  for (const s of slots) {
    const t = frame - s.start;
    if (s.shot.enter === "flash") flash = Math.max(flash, hitEnv(t, 4.5));
    if (s.shot.enter === "zoom") flash = Math.max(flash, 0.3 * hitEnv(t, 4));
    if (s.shot.enter === "leak" && t > -16 && t < 20) {
      const a = Math.exp(-(t * t) / (2 * 7.5 * 7.5));
      if (a > leak) {
        leak = a;
        leakPhase = (t + 16) / 36;
      }
    }
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 74% 20%, ${look.warm} 0%, rgba(0,0,0,0) 62%)`,
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
          <div
            style={{
              position: "absolute",
              left: -400,
              width: 2720,
              top: `calc(${bloom.y}% - 5px)`,
              height: 10,
              background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${look.warm} 32%, #ffffff ${bloom.x * 0.58 + 21}%, ${look.warm} 68%, rgba(0,0,0,0) 100%)`,
              mixBlendMode: "screen",
              opacity: clamp(bloom.a * bloom.a),
              scale: `1 ${1 + 1.5 * bloom.a}`,
            }}
          />
          <AbsoluteFill style={{ backgroundColor: "#fff3e0", mixBlendMode: "screen", opacity: clamp(bloom.a * 0.1) }} />
        </>
      ) : null}
      {flash > 0.005 ? <AbsoluteFill style={{ backgroundColor: "#ffffff", opacity: clamp(flash) }} /> : null}
      {leak * look.leak > 0.005 ? <LightLeak phase={leakPhase} strength={leak * look.leak} warm={look.warm} /> : null}
      <Grain frame={frame} amount={look.grain} />
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.9) 100%)",
          opacity: look.vignette,
        }}
      />
    </AbsoluteFill>
  );
};
