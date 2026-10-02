import { useCurrentFrame } from "remotion";
import { clamp, easeOut, inv, lerp, springAt } from "../../intro/math";
import { screenToWorld } from "../camera";
import { MONO_STACK, ZH } from "../fonts";
import { END, END_POS, INTRO_A, INTRO_B, LOOK_Z, S, SLAM_LIFE, SLAMS, TURN_A, TURN_B } from "../timeline.ts";

type Line = { zh: string; en: string; y: number; fs: number; in: number };

// A Chinese line with its small mono English annotation underneath.
const Pair: React.FC<{ line: Line; f: number; dim: number; enSize: number }> = ({ line, f, dim, enSize }) => {
  const a = easeOut(inv(line.in, line.in + 18, f));
  const b = easeOut(inv(line.in + 9, line.in + 25, f));
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: line.y,
          transform: `translate(-50%, -50%) translateY(${lerp(22, 0, a)}px)`,
          fontFamily: ZH,
          fontWeight: 900,
          fontSize: line.fs,
          lineHeight: 1,
          color: "#f5f5f5",
          whiteSpace: "pre",
          opacity: a * dim,
        }}
      >
        {line.zh}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: line.y + line.fs * 0.82,
          transform: `translate(-50%, -50%) translateY(${lerp(14, 0, b)}px)`,
          fontFamily: MONO_STACK,
          fontWeight: 500,
          fontSize: enSize,
          letterSpacing: "0.18em",
          color: "#8c8c8c",
          whiteSpace: "pre",
          opacity: b * dim,
        }}
      >
        {line.en}
      </div>
    </>
  );
};

export const OpeningTexts: React.FC = () => {
  const f = useCurrentFrame();
  if (f > 205) return null;
  // the polite version steps back when the confession starts
  const introDim = lerp(1, 0.28, easeOut(inv(S.turn, S.turn + 20, f))) * (1 - inv(185, 200, f));
  const turnDim = 1 - inv(186, 202, f);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, zIndex: 20 }}>
      <Pair line={INTRO_A} f={f} dim={introDim} enSize={30} />
      <Pair line={INTRO_B} f={f} dim={introDim} enSize={24} />
      <Pair line={TURN_A} f={f} dim={turnDim} enSize={26} />
      <Pair line={TURN_B} f={f} dim={turnDim} enSize={26} />
    </div>
  );
};

// 改。/ 再改。/ 再抽。 slammed at the screen centre during the peak.
export const Slams: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, top: 0, zIndex: 70 }}>
      {SLAMS.map((s, i) => {
        const t = f - s.f;
        if (t < 0 || t >= SLAM_LIFE) return null;
        const w = screenToWorld(s.f, 960, 520);
        const hit = springAt(t, 420, 16, 0.6);
        const out = inv(SLAM_LIFE - 6, SLAM_LIFE, t);
        return (
          <div
            key={s.zh}
            style={{
              position: "absolute",
              left: w.x,
              top: w.y,
              transform: `translate(-50%, -50%) rotate(${-w.r + (i % 2 ? 3 : -3)}deg) scale(${(1 / w.z) * lerp(2.6, 1, hit) * (1 + 0.12 * out)})`,
              opacity: clamp(t / 2) * (1 - out),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              whiteSpace: "pre",
              textShadow: "0 0 60px rgba(0,0,0,0.85), 0 0 20px rgba(0,0,0,0.9)",
            }}
          >
            <div style={{ fontFamily: ZH, fontWeight: 900, fontSize: 380, lineHeight: 1, color: "#ffffff" }}>{s.zh}</div>
            <div style={{ fontFamily: MONO_STACK, fontWeight: 800, fontSize: 64, letterSpacing: "0.22em", color: "#ffffff", marginTop: 10 }}>{s.en}</div>
          </div>
        );
      })}
    </div>
  );
};

// Final card: sized in screen px and scaled by 1/LOOK_Z so it draws at 1:1.
export const EndText: React.FC = () => {
  const f = useCurrentFrame();
  if (f < END.aIn - 2) return null;
  const a = easeOut(inv(END.aIn, END.aIn + 14, f));
  const zh = easeOut(inv(END.zhIn, END.zhIn + 14, f));
  const small = easeOut(inv(END.smallIn, END.smallIn + 14, f));
  return (
    <div
      style={{
        position: "absolute",
        left: END_POS.x,
        top: END_POS.y,
        transform: `translate(-50%, -50%) scale(${1 / LOOK_Z})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        whiteSpace: "pre",
        zIndex: 80,
      }}
    >
      <div style={{ fontFamily: ZH, fontWeight: 900, fontSize: 150, lineHeight: 1, color: "#f5f5f5", opacity: a, transform: `translateY(${lerp(18, 0, a)}px)` }}>
        {END.a}
      </div>
      <div style={{ fontFamily: ZH, fontWeight: 700, fontSize: 82, marginTop: 52, color: "#f5f5f5", opacity: zh, transform: `translateY(${lerp(14, 0, zh)}px)` }}>
        {END.zh}
      </div>
      <div style={{ fontFamily: ZH, fontWeight: 500, fontSize: 32, marginTop: 48, letterSpacing: "0.04em", color: "#b8b8b8", opacity: small }}>
        {END.small}
      </div>
    </div>
  );
};
