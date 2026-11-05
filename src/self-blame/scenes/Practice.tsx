import { useCurrentFrame } from "remotion";
import { clamp, hash, inv, lerp, pop, whip } from "../anim.ts";
import { EN, ZH_SERIF } from "../fonts";
import { appear, Blob, Bubble, Canvas, Cup, Floor, Glow, Station, Two, Typed } from "../parts";
import { C } from "../theme.ts";
import { CONTENT } from "../content.ts";
import { ST, T, TYPE } from "../timeline.ts";

const P = CONTENT.practice;
const FLOOR = 210;

// ------------------------------------------------------------------ practice 1
// Cross out "I'm hopeless", write "I didn't do this one well": the grey leaves
// the body and settles on the cup, and the cup gets mended with gold.
export const Practice1: React.FC = () => {
  const s = useCurrentFrame();
  const CARD = { x: -330, y: -40 };
  const ME = { x: 330, r: 100 };
  const CUP = { x: 560, size: 96 };
  const strike = whip(s - T.strike, 0, 6);
  const jolt = s >= T.strike - 0.75 ? Math.exp(-Math.max(0, s - T.strike) / 4) * whip(s - T.strike, 0, 2) : 0;
  const lift = whip(s - T.lift, 0, 16);
  const mend = whip(s - T.mend, 0.4, 12);
  const seam = inv(T.mend + 6, T.mend + 24, s);
  const ring = pop(s - T.lift, 6) * (1 - inv(T.mend + 10, T.mend + 30, s));
  const lastType = TYPE.rewrite[TYPE.rewrite.length - 1];
  // the strike: a slightly wobbly pencil line across the first line
  const x0 = CARD.x - 165;
  const x1 = CARD.x + 165;
  const xs = lerp(x0, x1, strike);
  const wob = (x: number) => Math.sin(x * 0.045) * 4 + (hash(Math.floor(x / 40)) - 0.5) * 3;
  const pts: string[] = [];
  for (let x = x0; x <= xs; x += 12) pts.push(`${x},${CARD.y - 72 + wob(x)}`);
  return (
    <Station x={ST.p1}>
      <Canvas>
        <Glow id="p1-spot" x={ME.x + 60} y={FLOOR - 60} r={560} color="#c9a26b" opacity={0.08 + 0.12 * mend} />
        <Floor y={FLOOR + 2} />
        {/* the card */}
        <g transform={`translate(0 ${10 * jolt}) rotate(${-2 + 1.5 * jolt} ${CARD.x} ${CARD.y})`}>
          <rect x={CARD.x - 300} y={CARD.y - 175} width={600} height={350} rx={18} fill={C.paper} />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={CARD.x - 260} y1={CARD.y - 95 + i * 78} x2={CARD.x + 260} y2={CARD.y - 95 + i * 78} stroke="#c9bfae" strokeWidth={2} opacity={0.6} />
          ))}
          {strike > 0 && pts.length > 1 ? (
            <polyline points={pts.join(" ")} fill="none" stroke={C.pencil} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
          ) : null}
        </g>
        {/* grey drifting from the body to the cup */}
        {lift > 0 && lift < 1
          ? [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const u = clamp(lift * 1.3 - i * 0.04);
              const x = lerp(ME.x, CUP.x, u);
              const y = lerp(FLOOR - 90, FLOOR - 40, u) - Math.sin(Math.PI * u) * (60 + 40 * hash(i));
              return <circle key={i} cx={x} cy={y} r={7 + 5 * hash(i * 2.2)} fill={C.gray} opacity={0.7 * Math.sin(Math.PI * u)} />;
            })
          : null}
        <Blob
          id="p1-me"
          x={ME.x}
          y={FLOOR}
          r={ME.r}
          s={s}
          seed={31}
          shame={0.75 * (1 - lift)}
          heart={0.25 + 0.35 * lift + 0.35 * mend}
          mood={mend > 0.5 ? "happy" : lift > 0.5 ? "calm" : "sad"}
          look={lift > 0 ? 1 : -0.6}
        />
        <Cup x={CUP.x} y={FLOOR} size={CUP.size} broken={1} mend={mend} seam={seam} ring={ring} />
      </Canvas>
      {/* text on the card */}
      <div style={{ position: "absolute", left: CARD.x, top: CARD.y - 80, transform: `translate(-50%, -50%) translateY(${10 * jolt}px) rotate(${-2 + 1.5 * jolt}deg)`, textAlign: "center", whiteSpace: "nowrap" }}>
        <div style={{ fontFamily: ZH_SERIF, fontSize: 72, fontWeight: 700, color: mixHex("#3a3a44", "#8b8577", strike) }}>{P.p1.before.zh}</div>
        <div style={{ fontFamily: EN, fontSize: 24, color: "#8b8577", marginTop: 2, opacity: 1 - 0.5 * strike }}>{P.p1.before.en}</div>
      </div>
      <div style={{ position: "absolute", left: CARD.x, top: CARD.y + 70, transform: `translate(-50%, -50%) translateY(${10 * jolt}px) rotate(${-2 + 1.5 * jolt}deg)`, textAlign: "center", whiteSpace: "nowrap" }}>
        <div style={{ fontFamily: ZH_SERIF, fontSize: 58, fontWeight: 700, color: "#2f3a4a" }}>
          <Typed text={P.p1.after.zh} times={TYPE.rewrite} s={s} />
        </div>
        <div style={{ fontFamily: EN, fontSize: 24, color: "#5f6b7d", marginTop: 4, opacity: pop(s - lastType) }}>{P.p1.after.en}</div>
      </div>
    </Station>
  );
};

