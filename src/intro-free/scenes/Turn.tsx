import { useCurrentFrame } from "remotion";
import { CONTENT } from "../../content";
import { clamp, easeInOut, easeOut, hash, lerp, noise1, pop, whip } from "../anim.ts";
import { FRAMES_PER_STEP } from "../beat.ts";
import { camAt, camTransform, shakeAt } from "../camera.ts";
import { MONO, ZH } from "../fonts";
import { at, DotGrid } from "../parts";
import { C } from "../theme.ts";
import { T } from "../timeline.ts";

const TU = CONTENT.turn;

// ------------------------------------------------------------------ "sounds nice"
// 11–13 s. A pretty, airy, pastel frame — the version people like to hear.
const BLOBS = [
  { x: -620, y: -260, r: 520, c: "255,170,200" },
  { x: 560, y: -300, r: 560, c: "190,170,255" },
  { x: -380, y: 330, r: 500, c: "255,214,170" },
  { x: 640, y: 300, r: 460, c: "170,235,215" },
];
const Sparkle: React.FC<{ x: number; y: number; size: number; s: number; i: number }> = ({ x, y, size, s, i }) => {
  // twinkle on the 8th notes, each one out of phase
  const ph = ((s + i * 3) % (FRAMES_PER_STEP * 2)) / (FRAMES_PER_STEP * 2);
  const k = 0.55 + 0.45 * Math.cos(ph * Math.PI * 2);
  return (
    <svg
      width={size}
      height={size}
      viewBox="-10 -10 20 20"
      style={{ ...at(x, y, `rotate(${s * 1.5 + i * 40}deg) scale(${k})`), opacity: 0.85 }}
    >
      <path d="M0 -10 C1 -2 2 -1 10 0 C2 1 1 2 0 10 C-1 2 -2 1 -10 0 C-2 -1 -1 -2 0 -10 Z" fill="#ffffff" />
    </svg>
  );
};

