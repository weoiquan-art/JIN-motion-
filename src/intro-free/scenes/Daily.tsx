import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { CONTENT } from "../../content";
import { clamp, lerp, pop, whip } from "../anim.ts";
import { WIDTH } from "../beat.ts";
import { camAt, camTransform, type Move, shakeAt } from "../camera.ts";
import { MONO, ZH } from "../fonts";
import { DotGrid } from "../parts";
import { C } from "../theme.ts";
import { T } from "../timeline.ts";
import { OPENING_END, OpeningWorld } from "./Opening";

// 4–11 s. Three windows side by side — everything I do every day, at once.
// One whip per bar into the next window, one event per beat inside it.
const D = CONTENT.daily;
const WIN_W = 1000;
const WIN_H = 640;
const GAP = 100;
const CX = [-(WIN_W + GAP), 0, WIN_W + GAP];
const Z = 1.35;
const CAM_Y = -50;

// The first frame is the opening's last picture (its text sits up here in this
// world, offset by whole grid cells so the dot grid doesn't jump); the camera
// then whips down into window 1.
const OPENING_AT = { x: -1120, y: -1200 };
const START = { x: OPENING_AT.x + OPENING_END.x, y: OPENING_AT.y + OPENING_END.y, z: OPENING_END.z, r: 0 };
const MOVES: Move[] = [
  { f: T.windows[0], to: { y: CAM_Y, z: Z, r: -1.2 }, bounce: 0.6 },
  { f: T.windows[0] + 8, to: { z: Z * 1.05 }, ease: 54 },
  { f: T.windows[1], to: { x: CX[1], z: Z, r: 1.2 }, bounce: 0.6 },
  { f: T.windows[1] + 8, to: { z: Z * 1.05 }, ease: 54 },
  { f: T.windows[2], to: { x: CX[2], z: Z, r: -1 }, bounce: 0.6 },
  { f: T.windows[2] + 8, to: { z: Z * 1.05 }, ease: 54 },
];
const HITS = [
  ...T.windows.map((f) => ({ f, amp: 0.45 })),
  ...T.windowBeats.flat().map((f) => ({ f, amp: 0.1 })),
];

const label = (extra: CSSProperties = {}): CSSProperties => ({
  fontFamily: MONO,
  fontSize: 20,
  letterSpacing: "0.14em",
  color: C.dim,
  whiteSpace: "pre",
  ...extra,
});

// ------------------------------------------------------------------ window chrome
const Window: React.FC<{ i: number; tab: string; title: string; sub: string; children: React.ReactNode; titleW?: number }> = ({
  i,
  tab,
  title,
  sub,
  children,
  titleW = WIN_W - 100,
}) => (
  <div
    style={{
      position: "absolute",
      left: CX[i] - WIN_W / 2,
      top: -WIN_H / 2,
      width: WIN_W,
      height: WIN_H,
      background: C.panel,
      border: `2px solid ${C.line}`,
      borderRadius: 26,
      boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
      overflow: "hidden",
    }}
  >
    <div style={{ height: 58, borderBottom: "1px solid rgba(255,255,255,0.07)", position: "relative" }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c, k) => (
        <div key={c} style={{ position: "absolute", left: 24 + k * 24, top: 22, width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.85 }} />
      ))}
      <div style={label({ position: "absolute", left: 112, top: 18 })}>{tab}</div>
    </div>
    <div style={{ position: "absolute", left: 50, top: 92, width: titleW, display: "flex", alignItems: "baseline", gap: 20 }}>
      <span style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, color: C.llm }}>{`0${i + 1}`}</span>
      <span style={{ fontFamily: ZH, fontSize: 58, fontWeight: 900, color: C.ink, lineHeight: 1.1, whiteSpace: "pre" }}>{title}</span>
    </div>
    <div style={{ position: "absolute", left: 50, top: 178, width: titleW, fontFamily: ZH, fontSize: 30, fontWeight: 500, color: C.dim, lineHeight: 1.35 }}>
      {sub}
    </div>
    {children}
  </div>
);

