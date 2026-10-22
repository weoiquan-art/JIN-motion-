import { useCurrentFrame } from "remotion";
import { CONTENT } from "../../content";
import { clamp, easeInOut, lerp, pop, textWidth, whip } from "../anim.ts";
import { DURATION } from "../beat.ts";
import { camTransform } from "../camera.ts";
import { ZH } from "../fonts";
import { at, DotGrid, PixelGlyph, TypeLine } from "../parts";
import { WO } from "../pixels.ts";
import { C } from "../theme.ts";
import { T, TYPE } from "../timeline.ts";

// 28–34 s. Quiet again. The cursor types the one line to remember, then the
// thanks. Behind it, a big pixel 「我」 that is only partly there: a few more
// pixels land on each of the last four beats, and it never quite completes.
const E = CONTENT.ending;
const WHO_FS = 120;
const LEARN_FS = 104;
const THANKS_FS = 112;
const CELL = 44;
const hiFrom = [...E.learning.slice(0, Math.max(0, E.learning.indexOf(E.learningHighlight)))].join("");

// The pixel 「我」 renders like an image still loading: a raster from the top.
// Half of it when the card arrives, +28 cells on each fill beat — it stops one
// row short of done.
const CELLS_AT_CARD = 128;
const CELLS_PER_FILL = 28;
const filledAt = (s: number) => {
  if (s < T.thanks - 0.75) return 0;
  const n = CELLS_AT_CARD * pop(s - T.thanks) + T.fill.reduce((a, f) => a + CELLS_PER_FILL * pop(s - f), 0);
  return Math.round(n);
};
// when the cell with raster index i lit up (for its flash)
const litAt = (i: number) => {
  if (i < CELLS_AT_CARD) return T.thanks;
  const k = Math.floor((i - CELLS_AT_CARD) / CELLS_PER_FILL);
  return k < T.fill.length ? T.fill[k] : Infinity;
};

export const Ending: React.FC = () => {
  const s = useCurrentFrame();
  const cam = { x: 0, y: 0, z: lerp(1, 1.035, easeInOut((s - T.land) / (DURATION - T.land))), r: 0 };

  const whoIn = pop(s - T.land);
  const make = whip(s - T.learnType, 0.4, 8); // line 1 steps up as line 2 starts
  const card = whip(s - T.thanks, 0.5, 9); // both lines move up for the end card
  const whoY = lerp(lerp(-40, -95, make), -318, card);
  const learnY = lerp(95, -232, card);
  const small = lerp(1, 0.56, card);

  const underline = whip(s - T.learnHighlight, 0, 7);
  const hiGlow = s >= T.learnHighlight - 0.75 ? Math.exp(-Math.max(0, s - T.learnHighlight) / 7) * clamp((s - T.learnHighlight + 0.75) / 1) : 0;
  const hiStart = [...hiFrom].length;
  const hiEnd = hiStart + [...E.learningHighlight].length;

  const filled = filledAt(s);
  // the whole partial 「我」 breathes on each fill beat
  const pulse = T.fill.reduce((a, f) => a + (s >= f - 0.75 ? clamp((s - f + 0.75) / 1) * Math.exp(-Math.max(0, s - f) / 6) : 0), 0);
  const ghost = (r: number, c: number, on: boolean) => {
    const i = r * 16 + c;
    if (!on || i >= filled) return 0;
    const born = litAt(i);
    const flash = s >= born - 0.75 ? Math.exp(-Math.max(0, s - born) / 6) : 0;
    return 0.17 + 0.6 * flash + 0.22 * pulse;
  };
  // the raster head
  const headRow = Math.min(15, Math.floor(filled / 16));
  const headOn = filled > 0 ? 1 : 0;

  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, overflow: "hidden" }}>
      <DotGrid cam={cam} color="rgba(255,255,255,0.045)" />
      <div style={{ position: "absolute", left: 0, top: 0, transform: camTransform(cam) }}>
        {/* the partial 「我」 */}
        <div style={at(0, -40)}>
          <PixelGlyph bitmap={WO} cell={CELL} gap={4} color={C.video} alpha={ghost} />
          <div
            style={{
              position: "absolute",
              left: -20,
              top: headRow * CELL + CELL / 2 - 2,
              width: 16 * CELL + 40,
              height: 4,
              background: C.video,
              opacity: 0.55 * headOn,
              boxShadow: `0 0 18px ${C.video}`,
            }}
          />
        </div>

        <div style={{ ...at(0, whoY, `scale(${small})`), fontFamily: ZH, fontWeight: 900, fontSize: WHO_FS, lineHeight: 1, color: C.ink, opacity: whoIn }}>
          {E.who}
        </div>
        <div style={{ ...at(0, learnY, `scale(${small})`) }}>
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: textWidth(hiFrom, LEARN_FS) - 4,
                top: LEARN_FS * 1.02,
                width: textWidth(E.learningHighlight, LEARN_FS) + 8,
                height: 14,
                borderRadius: 7,
                background: C.llm,
                transformOrigin: "0 50%",
                transform: `scaleX(${underline})`,
                boxShadow: `0 0 ${24 * hiGlow}px rgba(255,181,71,${hiGlow})`,
              }}
            />
            <TypeLine
              text={E.learning}
              times={TYPE.learning}
              s={s}
              style={{ fontSize: LEARN_FS, fontWeight: 900, color: C.ink }}
              highlight={{ text: E.learningHighlight, color: C.llm }}
              cursor={{ color: C.llm, from: T.learnType - 0.75, solidUntil: TYPE.learning[TYPE.learning.length - 1] + 1 }}
              charStyle={(i) =>
                i >= hiStart && i < hiEnd && hiGlow > 0.01
                  ? { textShadow: `0 0 ${30 * hiGlow}px rgba(255,181,71,${0.9 * hiGlow})`, transform: `scale(${1 + 0.08 * hiGlow})` }
                  : undefined
              }
            />
          </div>
        </div>

        {/* the thanks, and the credit */}
        <div
          style={{
            ...at(0, 18 + (1 - card) * 40),
            fontFamily: ZH,
            fontWeight: 900,
            fontSize: THANKS_FS,
            lineHeight: 1,
            color: C.ink,
            opacity: s >= T.thanks - 0.75 ? pop(s - T.thanks) : 0,
            textShadow: "0 4px 40px rgba(0,0,0,0.6)",
          }}
        >
          {E.thanks}
        </div>
        <div
          style={{
            ...at(0, 168 + (1 - whip(s - T.credit, 0, 8)) * 24),
            fontFamily: ZH,
            fontWeight: 500,
            fontSize: 40,
            letterSpacing: "0.03em",
            color: "#cfcac1",
            opacity: s >= T.credit - 0.75 ? pop(s - T.credit) : 0,
          }}
        >
          {E.credit}
        </div>
      </div>
    </div>
  );
};
