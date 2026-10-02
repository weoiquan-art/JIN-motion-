import { Freeze, Loop, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { clamp, easeIn, easeOut, hash, inv, lerp, springAt } from "../../intro/math";
import { screenToWorld } from "../camera";
import { MONO_STACK, ZH } from "../fonts";
import { CLIPS, GLITCH_CARDS, type GlitchCardDef, HEIGHT, S, WIDTH } from "../timeline.ts";

const RED = "#ff453a";

// Screen size of a result card: clearly smaller than the template.
const cardSize = (g: GlitchCardDef) => {
  const base = g.clip === "portrait" ? { w: 196, h: 196 / CLIPS.portrait.aspect } : { w: 352, h: 352 / CLIPS.wide.aspect };
  return g.glitch === "stretch" ? { w: base.w * 1.34, h: base.h } : base;
};

const anchor = (g: GlitchCardDef) => {
  const { w, h } = cardSize(g);
  const m = 76;
  const x = g.corner.includes("r") ? WIDTH - m - w / 2 : m + w / 2;
  const y = g.corner.startsWith("t") ? m + 40 + h / 2 : HEIGHT - m - 54 - h / 2;
  return { x, y };
};

const Video: React.FC<{ g: GlitchCardDef; frame: number; style?: React.CSSProperties }> = ({ g, frame, style }) => {
  const clip = CLIPS[g.clip];
  return (
    <Freeze frame={frame}>
      <Sequence from={g.pop} layout="none">
        <Loop durationInFrames={clip.frames} layout="none">
          <OffthreadVideo
            src={staticFile(clip.src)}
            muted
            style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: g.glitch === "stretch" ? "fill" : "contain", ...style }}
          />
        </Loop>
      </Sequence>
    </Freeze>
  );
};

// "Almost but wrong": one code-made glitch per card.
const GlitchedFootage: React.FC<{ g: GlitchCardDef; idx: number; f: number; w: number; h: number }> = ({ g, idx, f, w, h }) => {
  const whole = Math.round(f);
  const id = `g${idx}`;
  if (g.glitch === "stutter") {
    // motion keeps freezing on the same frame
    const held = g.pop + Math.floor((whole - g.pop) / 7) * 7;
    return <Video g={g} frame={held} />;
  }
  if (g.glitch === "tear") {
    const bands = 7;
    return (
      <>
        {new Array(bands).fill(0).map((_, b) => {
          const step = Math.floor(whole / 3);
          const off = hash(b * 13 + step * 7) > 0.45 ? (hash(b * 31 + step) - 0.5) * 46 : 0;
          return (
            <div key={b} style={{ position: "absolute", left: 0, top: (b * h) / bands, width: w, height: h / bands + 1, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: off, top: (-b * h) / bands, width: w, height: h }}>
                <Video g={g} frame={whole} />
              </div>
            </div>
          );
        })}
      </>
    );
  }
  if (g.glitch === "pixelate") {
    return (
      <>
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={`${id}-px`} x="0" y="0" width="100%" height="100%">
            <feFlood x="5" y="5" height="2" width="2" />
            <feComposite width="12" height="12" />
            <feTile result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
            <feMorphology operator="dilate" radius="6" />
          </filter>
        </svg>
        <div style={{ position: "absolute", inset: 0, filter: `url(#${id}-px)` }}>
          <Video g={g} frame={whole} />
        </div>
      </>
    );
  }
  if (g.glitch === "rgb") {
    const dx = 6 + 8 * hash(whole);
    const flicker = whole % 2 === 0 ? 1.55 : 0.75;
    return (
      <>
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={`${id}-rgb`} x="-10%" y="0" width="120%" height="100%" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx={dx} dy="0" result="r2" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feOffset in="b" dx={-dx} dy="0" result="b2" />
            <feBlend in="r2" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="b2" mode="screen" />
          </filter>
        </svg>
        <div style={{ position: "absolute", inset: 0, filter: `url(#${id}-rgb) brightness(${flicker})` }}>
          <Video g={g} frame={whole} />
        </div>
      </>
    );
  }
  if (g.glitch === "hue") {
    return (
      <div style={{ position: "absolute", inset: 0, filter: "hue-rotate(150deg) saturate(1.8) contrast(1.12)" }}>
        <Video g={g} frame={whole} />
      </div>
    );
  }
  // stretch: the card itself is too wide and the frame is filled — distorted, not cropped
  return <Video g={g} frame={whole} />;
};