// ------------------------------------------------------------------ 01 skill
const SkillWindow: React.FC<{ s: number }> = ({ s }) => {
  const [b1, b2, b3] = T.windowBeats[0];
  const strike = whip(s - b1, 0, 5);
  const add = whip(s - b2, 1.2, 6);
  const score = whip(s - b3, 2, 6);
  const lines = [...D.skill.code, D.skill.removed];
  const row = (n: number): CSSProperties => ({ position: "absolute", left: 0, top: n * 50, height: 50, width: "100%", display: "flex", alignItems: "center" });
  return (
    <Window i={0} tab={D.skill.tab} title={D.skill.title} sub={D.skill.sub}>
      <div style={{ position: "absolute", left: 50, top: 248, width: 900, height: 236, background: "#0e0e11", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ position: "absolute", left: 0, top: 18, width: "100%", height: 200, fontFamily: MONO, fontSize: 27 }}>
          {lines.map((l, n) => {
            const removed = n === lines.length - 1;
            return (
              <div key={n} style={row(n)}>
                {removed ? (
                  <div style={{ position: "absolute", inset: 0, background: C.red, opacity: 0.1 * clamp(strike * 1.4) }} />
                ) : null}
                <span style={{ width: 70, textAlign: "right", color: "#55534f", paddingRight: 14 }}>{12 + n}</span>
                <span style={{ width: 26, color: C.red, opacity: removed ? clamp(strike * 1.4) : 0 }}>-</span>
                <span style={{ position: "relative", color: removed && strike > 0.3 ? "rgba(255,106,85,0.75)" : "rgba(244,241,234,0.85)", whiteSpace: "pre" }}>
                  {l}
                  {removed ? (
                    <span style={{ position: "absolute", left: -4, right: -4, top: "52%", height: 4, background: C.red, transformOrigin: "0 50%", transform: `scaleX(${strike})` }} />
                  ) : null}
                </span>
              </div>
            );
          })}
          {/* the new line slides in under the removed one */}
          <div style={{ ...row(lines.length), opacity: pop(s - b2), transform: `translateX(${(1 - add) * 60}px)` }}>
            <div style={{ position: "absolute", inset: 0, background: C.llm, opacity: 0.12 + 0.2 * Math.exp(-Math.max(0, s - b2) / 6) }} />
            <span style={{ width: 70, textAlign: "right", color: "#55534f", paddingRight: 14 }}>{12 + lines.length}</span>
            <span style={{ width: 26, color: C.llm }}>+</span>
            <span style={{ color: C.ink, whiteSpace: "pre" }}>{D.skill.added}</span>
          </div>
        </div>
      </div>
      {/* test result */}
      <div
        style={{
          position: "absolute",
          left: 50,
          top: 506,
          width: 900,
          height: 90,
          display: "flex",
          alignItems: "center",
          gap: 22,
          opacity: pop(s - b3),
          transform: `scale(${lerp(0.7, 1, score)})`,
          transformOrigin: "10% 50%",
        }}
      >
        <svg width="34" height="34" viewBox="0 0 34 34">
          <path d="M8 4 L30 17 L8 30 Z" fill={C.llm} />
        </svg>
        <span style={{ fontFamily: ZH, fontSize: 36, fontWeight: 700, color: C.ink, whiteSpace: "pre" }}>{D.skill.test}</span>
        <span style={{ fontFamily: MONO, fontSize: 58, fontWeight: 800, color: C.llm, marginLeft: "auto" }}>{D.skill.score}</span>
      </div>
    </Window>
  );
};

// ------------------------------------------------------------------ 02 breakdown
// A code-drawn "someone else's shot": dusk sky, sun, two ridges, a figure.
const Sky: React.FC = () => (
  <>
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1d2350" />
        <stop offset="0.55" stopColor="#c0507a" />
        <stop offset="1" stopColor="#ffb36b" />
      </linearGradient>
      <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fff4d6" />
        <stop offset="0.45" stopColor="#ffd28a" />
        <stop offset="1" stopColor="#ffd28a" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="320" height="180" fill="url(#sky)" />
    <circle cx="214" cy="118" r="44" fill="url(#sun)" />
  </>
);
const Ridges: React.FC = () => (
  <>
    <path d="M0 132 L52 104 L96 122 L150 92 L206 124 L262 100 L320 120 L320 180 L0 180 Z" fill="#4a2350" />
    <path d="M0 152 L70 128 L128 146 L190 132 L248 150 L320 138 L320 180 L0 180 Z" fill="#1b1026" />
    <path d="M118 124 l4 -14 l4 14 z M120 106 a3 3 0 1 0 0.1 0" fill="#1b1026" />
  </>
);

const LAYER_W = 300;
const LAYER_H = 169;
const iso = "scaleY(0.56) rotate(-36deg)";

