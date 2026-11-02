// Shared look of the jinmyaigc promo: fonts, palette, the warm background,
// rounded cards that hold the clips, the step header, words that pop in on
// the beat, sparkles. Every animation is a function of the frame.

import { loadFont } from "@remotion/fonts";
import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { clamp, easeOut, hash, noise1, pop, whip } from "../intro-free/anim.ts";
import { BEAT } from "./timeline.ts";

export const HEAD = "Fredoka-JM";
export const BODY = "Inter-JM";
loadFont({ family: HEAD, url: staticFile("fonts/fredoka/fredoka-latin.woff2"), weight: "300 700" });
loadFont({ family: BODY, url: staticFile("fonts/inter/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2"), weight: "100 900" });

export const C = {
  ink: "#2a1f2d",
  inkSoft: "rgba(42,31,45,0.62)",
  lilac: "#7b5cff",
  lilacSoft: "#cdbfff",
  coral: "#ff7a59",
  cream: "#fff6ec",
  white: "#ffffff",
};

// Warm cream canvas with two soft colour blobs drifting slowly.
export const Background: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame / 30;
  const ax = 22 + 6 * noise1(t * 0.25, 1);
  const ay = 28 + 5 * noise1(t * 0.22, 2);
  const bx = 78 + 6 * noise1(t * 0.2, 3);
  const by = 72 + 5 * noise1(t * 0.24, 4);
  return (
    <AbsoluteFill
      style={{
        background: [
          `radial-gradient(circle at ${ax}% ${ay}%, rgba(205,191,255,0.75) 0%, rgba(205,191,255,0) 42%)`,
          `radial-gradient(circle at ${bx}% ${by}%, rgba(255,200,168,0.7) 0%, rgba(255,200,168,0) 45%)`,
          "linear-gradient(180deg, #fff6ec 0%, #fdeadf 55%, #f9ddd3 100%)",
        ].join(", "),
      }}
    />
  );
};

// A clip inside a rounded box, cropped to the box (object-fit: cover).
// `fromSec` is where in the clip the box starts playing (its own Sequence
// decides when that is); `rate` slows it down (trimBefore is not scaled by it).
export const ClipView: React.FC<{
  src: string;
  fromSec: number;
  volume?: number | ((f: number) => number);
  rate?: number;
  focusX?: number;
  focusY?: number;
}> = ({ src, fromSec, volume, rate = 1, focusX = 50, focusY = 50 }) => (
  <OffthreadVideo
    src={staticFile(src)}
    trimBefore={Math.round(fromSec * 30)}
    playbackRate={rate}
    muted={volume === undefined}
    volume={volume}
    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${focusX}% ${focusY}%`, display: "block" }}
  />
);

// White rounded card with a soft shadow.
export const Card: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  scale?: number;
  pad?: number;
  radius?: number;
  opacity?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
  footerH?: number;
}> = ({ x, y, w, h, rotate = 0, scale = 1, pad = 14, radius = 40, opacity = 1, children, footer, footerH = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      rotate: `${rotate}deg`,
      scale: `${scale}`,
      opacity,
      backgroundColor: C.white,
      borderRadius: radius,
      padding: pad,
      boxSizing: "border-box",
      boxShadow: "0 34px 70px rgba(70,35,50,0.22), 0 8px 18px rgba(70,35,50,0.12)",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <div style={{ flex: 1, borderRadius: radius - pad * 0.6, overflow: "hidden", position: "relative" }}>{children}</div>
    {footer ? <div style={{ height: footerH, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>{footer}</div> : null}
  </div>
);

// Words that pop in one after another, every `step` frames from `start`.
// A "\n" in the text forces a line break.
export const Words: React.FC<{
  text: string;
  frame: number;
  start: number;
  step?: number;
  size: number;
  color: string;
  weight?: number;
  font?: string;
  lineHeight?: number;
  shadow?: string;
  align?: "center" | "left";
}> = ({ text, frame, start, step = BEAT / 2, size, color, weight = 700, font = HEAD, lineHeight = 1.08, shadow, align = "center" }) => {
  const lines = text.split("\n").map((l) => l.split(" "));
  const firstIndex = lines.map((_, li) => lines.slice(0, li).reduce((n, l) => n + l.length, 0));
  return (
    <div style={{ fontFamily: font, fontWeight: weight, fontSize: size, lineHeight, color, textAlign: align, textShadow: shadow }}>
      {lines.map((words, li) => (
        <div key={li}>
          {words.map((w, wi) => {
            const t = frame - start - (firstIndex[li] + wi) * step;
            const k = whip(t, 1.2, 9);
            return (
              <span key={wi} style={{ display: "inline-block", opacity: clamp(pop(t)), translate: `0 ${(1 - k) * 0.35}em`, scale: `${0.7 + 0.3 * k}`, margin: "0 0.12em" }}>
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// "1  Upload a photo": a numbered badge and the step name.
export const StepHeader: React.FC<{ n: number; text: string; frame: number; start: number; out?: number }> = ({ n, text, frame, start, out = 0 }) => {
  const t = frame - start;
  const k = whip(t, 1.4, 10);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 250,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 28,
        opacity: clamp(pop(t)) * (1 - out),
        translate: `0 ${-60 * out}px`,
      }}
    >
      <div
        style={{
          width: 104,
          height: 104,
          borderRadius: 52,
          backgroundColor: C.lilac,
          color: C.white,
          fontFamily: HEAD,
          fontWeight: 700,
          fontSize: 66,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          scale: `${0.4 + 0.6 * k}`,
          boxShadow: "0 12px 28px rgba(123,92,255,0.35)",
        }}
      >
        {n}
      </div>
      <div style={{ translate: `${(1 - whip(t - 3, 0.8, 10)) * 60}px 0`, opacity: clamp(pop(t - 3)) }}>
        <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 86, color: C.ink }}>{text}</span>
      </div>
    </div>
  );
};

// A four-pointed star that bursts out and fades (once, for the hero only).
export const Sparkles: React.FC<{ frame: number; start: number; cx: number; cy: number; radius: number; count?: number; color?: string; seed?: number }> = ({
  frame,
  start,
  cx,
  cy,
  radius,
  count = 6,
  color = C.lilac,
  seed = 1,
}) => {
  const t = frame - start;
  if (t < -1 || t > 28) return null;
  const k = easeOut(clamp(t / 18));
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + hash(seed + i) * 0.6;
        const r = radius * (0.75 + 0.35 * hash(seed + i * 3.1)) * (0.6 + 0.4 * k);
        const s = (14 + 12 * hash(seed + i * 5.3)) * Math.sin(Math.PI * clamp(t / 26));
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        return (
          <path
            key={i}
            d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`}
            fill={i % 2 ? C.coral : color}
            opacity={0.9}
          />
        );
      })}
    </svg>
  );
};

// White pill with a label, for scene names on the cards.
export const Chip: React.FC<{ text: string; size?: number; color?: string; bg?: string }> = ({ text, size = 44, color = C.lilac, bg = C.white }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: `${size * 0.32}px ${size * 0.62}px`,
      borderRadius: size,
      backgroundColor: bg,
      color,
      fontFamily: HEAD,
      fontWeight: 600,
      fontSize: size,
      boxShadow: "0 10px 24px rgba(70,35,50,0.18)",
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);
