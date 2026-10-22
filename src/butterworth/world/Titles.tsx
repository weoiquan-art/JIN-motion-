import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeInOut, easeOut, inv, lerp } from "../../intro/math";
import { EN, ZH_SANS, ZH_SERIF } from "../fonts";
import { M, PAN_LEAD, PAN_TAIL, SCENES, titleIn, titleOut } from "../timeline";

const minutes = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};
const fmt = (min: number) => {
  const m = Math.round(min);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// Clock runs forward like a time-lapse during each whip pan.
const clockAt = (f: number) => {
  for (let i = 1; i < SCENES.length; i++) {
    const a = SCENES[i - 1];
    const b = SCENES[i];
    if (f < b.from + PAN_TAIL) {
      const t = easeInOut(inv(a.to - PAN_LEAD, b.from + PAN_TAIL, f));
      return lerp(minutes(a.clock), minutes(b.clock), t);
    }
  }
  return minutes(SCENES[SCENES.length - 1].clock);
};

const shadow = "0 2px 18px rgba(10,10,30,0.45), 0 1px 3px rgba(10,10,30,0.35)";

// Chapter title in the lower left: tag line, serif title, English line.
const SceneTitle: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const s = SCENES[i];
  const a = titleIn(s);
  const out = easeInOut(inv(titleOut(s), titleOut(s) + 10, f));
  if (f < a - 1 || out >= 1) return null;
  const tag = easeOut(inv(a, a + 14, f));
  const title = easeOut(inv(a + 5, a + 22, f));
  const en = easeOut(inv(a + 12, a + 28, f));
  const rule = easeOut(inv(a, a + 20, f));
  const lift = (v: number) => `translateY(${lerp(26, 0, v) - out * 18}px)`;
  return (
    <div style={{ position: "absolute", left: 118, bottom: 112, opacity: 1 - out, color: "#ffffff", textShadow: shadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: tag, transform: lift(tag) }}>
        <div style={{ width: 54 * rule, height: 4, borderRadius: 2, background: "#ffd36b", boxShadow: "none" }} />
        <div style={{ fontFamily: EN, fontWeight: 700, fontSize: 28, letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums" }}>{s.clock}</div>
        <div style={{ fontFamily: ZH_SANS, fontWeight: 600, fontSize: 28 }}>{s.tag.zh}</div>
        <div style={{ fontFamily: EN, fontWeight: 600, fontSize: 21, letterSpacing: "0.22em", opacity: 0.85 }}>{s.tag.en}</div>
      </div>
      <div
        style={{
          fontFamily: ZH_SERIF,
          fontWeight: 900,
          fontSize: 100,
          lineHeight: 1.12,
          marginTop: 18,
          whiteSpace: "pre",
          opacity: title,
          transform: lift(title),
        }}
      >
        {s.title}
      </div>
      <div style={{ fontFamily: EN, fontWeight: 500, fontSize: 32, marginTop: 14, letterSpacing: "0.01em", opacity: en * 0.92, transform: lift(en) }}>
        {s.en}
      </div>
    </div>
  );
};

// Small sun / moon arc next to the clock: where the day is.
const DayArc: React.FC<{ min: number }> = ({ min }) => {
  const t = Math.min(1, Math.max(0, (min - 6 * 60) / (14.5 * 60)));
  const a = Math.PI * (1 - t);
  const x = 30 + Math.cos(a) * 26;
  const y = 34 - Math.sin(a) * 26;
  const night = min > 19 * 60 + 20;
  return (
    <svg width={60} height={40} style={{ overflow: "visible" }}>
      <path d="M4,34 A26,26 0 0 1 56,34" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={2} strokeDasharray="3 4" />
      <line x1={0} y1={34} x2={60} y2={34} stroke="rgba(255,255,255,0.45)" strokeWidth={2} />
      <circle cx={x} cy={y} r={6} fill={night ? "#e9ecff" : "#ffd36b"} />
    </svg>
  );
};

// Persistent brand + clock while the day plays.
const Hud: React.FC = () => {
  const f = useCurrentFrame();
  const vis = easeOut(inv(M.irisFull - 10, M.irisFull + 14, f)) * (1 - inv(M.irisOut - 10, M.irisOut + 6, f));
  if (vis <= 0) return null;
  const min = clockAt(f);
  return (
    <AbsoluteFill style={{ opacity: vis, color: "#ffffff", textShadow: shadow }}>
      <div style={{ position: "absolute", left: 118, top: 72, display: "flex", alignItems: "center", gap: 14 }}>
        <svg width={22} height={30} viewBox="0 0 22 30">
          <path d="M11,29 C11,29 21,17 21,10.5 A10,10 0 0 0 1,10.5 C1,17 11,29 11,29 Z" fill="#ffd36b" />
          <circle cx={11} cy={10.5} r={4} fill="#3a2a1a" />
        </svg>
        <div style={{ fontFamily: ZH_SANS, fontWeight: 700, fontSize: 30 }}>北海</div>
        <div style={{ fontFamily: EN, fontWeight: 600, fontSize: 20, letterSpacing: "0.3em", opacity: 0.9 }}>BUTTERWORTH</div>
      </div>
      <div style={{ position: "absolute", right: 118, top: 64, display: "flex", alignItems: "center", gap: 16 }}>
        <DayArc min={min} />
        <div style={{ fontFamily: EN, fontWeight: 700, fontSize: 40, letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums" }}>{fmt(min)}</div>
      </div>
    </AbsoluteFill>
  );
};

export const Titles: React.FC = () => {
  const f = useCurrentFrame();
  // soft scrim behind the lower-left titles
  const scrim = SCENES.reduce((v, s) => Math.max(v, inv(titleIn(s) - 4, titleIn(s) + 12, f) * (1 - inv(titleOut(s), titleOut(s) + 14, f))), 0);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(14,10,30,0.5) 0%, rgba(14,10,30,0.18) 28%, rgba(14,10,30,0) 48%)", opacity: scrim }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(14,10,30,0.28) 0%, rgba(14,10,30,0) 18%)" }} />
      {SCENES.map((s, i) => (
        <SceneTitle key={s.id} i={i} />
      ))}
      <Hud />
    </AbsoluteFill>
  );
};
