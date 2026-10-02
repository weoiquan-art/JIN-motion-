import { useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, easeOut, inv, lerp, springAt } from "../math";
import { centred, GRAY, WHITE } from "../theme";
import { CRACK, LINE_A, LINE_B, logoEmerge, LOGOS, T } from "../timeline";

const enLabel = (size: number) => ({
  fontFamily: FONT,
  fontWeight: 800,
  fontSize: size,
  letterSpacing: "0.32em",
  color: GRAY,
  whiteSpace: "nowrap" as const,
});

const headline = (size: number) => ({
  fontFamily: FONT,
  fontWeight: 900,
  fontSize: size,
  lineHeight: 1,
  color: WHITE,
  whiteSpace: "pre" as const, // keep the space between "AI" and 协同
});

// Restrained entrance for the first three seconds: fade + small rise, no overshoot.
const calmIn = (f: number, start: number, dur = 20) => {
  const t = easeOut(inv(start, start + dur, f));
  return { opacity: t, dy: lerp(26, 0, t) };
};

export const IntroLines: React.FC = () => {
  const f = useCurrentFrame();
  // long out of shot by then; hide so the final pull-back doesn't catch them
  if (f > T.chaos + 60) return null;
  const a = calmIn(f, 4);
  const aEn = calmIn(f, 14);
  const b = calmIn(f, 50);
  const bEn = calmIn(f, 60);

  // 协 and 同 tear apart at the seam; the rest of the line is shoved outwards.
  const split = springAt(f - T.split, 260, 9, 0.6);
  const dx = 30 * split;
  const rot = 9 * split;
  const fs = LINE_B.fs;

  return (
    <>
      {/* "。" carries ~0.6em of blank on its right: nudge right to centre optically */}
      <div style={{ ...centred(LINE_A.x + LINE_A.fs * 0.3, LINE_A.y, `translateY(${a.dy}px)`), ...headline(LINE_A.fs), opacity: a.opacity }}>
        {LINE_A.text}
      </div>
      <div style={{ ...centred(LINE_A.x, LINE_A.y + LINE_A.fs * 0.78, `translateY(${aEn.dy}px)`), ...enLabel(28), opacity: aEn.opacity }}>
        {LINE_A.en}
      </div>

      <div style={{ opacity: b.opacity, position: "absolute", left: 0, top: b.dy }}>
        <div style={{ ...headline(fs), position: "absolute", left: CRACK.x - fs - dx * 0.5, top: CRACK.y, transform: "translate(-100%, -50%)" }}>
          {LINE_B.left}
        </div>
        <div style={{ ...headline(fs), ...centred(CRACK.x - fs / 2 - dx, CRACK.y, `rotate(${-rot}deg)`) }}>{LINE_B.c1}</div>
        <div style={{ ...headline(fs), ...centred(CRACK.x + fs / 2 + dx, CRACK.y, `rotate(${rot}deg)`) }}>{LINE_B.c2}</div>
        <div style={{ ...headline(fs), position: "absolute", left: CRACK.x + fs + dx * 0.5, top: CRACK.y, transform: "translate(0, -50%)" }}>
          {LINE_B.right}
        </div>
      </div>
      <div style={{ ...centred(0, LINE_B.y + fs * 0.8, `translateY(${bEn.dy}px)`), ...enLabel(24), opacity: bEn.opacity }}>
        {LINE_B.en}
      </div>
    </>
  );
};

// Crack line, gap glow and shockwaves at the seam of 协同.
const CRACK_MAIN = "-4,-80 6,-54 -8,-31 5,-8 -6,14 8,37 -5,59 3,80";
const CRACK_L = "5,-8 -20,-2 -36,9";
const CRACK_R = "-6,14 19,22 33,39";

export const CrackFx: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.crack || f > T.chaos + 10) return null;

  const draw = easeOut(inv(T.crack, T.crack + 3, f));
  const lineOpacity = 1 - inv(T.split + 1, T.split + 5, f);
  const glow =
    f < T.split ? 0 : clamp(inv(T.split, T.split + 3, f) * (1 - 0.75 * inv(T.split + 4, T.fling, f)) * (1 - inv(T.fling, T.chaos + 8, f)));
  const len = 200;

  const rings = [T.slam + 3, ...LOGOS.map((_, i) => logoEmerge(i))];

  return (
    <>
      <div
        style={{
          ...centred(CRACK.x, CRACK.y),
          width: 260,
          height: 300,
          opacity: glow,
          background:
            "radial-gradient(ellipse at center, #ffffff 0%, #ffe2a8 18%, rgba(255,140,50,0.55) 42%, rgba(255,80,20,0) 70%)",
        }}
      />
      <svg
        width={120}
        height={200}
        viewBox="-60 -100 120 200"
        style={{ ...centred(CRACK.x, CRACK.y), overflow: "visible", opacity: lineOpacity, filter: "drop-shadow(0 0 4px #ffb347)" }}
      >
        {[CRACK_MAIN, CRACK_L, CRACK_R].map((pts, i) => (
          <polyline
            key={pts}
            points={pts}
            fill="none"
            stroke="#ffffff"
            strokeWidth={i === 0 ? 3.4 : 2.2}
            strokeLinejoin="miter"
            strokeDasharray={len}
            strokeDashoffset={len * (1 - clamp(draw * 1.4 - i * 0.4))}
          />
        ))}
      </svg>
      {rings.map((start) => {
        const t = inv(start, start + 14, f);
        if (f < start || t >= 1) return null;
        const r = 18 + 230 * easeOut(t);
        return (
          <div
            key={start}
            style={{
              ...centred(CRACK.x, CRACK.y),
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              border: `${lerp(7, 1, t)}px solid rgba(255,255,255,${1 - t})`,
            }}
          />
        );
      })}
    </>
  );
};