export const Nice: React.FC = () => {
  const s = useCurrentFrame();
  const t = s - T.nice;
  const z = lerp(1, 1.07, easeInOut(t / 64));
  const textIn = whip(t, 0.6);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#f4eee8", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 960, top: 540, transform: `scale(${z})` }}>
        {BLOBS.map((b, i) => (
          <div
            key={i}
            style={{
              ...at(b.x + 40 * noise1(s * 0.03, i), b.y + 30 * noise1(s * 0.03, i + 9)),
              width: b.r * 2,
              height: b.r * 2,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(${b.c},0.85) 0%, rgba(${b.c},0) 70%)`,
            }}
          />
        ))}
        {[
          [-640, -150, 46],
          [610, -170, 38],
          [-520, 120, 30],
          [700, 90, 52],
          [-120, -250, 26],
          [260, 230, 34],
          [-760, -20, 22],
          [420, -250, 24],
        ].map(([x, y, sz], i) => (
          <Sparkle key={i} x={x} y={y} size={sz} s={s} i={i} />
        ))}
        <div
          style={{
            ...at(0, -40, `scale(${lerp(1.18, 1, textIn)})`),
            fontFamily: ZH,
            fontWeight: 900,
            fontSize: 132,
            lineHeight: 1.2,
            backgroundImage: "linear-gradient(90deg, #e2557f, #8a5cff 55%, #2f8fff)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            opacity: pop(t),
          }}
        >
          {TU.nice}
        </div>
        <div style={{ ...at(0, 110), fontFamily: ZH, fontWeight: 700, fontSize: 60, color: "#4d4256", opacity: pop(s - T.niceSub), transform: `translate(-50%, -50%) translateY(${(1 - whip(s - T.niceSub, 0)) * 26}px)` }}>
          {TU.niceSub}
        </div>
        <div style={{ ...at(0, 190), fontFamily: MONO, fontSize: 26, letterSpacing: "0.12em", color: "#857a8c", opacity: pop(s - T.niceSub) }}>
          {TU.niceEn}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ squeeze
// 13–15 s. Back to the dark: two walls slam in on every beat, the words get
// crushed, the ideas squirt out of the top — and then the tape stops.
const WORD_FS = 240;
const WORD_Y = 70;
const WORD_W = [...TU.squeeze].length * WORD_FS;
const GAPS = [
  { f: T.squeeze, to: 1260 },
  { f: T.slams[0], to: 880 },
  { f: T.slams[1], to: 620 },
  { f: T.pour, to: 440 },
];
const gapAt = (s: number) => GAPS.reduce((g, k, i) => g + (k.to - (i ? GAPS[i - 1].to : 2600)) * whip(s - k.f, 1.4, 7), 2600);

// Picture time slows to a halt with the music (tape stop), then cuts to black.
const tapeTime = (s: number) => {
  if (s <= T.tapeStop) return s;
  const L = T.stop - T.tapeStop;
  const u = Math.min(s - T.tapeStop, L);
  return T.tapeStop + u - (u * u) / (2 * L);
};

export const Squeeze: React.FC = () => {
  const real = useCurrentFrame();
  const s = tapeTime(real);
  const hits = [T.squeeze, ...T.slams, T.pour].map((f, i) => ({ f, amp: 0.45 + i * 0.18 }));
  const sh = shakeAt(s, hits);
  const cam = camAt(s, { x: 0, y: 0, z: 1.0, r: 0 }, [
    { f: T.squeeze, to: { z: 1.04 }, bounce: 1 },
    { f: T.slams[0], to: { z: 1.09, r: -1.5 }, bounce: 1.2 },
    { f: T.slams[1], to: { z: 1.15, r: 1.5 }, bounce: 1.2 },
    { f: T.pour, to: { z: 1.05, y: -70, r: 0 }, bounce: 1 },
  ]);
  const gap = gapAt(s);
  const sx = clamp((gap - 70) / (WORD_W + 40), 0.12, 1);
  const sy = 1 + 0.6 * (1 - sx);
  const squeezeAmt = 1 - sx;
  const fade = 1 - 0.45 * clamp((real - T.tapeStop) / (T.stop - T.tapeStop));
  const pourChars = [...TU.pour];
  const tp = s - T.pour;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, overflow: "hidden", filter: `brightness(${fade}) saturate(${fade})` }}>
      <DotGrid cam={cam} sh={sh} />
      <div style={{ position: "absolute", left: 0, top: 0, transform: camTransform(cam, sh) }}>
        <div style={{ ...at(0, -330), fontFamily: ZH, fontWeight: 700, fontSize: 66, color: C.ink, opacity: pop(s - T.squeeze) }}>{TU.actually}</div>
        {/* the crushed word: each character trembles more the harder it's squeezed */}
        <div style={{ ...at(0, WORD_Y, `scale(${sx}, ${sy})`), display: "flex", fontFamily: ZH, fontWeight: 900, fontSize: WORD_FS, lineHeight: 1, color: C.ink, opacity: pop(s - T.squeeze) }}>
          {[...TU.squeeze].map((ch, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: `translate(${squeezeAmt * 10 * noise1(s * 1.7, i)}px, ${squeezeAmt * 14 * noise1(s * 1.5, i + 5)}px) rotate(${squeezeAmt * 7 * noise1(s * 1.3, i + 11)}deg)`,
              }}
            >
              {ch}
            </span>
          ))}
        </div>
        {/* the walls */}
        {[-1, 1].map((side) => (
          <div
            key={side}
            style={{
              ...at((side * gap) / 2 + side * 45, WORD_Y),
              width: 90,
              height: 820,
              borderRadius: 10,
              background: `repeating-linear-gradient(135deg, ${C.llm} 0 34px, #1a1408 34px 52px)`,
              boxShadow: `0 0 60px rgba(255,181,71,${0.25 + 0.4 * squeezeAmt})`,
            }}
          />
        ))}
        {/* the ideas, squeezed out of the top, in reading order */}
        {pourChars.map((ch, i) => {
          const tt = tp - i * 0.6;
          const out = tt > -0.75 ? whip(tt, 0.4, 9) : 0;
          const n = pourChars.length;
          const x = (i - (n - 1) / 2) * 128 * out + Math.sin(tt * 0.35 + i) * 6 * out;
          const y = lerp(WORD_Y - 40, -205, out) + Math.max(0, tt - 6) * 2.2 + 14 * Math.sin(i * 1.3) * out;
          const rot = (hash(i + 3) - 0.5) * 22 * out + Math.max(0, tt - 6) * (i % 2 ? 2 : -2);
          return (
            <div
              key={i}
              style={{
                ...at(x, y, `rotate(${rot}deg) scale(${lerp(0.25, 1, out)})`),
                fontFamily: ZH,
                fontWeight: 900,
                fontSize: 118,
                lineHeight: 1,
                color: C.llm,
                opacity: clamp(out * 2),
                textShadow: "0 0 30px rgba(0,0,0,0.8)",
              }}
            >
              {ch}
            </div>
          );
        })}
        <div style={{ ...at(0, 470), fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em", color: C.dim, opacity: pop(s - T.squeeze) * (1 - easeOut((s - T.pour) / 6) * (s >= T.pour - 0.75 ? 1 : 0)) }}>
          {TU.squeezeEn}
        </div>
      </div>
    </div>
  );
};

