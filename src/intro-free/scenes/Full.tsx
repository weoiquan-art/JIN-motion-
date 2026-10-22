import { useCurrentFrame } from "remotion";
import { CONTENT } from "../../content";
import { clamp, easeOut, lerp, whip } from "../anim.ts";
import { FRAMES_PER_STEP, S } from "../beat.ts";
import { shakeAt } from "../camera.ts";
import { MONO, ZH } from "../fonts";
import { at, PixelGlyph } from "../parts";
import { WO } from "../pixels.ts";
import { C } from "../theme.ts";
import { T } from "../timeline.ts";

// 23–28 s. The one full moment: every beat slams a piece of the question, the
// frame floods with colour, and a wall of "what AI might read in 我" marches
// across behind it on every 8th note.
const F = CONTENT.full;
const WALL_ROWS = 13;
const WALL_TEXT = new Array(6).fill(F.wall.join("  ·  ")).join("  ·  ");
const EIGHTH = FRAMES_PER_STEP * 2;
const SLAMS = [T.drop, T.q1b, ...T.q2, T.q2Last];
const PUNCHES = [...SLAMS, ...T.accents];
// last 16th: the music drops out, the picture holds
const FREEZE = T.land - S(1);

const pixelMe = F.q2Last.startsWith("我");
const lastRest = [...F.q2Last].slice(1).join("");

const bump = (t: number) => (t <= -0.75 ? 0 : clamp((t + 0.75) / 1) * Math.exp(-Math.max(0, t) / 4));

export const Full: React.FC = () => {
  const real = useCurrentFrame();
  const s = Math.min(real, FREEZE);
  const inverted = s >= T.accents[1] - 0.25 && s < T.q2[0] - 0.25;
  const cyan = s >= T.q2[0] - 0.25;
  const bg = inverted ? C.bg : cyan ? C.video : C.llm;
  const ink = inverted ? C.llm : C.dark;
  const wallInk = inverted ? "rgba(255,181,71,0.16)" : "rgba(0,0,0,0.13)";

  const punch = PUNCHES.reduce((p, f) => p + 0.07 * bump(s - f), 0);
  const sh = shakeAt(s, PUNCHES.map((f, i) => ({ f, amp: i < SLAMS.length ? 0.5 : 0.35 })));
  const rot = T.accents.reduce((r, f, i) => r + (i ? -1 : 1) * 2.2 * bump(s - f), 0);

  // wall rows step on every 8th note (moving in the first 2 frames of each)
  const k = Math.max(0, s - T.drop);
  const steps = Math.floor(k / EIGHTH) + easeOut(clamp((k % EIGHTH) / 2));

  const slam = (f: number, bounce = 1.3) => {
    const w = whip(s - f, bounce, 7);
    return { on: s >= f - 0.75, scale: lerp(1.9, 1, w), w };
  };
  const q1a = slam(T.drop);
  const q1b = slam(T.q1b);
  const q2 = T.q2.map((f) => slam(f, 1.1));
  const last = slam(T.q2Last, 1.6);

  return (
    <div style={{ position: "absolute", inset: 0, background: bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 960 + sh.sx, top: 540 + sh.sy, transform: `rotate(${rot + sh.sr}deg) scale(${1 + punch})` }}>
        {/* the wall */}
        {new Array(WALL_ROWS).fill(0).map((_, r) => {
          const dir = r % 2 ? 1 : -1;
          const x = -1400 + dir * steps * 70 - (r * 233) % 600;
          return (
            <div
              key={r}
              style={{
                position: "absolute",
                left: x,
                top: -560 + r * 88,
                fontFamily: MONO,
                fontSize: 46,
                fontWeight: 700,
                color: wallInk,
                whiteSpace: "pre",
                transform: "translateY(-50%)",
              }}
            >
              {WALL_TEXT}
            </div>
          );
        })}

        {/* Q1 — amber */}
        {!cyan ? (
          <>
            {[q1a, q1b].map((q, i) =>
              q.on ? (
                <div
                  key={i}
                  style={{
                    ...at(0, i ? 135 : -125, `scale(${q.scale}) rotate(${lerp(i ? 5 : -5, 0, q.w)}deg)`),
                    fontFamily: ZH,
                    fontWeight: 900,
                    fontSize: 230,
                    lineHeight: 1,
                    color: ink,
                  }}
                >
                  {F.q1[i]}
                </div>
              ) : null,
            )}
            <div style={{ ...at(0, 410), fontFamily: MONO, fontSize: 30, fontWeight: 700, letterSpacing: "0.2em", color: ink, opacity: 0.75 }}>{F.q1En}</div>
          </>
        ) : (
          <>
            {/* Q2 — cyan */}
            {q2.map((q, i) =>
              q.on ? (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: -880 + (1 - q.w) * 160,
                    top: -265 + i * 205,
                    transform: `translateY(-50%) scale(${lerp(1.35, 1, q.w)})`,
                    transformOrigin: "0 50%",
                    fontFamily: ZH,
                    fontWeight: 900,
                    fontSize: 170,
                    lineHeight: 1,
                    color: ink,
                    whiteSpace: "pre",
                  }}
                >
                  {F.q2[i]}
                </div>
              ) : null,
            )}
            {last.on ? (
              <div style={{ ...at(560, -40, `scale(${last.scale}) rotate(${lerp(-8, 0, last.w)}deg)`), display: "flex", alignItems: "center", gap: 10 }}>
                {/* a leading 「我」 is drawn as the pixel 我 the video model would return */}
                {pixelMe ? <PixelGlyph bitmap={WO} cell={26} gap={3} color={C.dark} /> : null}
                <div style={{ fontFamily: ZH, fontWeight: 900, fontSize: 300, lineHeight: 1, color: ink, whiteSpace: "pre" }}>{pixelMe ? lastRest : F.q2Last}</div>
              </div>
            ) : null}
            <div style={{ ...at(0, 430), fontFamily: MONO, fontSize: 26, fontWeight: 700, letterSpacing: "0.16em", color: ink, opacity: 0.75 }}>{F.q2En}</div>
          </>
        )}
      </div>
    </div>
  );
};