const Layer: React.FC<{ y: number; children: React.ReactNode; glow?: number; frame?: boolean; opacity?: number }> = ({
  y,
  children,
  glow = 0,
  frame,
  opacity = 1,
}) => (
  <div style={{ position: "absolute", left: 0, top: y, width: LAYER_W, height: LAYER_H, opacity, transform: `translate(-50%, -50%) ${iso}` }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 8,
        overflow: "hidden",
        border: `2px solid rgba(255,255,255,${frame ? 0.35 : 0.5})`,
        boxShadow: glow ? `0 0 ${40 * glow}px rgba(255,181,71,${0.6 * glow})` : undefined,
        background: frame ? undefined : "rgba(20,20,24,0.55)",
      }}
    >
      {children}
    </div>
  </div>
);

const BreakdownWindow: React.FC<{ s: number }> = ({ s }) => {
  const beats = T.windowBeats[1];
  const lift = beats.map((b) => whip(s - b, 1.3, 6));
  const STACK_X = 690;
  const BASE_Y = 540;
  const STEP = 108;
  const tag = (k: number): CSSProperties => ({
    position: "absolute",
    left: STACK_X + 158,
    top: BASE_Y - (k + 1) * STEP * lift[k] - 26,
    opacity: pop(s - beats[k]),
    transform: `translateX(${(1 - lift[k]) * 30}px)`,
    whiteSpace: "pre",
  });
  return (
    <Window i={1} tab={D.breakdown.tab} title={D.breakdown.title} sub={D.breakdown.sub} titleW={540}>
      <div style={{ position: "absolute", left: STACK_X, top: 0 }}>
        {/* the reference shot, then the layers pulled out of it, one per beat */}
        <Layer y={BASE_Y} frame>
          <svg width={LAYER_W} height={LAYER_H} viewBox="0 0 320 180" preserveAspectRatio="none">
            <Sky />
            <Ridges />
          </svg>
        </Layer>
        <Layer y={BASE_Y - STEP * lift[0]} opacity={pop(s - beats[0])} glow={Math.exp(-Math.max(0, s - beats[0]) / 8) * (s >= beats[0] - 0.75 ? 1 : 0)}>
          <svg width={LAYER_W} height={LAYER_H} viewBox="0 0 320 180" preserveAspectRatio="none" style={{ opacity: 0.95 }}>
            <Sky />
          </svg>
        </Layer>
        <Layer y={BASE_Y - 2 * STEP * lift[1]} opacity={pop(s - beats[1])}>
          <svg width={LAYER_W} height={LAYER_H} viewBox="0 0 320 180" preserveAspectRatio="none">
            <path d="M40 140 C 110 40, 200 40, 280 90" stroke={C.video} strokeWidth="6" fill="none" strokeDasharray="14 10" />
            <path d="M268 74 L292 92 L264 104 Z" fill={C.video} />
            <rect x="22" y="128" width="34" height="24" rx="4" fill={C.video} />
            <path d="M56 134 L68 128 L68 152 L56 146 Z" fill={C.video} />
          </svg>
        </Layer>
        <Layer y={BASE_Y - 3 * STEP * lift[2]} opacity={pop(s - beats[2])}>
          <div style={{ padding: "22px 26px", fontFamily: MONO, fontSize: 25, lineHeight: 1.55, color: C.llm, whiteSpace: "pre" }}>
            {D.breakdown.prompt.join("\n")}
          </div>
        </Layer>
      </div>
      {D.breakdown.layers.map((l, k) => (
        <div key={l} style={tag(k)}>
          <div style={{ fontFamily: ZH, fontSize: 30, fontWeight: 800, color: C.ink }}>{l}</div>
          <div style={label({ fontSize: 16 })}>{D.breakdown.layersEn[k]}</div>
        </div>
      ))}
    </Window>
  );
};

