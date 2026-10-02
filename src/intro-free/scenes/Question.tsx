import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { CONTENT } from "../../content";
import { clamp, easeIn, hash, lerp, noise1, pop, textWidth, whip } from "../anim.ts";
import { camAt, camTransform, type Move, shakeAt } from "../camera.ts";
import { MONO, ZH } from "../fonts";
import { at, DotGrid, PixelGlyph } from "../parts";
import { PERSON } from "../pixels.ts";
import { C } from "../theme.ts";
import { T, tokenTimes } from "../timeline.ts";

// 15–23 s, one continuous world:
//  silence → "running dry" → "what I really want to understand is:" →
//  the 「我」 of that sentence travels through a language model (rewritten into
//  English tokens) and a video model (noise → a generic person) → pull back, "?".
const Q = CONTENT.quiet;
const CH = CONTENT.chain;

const WANT_FS = 110;
const WANT_X = -textWidth(Q.want, WANT_FS) / 2;
const ME = { x: WANT_X + WANT_FS / 2, y: 0 }; // the first character of the sentence
const LLM = { x: ME.x + 760, y: 0 };
const BOX = 340;
const TOK_FS = 40;
const TOK_GAP = 14;
// JetBrains Mono advances 0.6 em per character
const chipW = (t: string) => [...t].length * TOK_FS * 0.6 + 36;
const TOK_X0 = LLM.x + BOX / 2 + 150;
const tokX = CH.tokens.map((_, i) => TOK_X0 + CH.tokens.slice(0, i).reduce((w, t) => w + chipW(t) + TOK_GAP, 0) + chipW(CH.tokens[i]) / 2);
const TOK_END = tokX[tokX.length - 1] + chipW(CH.tokens[CH.tokens.length - 1]) / 2;
const VID = { x: TOK_END + 330, y: 0 };
const CELL = 22;
const OUT = { x: VID.x + BOX / 2 + 160 + (16 * CELL) / 2, y: 0 };
const MARK = { x: OUT.x + (16 * CELL) / 2 + 150, y: -10 };
const MID = (ME.x - 120 + MARK.x + 170) / 2;

const MOVES: Move[] = [
  { f: T.dry, to: { z: 1.05 }, ease: 64 },
  { f: T.want, to: { y: -10, z: 1.0 }, ease: 16 },
  { f: T.unclear + 12, to: { x: ME.x + 240, z: 1.12 }, ease: 20 },
  { f: T.chainIn, to: { x: ME.x + 40, y: -40, z: 1.75 }, bounce: 0.6 },
  { f: T.toLlm, to: { x: LLM.x, y: -30, z: 1.3 }, bounce: 0.5 },
  { f: T.tokens, to: { x: (TOK_X0 + TOK_END) / 2, y: -50, z: 0.98 }, bounce: 0.2, dur: 14 },
  { f: T.toVideo, to: { x: VID.x + 40, y: -30, z: 1.3 }, bounce: 0.5 },
  { f: T.noise, to: { x: OUT.x + 50, y: -40, z: 1.5 }, bounce: 0.5 },
  { f: T.denoise, to: { z: 1.6 }, bounce: 1 },
  { f: T.reveal, to: { x: MID, y: 0, z: 0.5 }, bounce: 0.4 },
];
const HITS = [
  { f: T.chainIn, amp: 0.2 },
  { f: T.toLlm, amp: 0.25 },
  { f: T.tokens, amp: 0.15 },
  { f: T.rewrite, amp: 0.15 },
  { f: T.toVideo, amp: 0.25 },
  { f: T.noise, amp: 0.3 },
  { f: T.denoise, amp: 0.2 },
  { f: T.reveal, amp: 0.3 },
];

const tag = (zh: string, en: string, color: string, x: number, y: number, o: number, scale = 1) => (
  <div style={{ ...at(x, y, `scale(${scale})`), textAlign: "center", opacity: o }}>
    <div style={{ fontFamily: ZH, fontSize: 40, fontWeight: 800, color }}>{zh}</div>
    <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.2em", color: C.dim, marginTop: 6 }}>{en}</div>
  </div>
);

