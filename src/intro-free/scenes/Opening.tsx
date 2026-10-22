import { useCurrentFrame } from "remotion";
import { CONTENT } from "../../content";
import { charWidth, clamp, lerp, pop, textWidth, whip } from "../anim.ts";
import { camTransform } from "../camera.ts";
import { MONO } from "../fonts";
import { DotGrid, TypeLine } from "../parts";
import { C } from "../theme.ts";
import { T, TYPE } from "../timeline.ts";

// 0–4 s. Black, a cursor blinking on the beat, and I type who I am.
// The camera rides along with the cursor.
const O = CONTENT.opening;
const NAME_FS = 150;
const JOB_FS = 96;
const NAME_Y = -70;
const JOB_Y = 150;
const BLOCK_W = Math.max(textWidth(O.name, NAME_FS), textWidth(O.job, JOB_FS));
const X0 = -BLOCK_W / 2;

// Where the camera thinks the cursor is: every keystroke pushes it right,
// starting on that keystroke's own grid time (spaces travel with the next key).
const cursorX = (text: string, times: number[], fs: number, s: number, upTo = Infinity) =>
  [...text].reduce((x, ch, i) => (i < upTo ? x + charWidth(ch) * fs * whip(s - times[i], 0, 9) : x), X0);

const bump = (t: number) => (t <= -0.75 ? 0 : clamp((t + 0.75) / 1) * Math.exp(-Math.max(0, t) / 5));

// The typed text at time s, in world coordinates (also used by Daily, which
// starts from this exact picture and whips away from it).
export const OpeningWorld: React.FC<{ s: number }> = ({ s }) => {
  // "JIN" lights up when its last letter lands
  const nameText = O.name;
  const jinFrom = [...nameText.slice(0, nameText.lastIndexOf(" ") + 1)].length;
  const glow = bump(s - T.nameAccent);
  // highlight sweeps behind "AI 视频生成"
  const hiStart = O.job.indexOf(O.jobHighlight);
  const hiX = X0 + textWidth(O.job.slice(0, Math.max(0, hiStart)), JOB_FS);
  const hiW = textWidth(O.jobHighlight, JOB_FS);
  const hi = whip(s - T.jobHighlight, 0);
  const hiOn = s >= T.jobHighlight;

  return (
    <>
        {/* line 1 */}
      <div style={{ position: "absolute", left: X0, top: NAME_Y, transform: "translateY(-50%)" }}>
        <TypeLine
          text={nameText}
          times={TYPE.name}
          s={s}
          style={{ fontSize: NAME_FS, fontWeight: 900, color: C.ink }}
          cursor={{ color: C.llm, from: T.cursor, solidUntil: TYPE.name[TYPE.name.length - 1] + 1, until: T.jobType }}
          charStyle={(i) =>
            i >= jinFrom && glow > 0
              ? { textShadow: `0 0 ${20 + 40 * glow}px rgba(255,214,150,${0.9 * glow})`, transform: `scale(${1 + 0.12 * glow})` }
              : undefined
          }
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: X0 + 6,
          top: NAME_Y + 88,
          fontFamily: MONO,
          fontSize: 30,
          letterSpacing: "0.16em",
          color: C.dim,
          whiteSpace: "pre",
          opacity: pop(s - T.nameAccent),
        }}
      >
        {O.nameEn}
      </div>

      {/* line 2 + selection highlight */}
      <div
        style={{
          position: "absolute",
          left: hiX - 8,
          top: JOB_Y - JOB_FS * 0.58,
          width: hiW + 16,
          height: JOB_FS * 1.16,
          background: C.llm,
          transformOrigin: "0 50%",
          transform: `scaleX(${hi})`,
          borderRadius: 6,
        }}
      />
      <div style={{ position: "absolute", left: X0, top: JOB_Y, transform: "translateY(-50%)" }}>
        <TypeLine
          text={O.job}
          times={TYPE.job}
          s={s}
          style={{ fontSize: JOB_FS, fontWeight: 800, color: C.ink }}
          highlight={hiOn ? { text: O.jobHighlight, color: C.dark } : undefined}
          cursor={{ color: C.llm, from: T.jobType - 0.25, solidUntil: TYPE.job[TYPE.job.length - 1] + 1 }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: X0 + 6,
          top: JOB_Y + 66,
          fontFamily: MONO,
          fontSize: 28,
          letterSpacing: "0.16em",
          color: C.dim,
          whiteSpace: "pre",
          opacity: pop(s - T.jobHighlight),
        }}
      >
        {O.jobEn}
      </div>
    </>
  );
};

// Where the opening camera ends (Daily's first frame continues from here).
export const OPENING_END = { x: 0, y: (NAME_Y + JOB_Y) / 2 + 30, z: 1.14, r: 0 };

export const Opening: React.FC = () => {
  const s = useCurrentFrame();

  // camera: close on the cursor, riding along key by key → when the name is
  // complete it lands on the whole name (the accent) → jumps to line 2 on the
  // downbeat → pulls back to both lines with the highlight
  const nameMid = X0 + textWidth(O.name, NAME_FS) / 2;
  const nameKeys = TYPE.name.length;
  const settle = whip(s - T.nameAccent, 0.5, 10);
  const a = {
    x: lerp(cursorX(O.name, TYPE.name, NAME_FS, s, nameKeys - 1) + 40, nameMid, settle),
    y: NAME_Y + 20 * settle,
    z: lerp(2.0, 1.62, settle),
  };
  const b = { x: cursorX(O.job, TYPE.job, JOB_FS, s) - 90, y: JOB_Y - 10, z: 1.42 };
  const c = OPENING_END;
  const k1 = whip(s - T.jobType, 0);
  const k2 = whip(s - T.jobHighlight, 0, 14);
  const cam = {
    x: lerp(lerp(a.x, b.x, k1), c.x, k2),
    y: lerp(lerp(a.y, b.y, k1), c.y, k2),
    z: Math.exp(lerp(lerp(Math.log(a.z), Math.log(b.z), k1), Math.log(c.z), k2)) * (1 + 0.07 * bump(s - T.nameAccent)),
    r: 0,
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, overflow: "hidden" }}>
      <DotGrid cam={cam} />
      <div style={{ position: "absolute", left: 0, top: 0, transform: camTransform(cam) }}>
        <OpeningWorld s={s} />
      </div>
    </div>
  );
};
