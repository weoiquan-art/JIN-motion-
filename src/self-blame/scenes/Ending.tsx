import { useCurrentFrame } from "remotion";
import { easeInOut, inv, lerp, pop, whip } from "../anim.ts";
import { EN, ZH, ZH_SERIF } from "../fonts";
import { Blob, Canvas, Cup, Glow, Station } from "../parts";
import { C } from "../theme.ts";
import { CONTENT } from "../content.ts";
import { DURATION } from "../beat.ts";
import { ST, T } from "../timeline.ts";

const E = CONTENT.ending;
const HORIZON = 120;

// Dawn: the sun comes up behind the character, who holds the mended cup.
// Then the line, the suggestion to talk to a counsellor, and the references.
export const Ending: React.FC = () => {
  const s = useCurrentFrame();
  const rise = easeInOut(inv(T.end, DURATION, s));
  const sunY = lerp(HORIZON + 170, HORIZON - 40, rise);
  const line = s - T.line;
  const help = s - T.help;
  const refs = pop(s - T.refs, 12);
  return (
    <Station x={ST.end}>
      <Canvas w={4000} h={3000}>
        <defs>
          <radialGradient id="end-sky" cx="50%" cy="100%" r="100%">
            <stop offset="0%" stopColor={C.horizon} stopOpacity={0.9} />
            <stop offset="45%" stopColor="#8a5a6e" stopOpacity={0.55} />
            <stop offset="100%" stopColor={C.dusk} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="end-ground-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity={0} />
            <stop offset="25%" stopColor="#fff" stopOpacity={1} />
            <stop offset="75%" stopColor="#fff" stopOpacity={1} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <mask id="end-ground-mask">
            <rect x={-1700} y={HORIZON} width={3400} height={1200} fill="url(#end-ground-fade)" />
          </mask>
        </defs>
        <ellipse cx={0} cy={HORIZON} rx={1700} ry={1000} fill="url(#end-sky)" />
        <Glow id="end-sun-glow" x={0} y={sunY} r={520} color={C.sun} opacity={0.45} />
        <circle cx={0} cy={sunY} r={130} fill={C.sun} opacity={0.95} />
        {/* ground covers the sun until it rises */}
        <rect x={-1700} y={HORIZON} width={3400} height={1200} fill="#1b1528" mask="url(#end-ground-mask)" />
        <line x1={-1100} y1={HORIZON} x2={1100} y2={HORIZON} stroke={C.sun} strokeOpacity={0.35} strokeWidth={2} />
        <Blob id="end-me" x={-40} y={HORIZON} r={72} s={s} seed={51} heart={1} mood="happy" look={0.3} arm={{ x: 100, y: -70 }} shadow={0.2} />
        <Cup x={-40 + 100 + 6} y={HORIZON - 66} size={54} broken={1} mend={1} seam={1} />
      </Canvas>
      <div style={{ position: "absolute", left: 0, top: -300, transform: `translate(-50%, -50%) translateY(${(1 - whip(line, 0.5, 12)) * 24}px)`, opacity: pop(line), textAlign: "center", whiteSpace: "nowrap" }}>
        <div style={{ fontFamily: ZH_SERIF, fontSize: 68, fontWeight: 700, color: C.ink, letterSpacing: 2 }}>{E.line.zh}</div>
        <div style={{ fontFamily: EN, fontSize: 30, color: "#d8cfe3", marginTop: 12 }}>{E.line.en}</div>
      </div>
      <div style={{ position: "absolute", left: 0, top: 285, transform: `translate(-50%, -50%) translateY(${(1 - whip(help, 0.4, 10)) * 14}px)`, opacity: pop(help), textAlign: "center", whiteSpace: "nowrap" }}>
        <div style={{ fontFamily: ZH, fontSize: 40, fontWeight: 600, color: "#ffe6cf" }}>{E.help.zh}</div>
        <div style={{ fontFamily: EN, fontSize: 23, color: "#d8c3b4", marginTop: 8 }}>{E.help.en}</div>
      </div>
      <div style={{ position: "absolute", left: 0, top: 420, transform: "translate(-50%, -50%)", opacity: refs * 0.85, textAlign: "center", width: 1760 }}>
        <div style={{ fontFamily: ZH, fontSize: 18, color: "#a59bb8", letterSpacing: 2 }}>
          {E.refsTitle.zh} <span style={{ fontFamily: EN }}>{E.refsTitle.en}</span>
        </div>
        <div style={{ fontFamily: EN, fontSize: 14.5, lineHeight: 1.55, color: "#8f86a6", marginTop: 6 }}>{E.refs.join("  ·  ")}</div>
        <div style={{ fontFamily: EN, fontSize: 15, color: "#8f86a6", marginTop: 6 }}>
          <span style={{ fontFamily: ZH }}>{E.disclaimer.zh}</span> {E.disclaimer.en} · {E.sfx}
        </div>
      </div>
    </Station>
  );
};