// ------------------------------------------------------------------ 03 app
const AppWindow: React.FC<{ s: number }> = ({ s }) => {
  const [b1, b2, b3] = T.windowBeats[2];
  const h = whip(s - b1, 1.5, 6);
  const cards = whip(s - b2, 1.5, 6);
  const press = s >= b3 - 0.75 ? 1 - 0.12 * Math.exp(-Math.max(0, s - b3) / 3) * clamp((s - b3 + 0.75) / 1) : 1;
  const ripple = clamp((s - b3) / 14);
  const PX = 650;
  const PY = 96;
  const PW = 250;
  const PH = 500;
  return (
    <Window i={2} tab={D.app.tab} title={D.app.title} sub={D.app.sub} titleW={560}>
      <div style={{ position: "absolute", left: PX, top: PY, width: PW, height: PH, borderRadius: 38, border: "4px solid rgba(255,255,255,0.55)", background: "#0d0d10", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: PW / 2 - 40, top: 12, width: 80, height: 18, borderRadius: 9, background: "#222" }} />
        {/* header bar */}
        <div
          style={{
            position: "absolute",
            left: 18,
            top: 48,
            width: PW - 36,
            height: 64,
            borderRadius: 14,
            background: "rgba(255,181,71,0.16)",
            border: `2px solid ${C.llm}`,
            display: "flex",
            alignItems: "center",
            paddingLeft: 18,
            fontFamily: ZH,
            fontSize: 26,
            fontWeight: 800,
            color: C.ink,
            opacity: pop(s - b1),
            transform: `translateY(${(1 - h) * -50}px)`,
          }}
        >
          {D.app.header}
        </div>
        {/* two cards */}
        {D.app.cards.map((c, k) => (
          <div
            key={c}
            style={{
              position: "absolute",
              left: 18,
              top: 132 + k * 112,
              width: PW - 36,
              height: 96,
              borderRadius: 14,
              background: "#1b1b20",
              border: "1px solid rgba(255,255,255,0.12)",
              opacity: pop(s - b2),
              transform: `translateX(${(1 - cards) * (k ? 1 : -1) * 120}px)`,
              padding: "14px 18px",
            }}
          >
            <div style={{ fontFamily: ZH, fontSize: 24, fontWeight: 700, color: C.ink }}>{c}</div>
            <div style={{ marginTop: 12, height: 8, width: "80%", borderRadius: 4, background: "rgba(255,255,255,0.14)" }} />
            <div style={{ marginTop: 8, height: 8, width: "55%", borderRadius: 4, background: "rgba(255,255,255,0.1)" }} />
          </div>
        ))}
        {/* the button */}
        <div
          style={{
            position: "absolute",
            left: 18,
            top: PH - 120,
            width: PW - 36,
            height: 76,
            borderRadius: 38,
            background: C.llm,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: ZH,
            fontSize: 30,
            fontWeight: 900,
            color: C.dark,
            opacity: s >= b2 - 0.25 ? pop(s - b2) : 0,
            transform: `scale(${press})`,
          }}
        >
          {D.app.button}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 40,
              height: 40,
              marginLeft: -20,
              marginTop: -20,
              borderRadius: 20,
              border: `4px solid ${C.llm}`,
              opacity: s >= b3 ? 1 - ripple : 0,
              transform: `scale(${1 + ripple * 7})`,
            }}
          />
        </div>
      </div>
    </Window>
  );
};

// ------------------------------------------------------------------ scene
export const Daily: React.FC = () => {
  const s = useCurrentFrame();
  const cam = camAt(s, START, MOVES);
  const sh = shakeAt(s, HITS);
  const idx = s < T.windows[1] - 0.25 ? 0 : s < T.windows[2] - 0.25 ? 1 : 2;
  const flip = whip(s - T.windows[idx], 0);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, overflow: "hidden" }}>
      <DotGrid cam={cam} sh={sh} />
      <div style={{ position: "absolute", left: 0, top: 0, transform: camTransform(cam, sh) }}>
        <div style={{ position: "absolute", left: OPENING_AT.x, top: OPENING_AT.y }}>
          <OpeningWorld s={T.windows[0] - 1} />
        </div>
        <SkillWindow s={s} />
        <BreakdownWindow s={s} />
        <AppWindow s={s} />
      </div>
      {/* screen-space header: what this is, and which of the three */}
      <div style={{ position: "absolute", left: 84, top: 54, opacity: pop(s - T.windows[0]) }}>
        <div style={{ fontFamily: ZH, fontSize: 46, fontWeight: 800, color: C.ink, whiteSpace: "pre" }}>{D.header}</div>
        <div style={label({ fontSize: 18, marginTop: 10, letterSpacing: "0.22em" })}>{D.headerEn}</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: WIDTH - 84 - 200,
          width: 200,
          top: 52,
          textAlign: "right",
          fontFamily: MONO,
          fontSize: 54,
          fontWeight: 800,
          color: C.llm,
          opacity: pop(s - T.windows[0]),
          transform: `translateY(${(1 - flip) * -24}px)`,
        }}
      >
        {`0${idx + 1}`}
        <span style={{ color: C.dim, fontSize: 30 }}>{" / 03"}</span>
      </div>
    </div>
  );
};
