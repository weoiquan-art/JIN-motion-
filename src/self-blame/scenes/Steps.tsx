import { useCurrentFrame } from "remotion";
import { pop, whip } from "../anim.ts";
import { EN, ZH } from "../fonts";
import { appear, Arrow, Blob, Bubble, Canvas, Cup, Pill, Station, Two } from "../parts";
import { C } from "../theme.ts";
import { CONTENT } from "../content.ts";
import { ST, T } from "../timeline.ts";

const P = CONTENT.steps;
const Y = 10; // row centre
const ONE = -120;
const TWO = 510;
const CARD = { w: 420, h: 360 };

// 16–28.8 s: blamed → ① "I did something wrong" (guilt: about the act)
//                     → ② "I am bad" (shame: about the whole self).
export const Steps: React.FC = () => {
  const s = useCurrentFrame();
  const one = appear(s, T.one, 1, 9);
  const two = appear(s, T.two, 1, 9);
  const ring = pop(s - T.guiltRing, 6);
  const flood = whip(s - T.shameFlood, 0, 14);
  const small = whip(s - T.small, 0.6, 12);
  const scale = 1 - 0.42 * small;
  return (
    <Station x={ST.steps}>
      <Canvas>
        {/* card ① */}
        <g opacity={one.o} transform={`translate(${ONE} ${Y}) scale(${one.k}) translate(${-ONE} ${-Y})`}>
          <rect x={ONE - CARD.w / 2} y={Y - CARD.h / 2} width={CARD.w} height={CARD.h} rx={28} fill="rgba(255,255,255,0.045)" stroke={ring > 0 ? C.guilt : "rgba(255,255,255,0.18)"} strokeOpacity={ring > 0 ? 0.25 + 0.5 * ring : 1} strokeWidth={2} />
          <Cup x={ONE} y={Y + 14} size={76} broken={1} ring={ring} />
        </g>
        {/* card ② */}
        <g opacity={two.o} transform={`translate(${TWO} ${Y}) scale(${two.k}) translate(${-TWO} ${-Y})`}>
          <rect x={TWO - CARD.w / 2} y={Y - CARD.h / 2} width={CARD.w} height={CARD.h} rx={28} fill={`rgba(125,131,153,${0.05 + 0.16 * flood})`} stroke={`rgba(255,255,255,${0.18 + 0.12 * flood})`} strokeWidth={2} />
          <Blob id="steps-me" x={TWO} y={Y + 46} r={70} s={s} seed={2} shame={0.15 + 0.8 * flood} heart={1 - 0.8 * flood} mood={flood > 0.2 ? "sad" : "worried"} scale={scale} />
        </g>
        <Arrow a={[-560, Y]} b={[-352, Y]} grow={whip(s - T.one, 0, 7)} />
        <Arrow a={[112, Y]} b={[282, Y]} grow={whip(s - T.two, 0, 7)} dash="10 10" color="#c8cbe0" />
      </Canvas>
      {/* blamed */}
      <Bubble x={-690} y={Y} w={230} h={116} tail={[60, 80]} fill="#2a1316" stroke={C.blame} sharp rot={-3}>
        <Two zh={P.event.zh} en={P.event.en} size={40} color="#ffd9d3" enColor="#ff9f94" weight={700} />
      </Bubble>
      {/* labels under the pictures */}
      {[
        { x: ONE, a: one, line: P.one, n: "①" },
        { x: TWO, a: two, line: P.two, n: "②" },
      ].map(({ x, a, line, n }) => (
        <div key={n} style={{ position: "absolute", left: x, top: Y + 104, transform: `translate(-50%, -50%) scale(${a.k})`, opacity: a.o, textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ fontFamily: ZH, fontSize: 36, fontWeight: 600, color: C.ink }}>
            <span style={{ color: C.sub, marginRight: 10 }}>{n}</span>
            {line.zh}
          </div>
          <div style={{ fontFamily: EN, fontSize: 21, color: C.sub, marginTop: 6 }}>{line.en}</div>
        </div>
      ))}
      <Pill x={ONE} y={Y - 246} zh={P.guilt.zh} en={P.guilt.en} size={32} color={C.guilt} border={`rgba(255,181,71,${0.6 * ring})`} bg="rgba(255,181,71,0.10)" opacity={ring} scale={0.8 + 0.2 * whip(s - T.guiltRing, 1.2, 9)} />
      <Pill x={TWO} y={Y - 246} zh={P.shame.zh} en={P.shame.en} size={32} color="#c9cde0" border="rgba(201,205,224,0.5)" bg="rgba(125,131,153,0.18)" opacity={pop(s - T.shameFlood)} scale={0.8 + 0.2 * whip(s - T.shameFlood, 1.2, 9)} />
    </Station>
  );
};