const Arrow: React.FC<{ x1: number; x2: number; y: number; color: string; o: number }> = ({ x1, x2, y, color, o }) => (
  <svg style={{ position: "absolute", left: x1, top: y - 20, overflow: "visible", opacity: o }} width={x2 - x1} height={40}>
    <line x1={0} y1={20} x2={x2 - x1 - 22} y2={20} stroke={color} strokeWidth={6} strokeDasharray="18 12" />
    <path d={`M${x2 - x1 - 26} 6 L${x2 - x1} 20 L${x2 - x1 - 26} 34 Z`} fill={color} />
  </svg>
);

export const Question: React.FC = () => {
  const s = useCurrentFrame();
  // the picture holds its breath with the music before the drop
  const sv = Math.min(s, T.breath);
  const cam = camAt(sv, { x: 0, y: 0, z: 1, r: 0 }, MOVES);
  const sh = shakeAt(sv, HITS);
  const hold = s >= T.breath ? 0.8 : 1;

  // --- the quiet lines
  const dryIn = s >= T.dry - 0.75 ? pop(s - T.dry) : 0;
  const dryUp = whip(sv - T.want, 0.3, 14);
  const gone = whip(sv - T.chainIn, 0, 10); // everything but 「我」 falls away
  const wantIn = pop(sv - T.want);
  const unclearIn = pop(sv - T.unclear);
  const wantChars = [...Q.want];

  // --- 「我」: chip at the start, then flies into the language model
  const chip = pop(sv - T.chainIn);
  const fly = whip(sv - T.toLlm, 0.3, 8);
  const meX = lerp(ME.x, LLM.x, fly);
  const meScale = lerp(1, 0.35, easeIn(fly));
  const meAlpha = 1 - clamp((fly - 0.75) / 0.25);
  const absorb = sv >= T.toLlm ? Math.exp(-Math.max(0, sv - T.toLlm - 4) / 10) * clamp((sv - T.toLlm) / 4) : 0;
  const revealed = pop(sv - T.reveal);
  const chainOn = sv >= T.chainIn - 0.75;

  // --- tokens out of the language model, then into the video model
  const intoVid = (i: number) => whip(sv - T.toVideo - i, 0, 7);
  const rewrite = pop(sv - T.rewrite);
  const flash = sv >= T.rewrite ? Math.exp(-Math.max(0, sv - T.rewrite) / 5) : 0;
  const vidPulse = sv >= T.toVideo ? Math.exp(-Math.max(0, sv - T.toVideo - 6) / 10) * clamp((sv - T.toVideo) / 6) : 0;

  // --- noise → a generic person
  const noiseIn = pop(sv - T.noise);
  const resolve = whip(sv - T.denoise, 0, 10);
  // noise flickers continuously (no steps between the beats)
  const cellAlpha = (r: number, c: number, on: boolean) => {
    const n = 0.5 + 0.5 * noise1(sv * 0.45 + hash(r * 16 + c) * 40, r * 16 + c);
    const target = on ? 1 : 0;
    return noiseIn * lerp(0.15 + 0.85 * n * n, target, resolve);
  };
  const resolveFlash = sv >= T.denoise ? Math.exp(-Math.max(0, sv - T.denoise) / 4) : 0;

  const boxStyle = (x: number, color: string, glow: number): CSSProperties => ({
    ...at(x, 0),
    width: BOX,
    height: BOX,
    borderRadius: 44,
    border: `5px solid ${color}`,
    background: `rgba(${color === C.llm ? "255,181,71" : "61,217,255"},${0.07 + 0.2 * glow})`,
    boxShadow: `0 0 ${30 + 90 * glow}px rgba(${color === C.llm ? "255,181,71" : "61,217,255"},${0.25 + 0.5 * glow})`,
  });

  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, overflow: "hidden", filter: hold < 1 ? `brightness(${hold})` : undefined }}>
      {s >= T.dry - 0.75 ? <DotGrid cam={cam} sh={sh} color="rgba(255,255,255,0.05)" /> : null}
      <div style={{ position: "absolute", left: 0, top: 0, transform: camTransform(cam, sh) }}>
        {/* running dry */}
        <div
          style={{
            ...at(0, lerp(0, -230, dryUp) + 300 * easeIn(gone)),
            fontFamily: ZH,
            fontWeight: 500,
            fontSize: 64,
            color: C.ink,
            opacity: dryIn * lerp(0.92, 0.38, dryUp) * (1 - gone),
          }}
        >
          {Q.dry}
        </div>
        <div style={{ ...at(0, 74), fontFamily: MONO, fontSize: 24, letterSpacing: "0.14em", color: C.dim, opacity: dryIn * (1 - dryUp) }}>{Q.dryEn}</div>

        {/* the sentence; its first character stays behind as 「我」 */}
        <div style={{ position: "absolute", left: WANT_X, top: 0, transform: "translateY(-50%)", display: "flex", fontFamily: ZH, fontWeight: 900, fontSize: WANT_FS, lineHeight: 1, color: C.ink, whiteSpace: "pre" }}>
          {wantChars.map((ch, i) => {
            if (i === 0) return <span key={i} style={{ display: "inline-block", width: WANT_FS }} />;
            const g = clamp(gone * 1.2 - i * 0.03);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: wantIn * (1 - g),
                  transform: `translateY(${(1 - wantIn) * 30 + 420 * g * g}px) rotate(${(hash(i) - 0.3) * 40 * g}deg)`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <div style={{ ...at(0, 132 + 300 * easeIn(gone) + (1 - unclearIn) * 24), fontFamily: ZH, fontWeight: 600, fontSize: 52, color: "#bdb8b0", opacity: unclearIn * (1 - gone) }}>{Q.unclear}</div>

        {/* node 0: my words */}
        <div style={{ ...at(ME.x, 0), width: 200, height: 200, borderRadius: 30, border: `4px ${s >= T.toLlm ? "dashed" : "solid"} rgba(244,241,234,${0.9 * chip * (s >= T.toLlm ? 0.5 + 0.5 * revealed : 1)})`, transform: `translate(-50%, -50%) scale(${lerp(0.7, 1, whip(sv - T.chainIn, 1.2))})` }} />
        {tag(CH.meLabel, CH.meLabelEn, C.ink, ME.x, -190, chip)}
        {s >= T.toLlm ? (
          <div style={{ ...at(ME.x, 0), fontFamily: ZH, fontWeight: 900, fontSize: WANT_FS, lineHeight: 1, color: C.ink, opacity: 0.35 * revealed }}>{CH.me}</div>
        ) : null}
        <div style={{ ...at(meX, 0, `scale(${meScale})`), fontFamily: ZH, fontWeight: 900, fontSize: WANT_FS, lineHeight: 1, color: C.ink, opacity: wantIn * meAlpha }}>
          {CH.me}
        </div>

        {chainOn ? (
          <>
        {/* language model */}
        <div style={boxStyle(LLM.x, C.llm, absorb)}>
          {new Array(36).fill(0).map((_, k) => {
            const r = Math.floor(k / 6);
            const c = k % 6;
            const lit = sv >= T.toLlm ? clamp(Math.sin(sv * 0.9 + r * 1.3 + c * 0.7) * 0.5 + 0.5) * absorb + 0.15 : 0.15;
            return <div key={k} style={{ position: "absolute", left: 45 + c * 46, top: 45 + r * 46, width: 18, height: 18, borderRadius: 9, background: C.llm, opacity: lit }} />;
          })}
        </div>
        {tag(CH.llm, CH.llmEn, C.llm, LLM.x, -250, 1)}

        {/* tokens */}
        {CH.tokens.map((t, i) => {
          const out = whip(sv - tokenTimes[i], 1.2, 8);
          const into = intoVid(i);
          const x = lerp(lerp(LLM.x + BOX / 2, tokX[i], out), VID.x, into);
          const y = lerp(lerp(0, 0, out), 0, into) + Math.sin(i * 2.1) * 10 * (1 - into);
          const hot = i < 2 ? flash : 0;
          return (
            <div
              key={i}
              style={{
                ...at(x, y, `scale(${lerp(0.4, 1, out) * lerp(1, 0.3, into) * (1 + 0.12 * hot)})`),
                fontFamily: MONO,
                fontSize: TOK_FS,
                fontWeight: 700,
                color: hot > 0.1 ? C.dark : C.llm,
                padding: "10px 18px",
                borderRadius: 12,
                border: `2px solid ${C.llm}`,
                background: `rgba(255,181,71,${0.12 + 0.88 * hot})`,
                opacity: (sv >= tokenTimes[i] - 0.75 ? pop(sv - tokenTimes[i]) : 0) * (1 - clamp((into - 0.7) / 0.3)),
              }}
            >
              {t}
            </div>
          );
        })}
        {/* "我 → a person": what the filter did */}
        <div style={{ ...at(tokX[0] + 120, -150, `scale(${lerp(0.8, 1, whip(sv - T.rewrite, 1.4))})`), textAlign: "center", opacity: rewrite * (1 - clamp(whip(sv - T.toVideo, 0) * 1.5)) + revealed * 0.9 }}>
          <div style={{ fontFamily: ZH, fontSize: 34, fontWeight: 800, color: C.llm }}>{CH.rewriteLabel}</div>
          <div style={{ fontFamily: MONO, fontSize: 48, fontWeight: 700, color: C.ink, marginTop: 6 }}>{CH.rewrite}</div>
        </div>

        {/* video model */}
        <div style={boxStyle(VID.x, C.video, vidPulse)}>
          {new Array(49).fill(0).map((_, k) => {
            const r = Math.floor(k / 7);
            const c = k % 7;
            const n = 0.5 + 0.5 * noise1(sv * 0.35 + k * 7.3, k + 300);
            return <div key={k} style={{ position: "absolute", left: 40 + c * 38, top: 40 + r * 38, width: 30, height: 30, borderRadius: 4, background: C.video, opacity: 0.08 + 0.5 * n * (0.3 + vidPulse) }} />;
          })}
        </div>
        {tag(CH.video, CH.videoEn, C.video, VID.x, -250, 1)}
          </>
        ) : null}

        {/* output: noise → person */}
        <div style={{ ...at(OUT.x, OUT.y), opacity: noiseIn, filter: resolveFlash > 0.02 ? `brightness(${1 + 1.2 * resolveFlash})` : undefined }}>
          <PixelGlyph bitmap={PERSON} cell={CELL} gap={2} color={C.video} alpha={cellAlpha} />
        </div>
        <div style={{ ...at(OUT.x, -250), fontFamily: MONO, fontSize: 28, letterSpacing: "0.12em", color: C.video, opacity: noiseIn }}>
          {sv >= T.denoise ? CH.doneStep : CH.noiseStep}
        </div>

        {/* the whole chain, and the question mark */}
        <Arrow x1={ME.x + 130} x2={LLM.x - BOX / 2 - 30} y={0} color={C.ink} o={revealed * 0.8} />
        <Arrow x1={LLM.x + BOX / 2 + 30} x2={TOK_X0 - 20} y={0} color={C.llm} o={revealed * 0.8} />
        <Arrow x1={TOK_END + 20} x2={VID.x - BOX / 2 - 30} y={0} color={C.llm} o={revealed * 0.8} />
        <Arrow x1={VID.x + BOX / 2 + 30} x2={OUT.x - (16 * CELL) / 2 - 30} y={0} color={C.video} o={revealed * 0.8} />
        {s >= T.reveal - 0.75 ? (
          <>
            {CH.tokens.map((t, i) => (
              <div key={i} style={{ ...at(tokX[i], 0), fontFamily: MONO, fontSize: TOK_FS, fontWeight: 700, color: C.llm, padding: "10px 18px", borderRadius: 12, border: `2px solid ${C.llm}`, background: "rgba(255,181,71,0.12)", opacity: revealed * 0.85 }}>
                {t}
              </div>
            ))}
          </>
        ) : null}
        <div style={{ ...at(MARK.x, MARK.y, `scale(${lerp(2.2, 1, whip(sv - T.reveal, 1.6))})`), fontFamily: ZH, fontWeight: 900, fontSize: 420, lineHeight: 1, color: C.ink, opacity: revealed }}>?</div>
      </div>
    </div>
  );
};