const GlitchCard: React.FC<{ g: GlitchCardDef; idx: number }> = ({ g, idx }) => {
  const f = useCurrentFrame();
  const slow = g.pop < S.loop2;
  const end = g.toss + (slow ? 16 : 12);
  if (f < g.pop || f >= end) return null;

  const { w, h } = cardSize(g);
  const a = anchor(g);
  const at = screenToWorld(g.pop, a.x, a.y); // pinned to the world where it popped
  const pop = springAt(f - g.pop, 300, 13, 0.6);
  const markT = f - g.mark;
  const draw = easeOut(clamp(markT / 4));
  const tossT = Math.max(0, f - g.toss);
  // first loop: shrink away quietly; later: flung out of frame
  const dir = { x: g.corner.includes("r") ? 1 : -1, y: g.corner.startsWith("t") ? -0.5 : 0.5 };
  const fling = slow ? 0 : 30 * tossT + 7 * tossT * tossT;
  const shrink = slow ? lerp(1, 0.25, easeIn(tossT / 16)) : 1 - 0.02 * tossT;
  const fade = 1 - inv(end - (slow ? 8 : 5), end, f);

  return (
    <div
      style={{
        position: "absolute",
        left: at.x,
        top: at.y,
        zIndex: 60,
        transform: `rotate(${-at.r}deg) scale(${1 / at.z}) translate(${dir.x * fling}px, ${dir.y * fling}px) rotate(${dir.x * tossT * (slow ? 0 : 7)}deg) scale(${lerp(0.3, 1, pop) * shrink})`,
        opacity: fade,
      }}
    >
      <div style={{ position: "absolute", left: -w / 2, top: -h / 2 - 34, fontFamily: MONO_STACK, fontWeight: 600, fontSize: 16, letterSpacing: "0.12em", color: "#9a9a9a", whiteSpace: "pre" }}>
        {`RESULT · v${g.version}`}
      </div>
      <div style={{ position: "absolute", left: -w / 2, top: -h / 2, width: w, height: h, overflow: "hidden", borderRadius: 8, background: "#000", boxShadow: "0 0 0 2px rgba(255,255,255,0.45), 0 20px 50px rgba(0,0,0,0.7)" }}>
        <GlitchedFootage g={g} idx={idx} f={f} w={w} h={h} />
        {markT >= 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${0.35 * draw})` }} />}
      </div>
      {markT >= 0 && (
        <>
          <svg width={w} height={h} style={{ position: "absolute", left: -w / 2, top: -h / 2, overflow: "visible" }}>
            {[
              [w * 0.18, h * 0.5 - w * 0.32, w * 0.82, h * 0.5 + w * 0.32],
              [w * 0.82, h * 0.5 - w * 0.32, w * 0.18, h * 0.5 + w * 0.32],
            ].map(([x1, y1, x2, y2], i) => {
              const len = Math.hypot(x2 - x1, y2 - y1);
              const d = easeOut(clamp((markT - i * 2) / 3));
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={RED} strokeWidth={14} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - d)} />;
            })}
          </svg>
          <div
            style={{
              position: "absolute",
              left: -w / 2,
              top: h / 2 + 12,
              transformOrigin: "left top",
              transform: `rotate(-3deg) scale(${lerp(1.6, 1, springAt(markT - 2, 400, 14, 0.5))})`,
              opacity: clamp((markT - 2) / 2),
              background: RED,
              color: "#ffffff",
              fontFamily: ZH,
              fontWeight: 700,
              fontSize: 26,
              padding: "4px 14px",
              borderRadius: 6,
              whiteSpace: "pre",
            }}
          >
            {g.label}
          </div>
        </>
      )}
    </div>
  );
};

export const GlitchCards: React.FC = () => (
  <>
    {GLITCH_CARDS.map((g, i) => (
      <GlitchCard key={g.pop} g={g} idx={i} />
    ))}
  </>
);
