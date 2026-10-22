// Text layer, always on top of the effects so the light never washes it out.
// Captions, the chapter label (top left), the year chip (top right) and the
// credits after the last downbeat. Every entrance is timed in beats.

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { clamp, easeIn, hitEnv, inv, pop, whip } from "./anim";
import type { Clock } from "./beats";
import { EN, ZH_SANS, ZH_SERIF } from "./fonts";
import type { Caption, PenangProps } from "./schema";

type Look = PenangProps["look"];

const SAFE_X = 120;

const lastIndexWhere = <T,>(arr: readonly T[], ok: (x: T) => boolean) => {
  for (let i = arr.length - 1; i >= 0; i--) if (ok(arr[i])) return i;
  return -1;
};

// One line that slides up out of a mask on its beat (t = frames since it).
const Reveal: React.FC<{ t: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ t, children, style }) => {
  if (t < -0.75) return <div style={{ ...style, visibility: "hidden" }}>{children}</div>;
  const u = whip(t, 0.5, 9);
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.08em", marginBottom: "-0.08em" }}>
      <div style={{ ...style, translate: `0 ${(1 - u) * 105}%`, opacity: clamp(pop(t)) }}>{children}</div>
    </div>
  );
};

const CaptionBlock: React.FC<{ c: Caption; frame: number; clock: Clock; look: Look }> = ({ c, frame, clock, look }) => {
  const start = clock.f(c.at);
  const end = clock.f(c.at + c.beats);
  if (frame < start - 1 || frame > end) return null;
  const t = frame - start;
  const ts = frame - clock.f(c.at + c.subAt);
  const out = easeIn(inv(end - 7, end, frame));
  const centred = c.place === "center" || c.place === "top";
  const align = centred ? "center" : "flex-start";
  const slam = c.slam ? whip(t, 1.4, 8) : 1;
  const glow = c.slam ? hitEnv(t, 7) : 0;

  const pos: React.CSSProperties =
    c.place === "lowerLeft"
      ? { left: SAFE_X, right: SAFE_X, bottom: 128, justifyContent: "flex-end" }
      : c.place === "upperLeft"
        ? { left: SAFE_X, right: SAFE_X, top: 170, justifyContent: "flex-start" }
        : c.place === "left"
          ? { left: SAFE_X, right: "45%", top: 0, bottom: 0, justifyContent: "center" }
          : c.place === "top"
            ? { left: SAFE_X, right: SAFE_X, top: 130, justifyContent: "flex-start" }
            : { left: SAFE_X, right: SAFE_X, top: 0, bottom: 0, justifyContent: "center" };

  const scrim =
    c.place === "lowerLeft"
      ? "radial-gradient(ellipse at 0% 100%, rgba(3,6,12,0.82) 0%, rgba(3,6,12,0.45) 38%, rgba(3,6,12,0) 66%)"
      : c.place === "upperLeft"
        ? "radial-gradient(ellipse at 0% 0%, rgba(3,6,12,0.82) 0%, rgba(3,6,12,0.45) 38%, rgba(3,6,12,0) 66%)"
        : c.place === "left"
          ? "radial-gradient(ellipse at 0% 50%, rgba(3,6,12,0.75) 0%, rgba(3,6,12,0.35) 40%, rgba(3,6,12,0) 70%)"
          : c.place === "top"
            ? "radial-gradient(ellipse at 50% 0%, rgba(3,6,12,0.7) 0%, rgba(3,6,12,0) 55%)"
            : "radial-gradient(ellipse at 50% 50%, rgba(3,6,12,0.6) 0%, rgba(3,6,12,0) 60%)";

  return (
    <AbsoluteFill style={{ opacity: 1 - out, translate: `0 ${-14 * out}px` }}>
      <AbsoluteFill style={{ background: scrim, opacity: clamp(pop(t + 2)) }} />
      {c.big ? (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              fontFamily: EN,
              fontWeight: 800,
              fontSize: 420,
              letterSpacing: "-0.02em",
              color: "rgba(255,255,255,0.06)",
              WebkitTextStroke: "2px rgba(255,236,210,0.45)",
              opacity: clamp(pop(t)),
              scale: `${1.12 - 0.12 * whip(t, 0.6, 14) + 0.04 * clamp((frame - start) / (end - start))}`,
            }}
          >
            {c.big}
          </div>
        </AbsoluteFill>
      ) : null}
      <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: align, textAlign: centred ? "center" : "left", ...pos }}>
        {c.kicker ? (
          <Reveal t={t} style={{ fontFamily: ZH_SANS, fontWeight: 700, fontSize: 30, letterSpacing: "0.16em", color: look.accent, marginBottom: 14 }}>
            {c.kicker}
          </Reveal>
        ) : null}
        {c.slam ? (
          <div
            style={{
              fontFamily: ZH_SERIF,
              fontWeight: 800,
              fontSize: c.size,
              lineHeight: 1.12,
              letterSpacing: "0.04em",
              color: "#fff8ee",
              opacity: clamp(pop(t)),
              scale: `${1.45 - 0.45 * slam}`,
              transformOrigin: centred ? "50% 60%" : "0% 60%",
              textShadow: `0 6px 34px rgba(0,0,0,0.55), 0 0 ${40 * glow}px rgba(255,236,200,${0.9 * glow})`,
            }}
          >
            {c.title}
          </div>
        ) : (
          <Reveal
            t={t}
            style={{
              fontFamily: ZH_SERIF,
              fontWeight: 800,
              fontSize: c.size,
              lineHeight: 1.12,
              letterSpacing: "0.04em",
              color: "#fff8ee",
              textShadow: "0 6px 34px rgba(0,0,0,0.55)",
            }}
          >
            {c.title}
          </Reveal>
        )}
        {c.sub ? (
          <Reveal t={ts} style={{ fontFamily: ZH_SANS, fontWeight: 500, fontSize: 44, lineHeight: 1.3, color: "rgba(255,255,255,0.92)", marginTop: 18, textShadow: "0 3px 18px rgba(0,0,0,0.6)" }}>
            {c.sub}
          </Reveal>
        ) : null}
        {c.en ? (
          <Reveal t={c.sub ? ts - 1.5 : t - 2} style={{ fontFamily: EN, fontWeight: 500, fontSize: 27, letterSpacing: "0.05em", color: "rgba(255,255,255,0.72)", marginTop: 12, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
            {c.en}
          </Reveal>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const Chapter: React.FC<{ frame: number; clock: Clock; chapters: PenangProps["chapters"]; look: Look }> = ({ frame, clock, chapters, look }) => {
  const i = lastIndexWhere(chapters, (c) => clock.f(c.at) - 1 <= frame);
  if (i < 0 || !chapters[i].label) return null;
  const c = chapters[i];
  const t = frame - clock.f(c.at);
  const u = whip(t, 0.4, 10);
  const nextAt = chapters[i + 1] ? clock.f(chapters[i + 1].at) : Infinity;
  const out = easeIn(inv(nextAt - 6, nextAt, frame));
  const [num, ...rest] = c.label.split(" ");
  return (
    <div style={{ position: "absolute", left: SAFE_X, top: 64, display: "flex", alignItems: "center", gap: 18, opacity: clamp(pop(t)) * (1 - out), translate: `${(1 - u) * -30}px 0` }}>
      <div style={{ fontFamily: EN, fontWeight: 800, fontSize: 30, color: look.accent, letterSpacing: "0.04em" }}>{num}</div>
      <div style={{ width: 2, height: 40, backgroundColor: look.accent, opacity: 0.8 }} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <span style={{ fontFamily: ZH_SANS, fontWeight: 700, fontSize: 26, color: "#ffffff", letterSpacing: "0.2em" }}>{rest.join(" ")}</span>
        <span style={{ fontFamily: EN, fontWeight: 600, fontSize: 15, color: "rgba(255,255,255,0.7)", letterSpacing: "0.32em" }}>{c.en}</span>
      </div>
    </div>
  );
};

const Year: React.FC<{ frame: number; clock: Clock; years: PenangProps["years"]; look: Look }> = ({ frame, clock, years, look }) => {
  const i = lastIndexWhere(years, (y) => clock.f(y.at) - 1 <= frame);
  if (i < 0) return null;
  const cur = years[i];
  const prev = i > 0 ? years[i - 1] : null;
  const t = frame - clock.f(cur.at);
  const u = whip(t, 0.6, 9);
  const show = (text: string, y: number, o: number) =>
    text ? (
      <div style={{ position: "absolute", right: 0, top: 0, translate: `0 ${y}px`, opacity: o }}>
        <span style={{ fontFamily: EN, fontWeight: 700, fontSize: 44, letterSpacing: "0.08em", color: "#ffffff" }}>{text}</span>
      </div>
    ) : null;
  return (
    <div style={{ position: "absolute", right: SAFE_X, top: 58, width: 300, height: 60, overflow: "hidden" }}>
      {prev ? show(prev.text, -60 * u, 1 - u) : null}
      {show(cur.text, 60 * (1 - u), clamp(u))}
      <div style={{ position: "absolute", right: 0, bottom: 0, width: 56, height: 3, backgroundColor: look.accent, opacity: cur.text ? 0.9 : 0 }} />
    </div>
  );
};

const Credits: React.FC<{ frame: number; clock: Clock; lines: readonly string[] }> = ({ frame, clock, lines }) => {
  const t = frame - clock.endFrame;
  if (t < 0) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 16, opacity: clamp((t - 2) / 8) }}>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: ZH_SANS,
            fontWeight: i === 0 ? 700 : 400,
            fontSize: i === 0 ? 34 : 30,
            letterSpacing: i === 0 ? "0.3em" : "0.04em",
            color: i === 0 ? "#ffffff" : "rgba(255,255,255,0.78)",
            marginBottom: i === 0 ? 12 : 0,
          }}
        >
          {line}
        </div>
      ))}
    </AbsoluteFill>
  );
};

export const TextLayer: React.FC<{ props: PenangProps; clock: Clock }> = ({ props, clock }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {props.captions.map((c, i) => (
        <CaptionBlock key={i} c={c} frame={frame} clock={clock} look={props.look} />
      ))}
      {frame < clock.endFrame ? <Chapter frame={frame} clock={clock} chapters={props.chapters} look={props.look} /> : null}
      {frame < clock.endFrame ? <Year frame={frame} clock={clock} years={props.years} look={props.look} /> : null}
      <Credits frame={frame} clock={clock} lines={props.credits} />
    </AbsoluteFill>
  );
};