// ------------------------------------------------------------------ practice 2
// Comfort a friend who spilled their cup… then the friend turns out to be your
// own reflection: say the same sentence to yourself.
export const Practice2: React.FC = () => {
  const s = useCurrentFrame();
  const F = { x: -300, r: 82 };
  const ME = { x: 300, r: 85 };
  const tip = whip(s - T.spill, 0.5, 9);
  const puddle = whip(s - T.spill, 0, 20);
  const say = appear(s, T.comfort, 0.8, 9);
  const mirror = whip(s - T.mirror, 0, 16);
  const glass = pop(s - T.mirror, 6);
  const warm = whip(s - T.warm, 0.3, 14);
  const loop = whip(s - T.mirror, 0, 14);
  const lastType = TYPE.comfort[TYPE.comfort.length - 1];
  const handX = -F.r * 1.3;
  return (
    <Station x={ST.p2}>
      <Canvas>
        <Glow id="p2-spot" x={0} y={FLOOR - 70} r={700} color="#d9a36b" opacity={0.06 + 0.16 * warm} />
        <Floor y={FLOOR + 2} />
        {/* the mirror */}
        <line x1={0} y1={-330} x2={0} y2={FLOOR + 6} stroke="#cfe6ff" strokeWidth={3} opacity={0.45 * glass} />
        <rect x={-6} y={-330} width={12} height={540} fill="#cfe6ff" opacity={0.06 * glass} />
        {/* the spill */}
        <ellipse cx={F.x - 150} cy={FLOOR + 3} rx={90 * puddle} ry={13 * puddle} fill="#7fb2e0" opacity={0.55} />
        <Blob
          id="p2-friend"
          x={F.x}
          y={FLOOR}
          r={F.r}
          s={s}
          seed={41}
          body={mixHex(C.teal, C.cream, mirror)}
          shade={mixHex(C.tealShade, C.creamShade, mirror)}
          heart={0.45 + 0.55 * warm}
          mood={warm > 0.3 ? "happy" : s >= T.spill ? "sad" : "calm"}
          look={s >= T.spill ? -0.8 : 0.4}
          flip
          arm={s < T.spill - 0.75 ? { x: -handX, y: -96 } : null}
          squash={s >= T.spill - 0.75 ? 0.14 * Math.exp(-Math.max(0, s - T.spill) / 5) * whip(s - T.spill, 0, 2) : 0}
        />
        <Cup x={F.x + handX + lerp(0, -40, tip)} y={lerp(FLOOR - 92, FLOOR, tip)} size={64} rot={lerp(0, -92, tip)} color={C.cup} shade={C.cupShade} />
        <Blob id="p2-me" x={ME.x} y={FLOOR} r={ME.r} s={s} seed={43} heart={0.6 + 0.4 * warm} mood={warm > 0.3 ? "happy" : "calm"} look={-1} />
        {/* the sentence comes back to the speaker */}
        {loop > 0 ? (
          <path
            d={`M ${240} ${-210} C ${470} ${-260}, ${520} ${-120}, ${ME.x + 70} ${FLOOR - 190}`}
            stroke={C.guilt}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${420 * loop} 600`}
            opacity={0.85}
          />
        ) : null}
      </Canvas>
      <Bubble x={-20} y={-190} w={580} h={128} tail={[230, 120]} fill="rgba(255,236,214,0.10)" stroke="#ffd2a6" strokeWidth={2.5} opacity={say.o} scale={say.k}>
        <Two zh={<Typed text={P.p2.comfort.zh} times={TYPE.comfort} s={s} />} en={P.p2.comfort.en} size={40} color="#fff1e2" enColor="#e8c7a8" enOpacity={pop(s - lastType)} />
      </Bubble>
    </Station>
  );
};

const mixHex = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a);
  const y = p(b);
  return `#${x.map((v, i) => Math.round(lerp(v, y[i], clamp(t))).toString(16).padStart(2, "0")).join("")}`;
};
