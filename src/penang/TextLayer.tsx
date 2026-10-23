// Text layer, always on top of the effects so the light never washes it out.
// Three caption styles: big titles (the hook, the film title), documentary
// subtitles (in the lower letterbox bar when there is one) and big numbers
// with a small label that drift slowly with the picture. Then the credits.
// Every entrance is timed in beats.

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { clamp, easeIn, easeOut, hitEnv, inv, lerp, pop, whip } from "./anim";
import type { Clock } from "./beats";
import { EN, ZH_SANS, ZH_SERIF } from "./fonts";
import type { Caption, PenangProps } from "./schema";

type Look = PenangProps["look"];

const SAFE_X = 120;

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

// A title typed out on the beat grid: character i lands on the eighth note
// nearest to at + i * typeBeats / n. The whole line is laid out from the
// start (hidden characters are transparent), so nothing shifts while typing.
const Typed: React.FC<{ text: string; c: Caption; frame: number; clock: Clock; style: React.CSSProperties }> = ({
  text,
  c,
  frame,
  clock,
  style,
}) => {
  const chars = [...text];
  const n = Math.max(1, chars.filter((ch) => ch.trim() !== "").length);
  let k = 0;
  return (
    <div style={style}>
      {chars.map((ch, i) => {
        if (ch.trim() === "") return <span key={i}>{ch}</span>;
        const at = c.at + Math.round(((k++ * c.typeBeats) / n) * 2) / 2;
        const t = frame - clock.f(at);
        const a = clamp(pop(t));
        return (
          <span key={i} style={{ display: "inline-block", opacity: a, translate: `0 ${(1 - whip(t, 0.8, 6)) * 0.25}em` }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// Where a title or number block sits, inside the picture area between the bars.
const placeStyle = (place: Caption["place"], bar: number): React.CSSProperties => {
  switch (place) {
    case "lowerLeft":
      return { left: SAFE_X, right: SAFE_X, bottom: bar + 70, justifyContent: "flex-end", alignItems: "flex-start" };
    case "upperLeft":
      return { left: SAFE_X, right: SAFE_X, top: bar + 60, justifyContent: "flex-start", alignItems: "flex-start" };
    case "left":
      return { left: SAFE_X, right: "45%", top: bar, bottom: bar, justifyContent: "center", alignItems: "flex-start" };
    case "right":
      return { left: "45%", right: SAFE_X, top: bar, bottom: bar, justifyContent: "center", alignItems: "flex-end" };
    case "top":
      return { left: SAFE_X, right: SAFE_X, top: bar + 60, justifyContent: "flex-start", alignItems: "center" };
    default:
      return { left: SAFE_X, right: SAFE_X, top: bar, bottom: bar, justifyContent: "center", alignItems: "center" };
  }
};

const scrimOf = (place: Caption["place"]) =>
  place === "lowerLeft"
    ? "radial-gradient(ellipse at 0% 100%, rgba(3,6,12,0.82) 0%, rgba(3,6,12,0.45) 38%, rgba(3,6,12,0) 66%)"
    : place === "upperLeft"
      ? "radial-gradient(ellipse at 0% 0%, rgba(3,6,12,0.82) 0%, rgba(3,6,12,0.45) 38%, rgba(3,6,12,0) 66%)"
      : place === "left"
        ? "radial-gradient(ellipse at 0% 50%, rgba(3,6,12,0.75) 0%, rgba(3,6,12,0.35) 40%, rgba(3,6,12,0) 70%)"
        : place === "right"
          ? "radial-gradient(ellipse at 100% 50%, rgba(3,6,12,0.7) 0%, rgba(3,6,12,0.3) 40%, rgba(3,6,12,0) 70%)"
          : place === "top"
            ? "radial-gradient(ellipse at 50% 0%, rgba(3,6,12,0.7) 0%, rgba(3,6,12,0) 55%)"
            : "radial-gradient(ellipse at 50% 50%, rgba(3,6,12,0.6) 0%, rgba(3,6,12,0) 60%)";

type Part = { c: Caption; frame: number; clock: Clock; look: Look };

// A caption ends on the cut frame of its last beat (clock.cut), so one that
// ends where a shot ends is already gone on the new shot's first frame.
const timing = ({ c, frame, clock }: Part) => {
  const start = clock.f(c.at);
  const end = clock.cut(c.at + c.beats);
  const out = c.exit > 0 ? easeIn(inv(end - 1 - c.exit, end - 0.5, frame)) : 0;
  return { start, end, t: frame - start, out };
};

const TitleCaption: React.FC<Part> = (props) => {
  const { c, frame, clock, look } = props;
  const { t, out } = timing(props);
  const ts = frame - clock.f(c.at + c.subAt);
  const centred = c.place === "center" || c.place === "top";
  const slam = c.slam ? whip(t, 1.4, 8) : 1;
  const glow = c.slam ? hitEnv(t, 7) : 0;
  const titleStyle: React.CSSProperties = {
    fontFamily: ZH_SERIF,
    fontWeight: 800,
    fontSize: c.size,
    lineHeight: 1.12,
    letterSpacing: c.typeBeats > 0 ? "0.06em" : "0.04em",
    color: "#fff8ee",
    textShadow: "0 6px 34px rgba(0,0,0,0.55)",
  };
  return (
    <AbsoluteFill style={{ opacity: 1 - out, translate: `0 ${-14 * out}px` }}>
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          textAlign: centred ? "center" : "left",
          translate: `0 ${c.dy}px`,
          ...placeStyle(c.place, look.letterbox),
        }}
      >
        {c.typeBeats > 0 ? (
          <Typed text={c.title} c={c} frame={frame} clock={clock} style={titleStyle} />
        ) : c.slam ? (
          <div
            style={{
              ...titleStyle,
              opacity: clamp(pop(t)),
              scale: `${1.45 - 0.45 * slam}`,
              transformOrigin: centred ? "50% 60%" : "0% 60%",
              textShadow: `0 6px 34px rgba(0,0,0,0.55), 0 0 ${40 * glow}px rgba(255,236,200,${0.9 * glow})`,
            }}
          >
            {c.title}
          </div>
        ) : (
          <Reveal t={t} style={titleStyle}>
            {c.title}
          </Reveal>
        )}
        {c.sub ? (
          <Reveal t={ts} style={{ fontFamily: ZH_SANS, fontWeight: 500, fontSize: 44, lineHeight: 1.3, color: "rgba(255,255,255,0.92)", marginTop: 18, textShadow: "0 3px 18px rgba(0,0,0,0.6)" }}>
            {c.sub}
          </Reveal>
        ) : null}
        {c.en ? (
          <Reveal t={c.sub ? ts - 1.5 : t - 2} style={{ fontFamily: EN, fontWeight: 600, fontSize: 28, letterSpacing: "0.42em", color: "rgba(255,255,255,0.75)", marginTop: 14, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
            {c.en}
          </Reveal>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// Bottom subtitle: fades in and out, does not slide.
const SubtitleCaption: React.FC<Part> = (props) => {
  const { c, look } = props;
  const { t, out } = timing(props);
  const bar = look.letterbox;
  const inBar = bar >= 90;
  const a = clamp(inv(-0.75, 4, t)) * (1 - out);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", opacity: a }}>
      <div
        style={{
          height: inBar ? bar : undefined,
          marginBottom: inBar ? 0 : 70,
          display: "flex",
          alignItems: "center",
          fontFamily: ZH_SANS,
          fontWeight: 500,
          fontSize: c.size,
          letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.94)",
          textShadow: inBar ? undefined : "0 2px 12px rgba(0,0,0,0.85)",
          translate: `0 ${(1 - easeOut(inv(-0.75, 6, t))) * 8}px`,
        }}
      >
        {c.title}
      </div>
    </AbsoluteFill>
  );
};

// Big number (digits in Inter, Chinese units in the serif) with a small
// label above it. It rises out of a mask on its beat, then drifts slowly
// sideways for as long as it stays, so it moves with the camera.
const NumberCaption: React.FC<Part> = (props) => {
  const { c, frame, clock, look } = props;
  const { start, end, t, out } = timing(props);
  const ts = frame - clock.f(c.at + c.subAt);
  const right = c.place === "right";
  const centred = c.place === "center" || c.place === "top";
  const p = clamp((frame - start) / Math.max(1, end - start));
  const driftX = lerp(-16, 16, p) * (right ? -1 : 1);
  const runs = c.title.match(/[0-9.,]+|[^0-9.,]+/g) ?? [];
  let k = 0;
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          translate: `${driftX}px ${c.dy}px`,
          filter: out > 0 ? `blur(${6 * out}px)` : undefined,
          ...placeStyle(c.place, look.letterbox),
        }}
      >
        {c.sub ? (
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexDirection: right ? "row-reverse" : "row", marginBottom: 6,
            opacity: clamp(pop(ts)), translate: `${(1 - whip(ts, 0.3, 10)) * (right ? 30 : -30)}px 0` }}>
            {centred ? null : <div style={{ width: 70 * whip(ts, 0, 12), height: 3, backgroundColor: look.accent }} />}
            <div style={{ fontFamily: ZH_SANS, fontWeight: 700, fontSize: 34, letterSpacing: "0.24em", color: look.accent,
              textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}>
              {c.sub}
            </div>
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "baseline", overflow: "hidden", paddingBottom: "0.06em",
          flexDirection: "row", justifyContent: right ? "flex-end" : centred ? "center" : "flex-start" }}>
          {runs.map((run, i) => {
            const digits = /^[0-9.,]+$/.test(run);
            return (
              <span key={i} style={{ display: "inline-flex", fontFamily: digits ? EN : ZH_SERIF, fontWeight: 800,
                fontSize: digits ? c.size : c.size * 0.4, letterSpacing: digits ? "-0.02em" : "0.04em",
                marginLeft: !digits && i > 0 ? c.size * 0.08 : 0, color: "#fff8ee",
                textShadow: "0 10px 50px rgba(0,0,0,0.55)" }}>
                {[...run].map((ch, j) => {
                  const tc = t - (k++) * 1.5;
                  return (
                    <span key={j} style={{ display: "inline-block", opacity: clamp(pop(tc)), translate: `0 ${(1 - whip(tc, 0.35, 11)) * 0.9}em` }}>
                      {ch}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CaptionScrim: React.FC<Part> = (props) => {
  const { c } = props;
  const { t, out } = timing(props);
  if (!c.scrim || c.style === "subtitle") return null;
  return <AbsoluteFill style={{ background: scrimOf(c.place), opacity: clamp(pop(t + 2)) * (1 - out) }} />;
};

const Credits: React.FC<{ frame: number; clock: Clock; credits: PenangProps["credits"]; bar: number }> = ({ frame, clock, credits, bar }) => {
  const start = clock.f(credits.at);
  const end = clock.f(credits.at + credits.beats);
  if (frame < start || frame > end) return null;
  const opacity = clamp((frame - start) / 8) * (1 - clamp((frame - (end - 8)) / 8));
  if (credits.place === "bottom") {
    // small, over the picture, so a loop can end on the opening frame
    return (
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", opacity }}>
        <AbsoluteFill style={{ background: "linear-gradient(rgba(3,6,12,0) 50%, rgba(3,6,12,0.8) 100%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, marginBottom: Math.max(56, bar + 26) }}>
          {credits.lines.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: ZH_SANS,
                fontWeight: i === 0 ? 700 : 400,
                fontSize: i === 0 ? 24 : 22,
                letterSpacing: i === 0 ? "0.3em" : "0.03em",
                color: i === 0 ? "#ffffff" : "rgba(255,255,255,0.84)",
                textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                marginBottom: i === 0 ? 4 : 0,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 16, opacity }}>
      {credits.lines.map((line, i) => (
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
  const live = props.captions.filter((c) => frame >= clock.f(c.at) - 1 && frame < clock.cut(c.at + c.beats));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* all scrims first, so one caption's backing never covers another's letters */}
      {live.map((c, i) => (
        <CaptionScrim key={`s${i}`} c={c} frame={frame} clock={clock} look={props.look} />
      ))}
      {live.map((c, i) =>
        c.style === "subtitle" ? (
          <SubtitleCaption key={`t${i}`} c={c} frame={frame} clock={clock} look={props.look} />
        ) : c.style === "number" ? (
          <NumberCaption key={`t${i}`} c={c} frame={frame} clock={clock} look={props.look} />
        ) : (
          <TitleCaption key={`t${i}`} c={c} frame={frame} clock={clock} look={props.look} />
        ),
      )}
      <Credits frame={frame} clock={clock} credits={props.credits} bar={props.look.letterbox} />
    </AbsoluteFill>
  );
};
