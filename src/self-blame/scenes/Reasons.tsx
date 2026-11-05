import { useCurrentFrame } from "remotion";
import { easeInOut, fadeOut, hash, inv, lerp, noise1, pop, whip } from "../anim.ts";
import { EN, ZH, ZH_SERIF } from "../fonts";
import { appear, Blob, Bubble, Canvas, Floor, Glow, Heart, Pill, Station, Two, Typed } from "../parts";
import { B } from "../beat.ts";
import { C } from "../theme.ts";
import { CONTENT } from "../content.ts";
import { ST, T, TYPE } from "../timeline.ts";

const R = CONTENT.reasons;
const FLOOR = 200;

// Parent figure: a tall, warm-grey version of the character.
const parentProps = { tall: 1.6, r: 78, body: C.parent, shade: C.parentShade };
const chestY = (r: number, tall: number) => FLOOR - r * 0.93 * tall * (1 - 0.36);

// ------------------------------------------------------------------ reason 1
// "Love seemed to depend on how well they did": a 100 sends the heart over,
// a 60 sends it back.
export const Reason1: React.FC = () => {
  const s = useCurrentFrame();
  const P = { x: -250 };
  const K = { x: 140, r: 56 };
  const go = whip(s - T.good, 0.3, 14);
  const back = whip(s - T.bad, 0.3, 14);
  const k = go * (1 - back); // 1 = the heart is with the child
  const from = { x: P.x, y: chestY(78, 1.6) };
  const to = { x: K.x, y: chestY(K.r, 1) };
  const hx = lerp(from.x, to.x, k);
  const hy = lerp(from.y, to.y, k) - Math.sin(Math.PI * k) * 150;
  const travelling = s >= T.good - 0.75 && !(k >= 0.999) && !(s >= T.bad + 14);
  const card = appear(s, T.good, 1.3, 9);
  const flip = s >= T.bad ? whip(s - T.bad, 1.3, 9) : 1;
  const later = inv(T.bad, T.bad + 30, s);
  const cap2 = inv(B(42), B(42) + 24, s); // second caption of reason 1
  return (
    <Station x={ST.r1}>
      <Canvas>
        <Glow id="r1-spot" x={-60} y={FLOOR - 60} r={620} color="#6b78b8" opacity={0.16} />
        <Floor y={FLOOR + 2} />
        <Blob
          id="r1-parent"
          x={P.x + 40 * go - 70 * later}
          y={FLOOR}
          {...parentProps}
          s={s}
          seed={5}
          heart={1 - 0.5 * k}
          mood={s >= T.bad ? "away" : "calm"}
          look={s >= T.bad ? -1.8 : 0.8}
          showHeart
        />
        <Blob
          id="r1-child"
          x={K.x}
          y={FLOOR}
          r={K.r}
          s={s}
          seed={9}
          heart={0.45 + 0.55 * k - 0.15 * later}
          shame={0.45 * later + 0.15 * cap2}
          mood={s >= T.bad ? "sad" : s >= T.good ? "happy" : "calm"}
          look={-0.6}
          scale={1 - 0.08 * cap2}
        />
        {travelling ? <Heart x={hx} y={hy} w={42 + 14 * Math.sin(Math.PI * k)} fill={C.heart} /> : null}
        {/* the report card */}
        <g opacity={card.o} transform={`translate(${K.x + 10} ${-60}) scale(${card.k * flip} ${card.k}) rotate(-4)`}>
          <rect x={-86} y={-58} width={172} height={116} rx={10} fill={C.paper} />
          <rect x={-86} y={-58} width={172} height={22} rx={10} fill={s >= T.bad ? "#d9cdb8" : "#cfe2c8"} />
        </g>
      </Canvas>
      <div
        style={{
          position: "absolute",
          left: K.x + 10,
          top: -48,
          transform: `translate(-50%, -50%) scale(${card.k * flip}, ${card.k}) rotate(-4deg)`,
          opacity: card.o,
          fontFamily: EN,
          fontSize: 60,
          fontWeight: 800,
          color: s >= T.bad ? "#8a5a50" : "#3f6b47",
        }}
      >
        {s >= T.bad ? R.r1.bad : R.r1.good}
      </div>
    </Station>
  );
};

// ------------------------------------------------------------------ reason 2
// Attachment: one call is answered, one is not → "Am I worth loving?".
// Grown up: an ambiguous "……" is heard as "You don't want me?".
export const Reason2: React.FC = () => {
  const s = useCurrentFrame();
  const P = { x: -280 };
  const K = { x: 100, r: 56 };
  const [c1, c2] = T.calls;
  const answer = c1 + 12; // half a beat after the call
  const warm = whip(s - answer, 0, 10) * (1 - inv(c2 - 6, c2 + 6, s));
  const turned = easeInOut(inv(c1 + 30, c2, s));
  const cold = inv(c2 + 12, c2 + 40, s);
  const model = appear(s, T.model, 1.1, 10);
  // the question never settles: the card keeps wobbling
  const tilt = model.o * (3 * noise1(s * 0.08, 3) + 1.5 * Math.sin(s * 0.19));
  const ring = (at: number) => {
    const t = s - at;
    if (t < -0.75 || t > 30) return null;
    const u = whip(t, 0, 30);
    return (
      <circle cx={K.x} cy={FLOOR - 70} r={70 + 230 * u} fill="none" stroke="#ffffff" strokeWidth={5} opacity={0.8 * (1 - u)} />
    );
  };
  // grown up
  const NOW = ST.r2now - ST.r2;
  const O = { x: NOW - 280 };
  const M = { x: NOW + 270, r: 82 };
  const vague = appear(s, T.vague, 0.8, 9);
  const heardA = appear(s, T.heard, 0.8, 9);
  const worry = inv(T.heard, T.heard + 30, s);
  return (
    <Station x={ST.r2}>
      <Canvas w={4200}>
        <Glow id="r2-spot" x={-90} y={FLOOR - 60} r={600} color="#6b78b8" opacity={0.15} />
        <Glow id="r2-spot2" x={NOW} y={FLOOR - 60} r={620} color="#6b78b8" opacity={0.15} />
        <Floor y={FLOOR + 2} w={1300} />
        <g transform={`translate(${NOW} 0)`}>
          <Floor y={FLOOR + 2} w={1300} />
        </g>
        {/* the answer: a warm beam from the parent's heart to the child */}
        {warm > 0.01 ? (
          <line x1={P.x} y1={chestY(78, 1.6)} x2={K.x} y2={chestY(K.r, 1)} stroke={C.heart} strokeWidth={10} strokeLinecap="round" opacity={0.55 * warm} />
        ) : null}
        {ring(c1)}
        {ring(c2)}
        <Blob id="r2-parent" x={P.x} y={FLOOR} {...parentProps} s={s} seed={6} heart={1 - 0.6 * turned} mood={turned > 0.5 ? "away" : "calm"} look={lerp(0.8, -1.8, turned)} />
        <Blob
          id="r2-child"
          x={K.x}
          y={FLOOR}
          r={K.r}
          s={s}
          seed={11}
          heart={0.5 + 0.5 * warm - 0.35 * cold}
          shame={0.4 * cold}
          mood={cold > 0.3 ? "sad" : warm > 0.3 ? "happy" : "calm"}
          look={-0.7}
          squash={-0.14 * T.calls.reduce((a, f) => a + (s >= f - 0.75 ? Math.exp(-Math.max(0, s - f) / 6) * whip(s - f, 0, 2) : 0), 0)}
        />
        {/* grown up */}
        <Blob id="r2-other" x={O.x} y={FLOOR} r={72} tall={1.3} body="#a3adc9" shade="#7581a3" s={s} seed={13} mood="calm" look={0.6} showHeart={false} />
        <Blob id="r2-me" x={M.x} y={FLOOR} r={M.r} s={s} seed={17} heart={1 - 0.6 * worry} shame={0.35 * worry} mood={worry > 0.1 ? "worried" : "calm"} look={-0.8} squash={s >= T.radar - 0.75 ? 0.12 * Math.exp(-Math.max(0, s - T.radar) / 5) * whip(s - T.radar, 0, 2) : 0} />
        {/* alarm ripples: expecting rejection */}
        {[0, 4, 8].map((d) => {
          const t = s - T.radar - d;
          if (t < -0.75 || t > 14) return null;
          const u = whip(t, 0, 14);
          return <circle key={d} cx={M.x} cy={FLOOR - 90} r={90 + 200 * u} fill="none" stroke={C.guilt} strokeWidth={6} opacity={0.85 * (1 - u)} />;
        })}
      </Canvas>
      <Bubble x={K.x} y={-110} w={400} h={112} tail={[0, 130]} fill="rgba(18,22,44,0.92)" stroke="rgba(255,255,255,0.35)" strokeWidth={2} opacity={model.o} scale={model.k} rot={tilt}>
        <Two zh={R.r2.model.zh} en={R.r2.model.en} size={40} />
      </Bubble>
      <Bubble x={O.x + 70} y={-70} w={170} h={96} tail={[-40, 80]} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.45)" strokeWidth={2} opacity={vague.o * fadeOut(s - (T.heard + 40), 12)} scale={vague.k}>
        <div style={{ fontFamily: ZH, fontSize: 44, color: C.ink, letterSpacing: 4 }}>{R.r2.vague}</div>
      </Bubble>
      <Bubble x={M.x - 40} y={-150} w={400} h={118} tail={[30, 110]} fill="rgba(255,106,90,0.16)" stroke={C.blame} strokeWidth={3.5} dash="12 8" opacity={heardA.o} scale={heardA.k}>
        <Two zh={<Typed text={R.r2.heard.zh} times={TYPE.heard} s={s} />} en={R.r2.heard.en} size={42} color="#ffd9d3" enColor="#ff9f94" enOpacity={pop(s - TYPE.heard[TYPE.heard.length - 1])} />
      </Bubble>
    </Station>
  );
};

// ------------------------------------------------------------------ reason 3
// Automatic thoughts pop out on 8th notes; two get their CBT names; under them,
// the roots lead to a deeper belief.
const CHIP_AT = [
  { x: -560, y: -190 },
  { x: 540, y: -190 },
  { x: -560, y: 70 },
  { x: 540, y: 70 },
];
const ROOTS = [-150, -90, -35, 30, 85, 145];
export const Reason3: React.FC = () => {
  const s = useCurrentFrame();
  const head = { x: 0, y: FLOOR - 150 };
  const seen = T.chips.reduce((n, f) => n + (s >= f ? 1 : 0), 0);
  const labelled = s >= T.labels[0];
  const grow = easeInOut(inv(T.dive, T.dive + 34, s));
  const core = appear(s, T.core, 0.8, 12);
  // the thoughts leave as we sink to the belief under them
  const away = fadeOut(s - T.dive, 10);
  return (
    <Station x={ST.r3}>
      <Canvas w={3000} h={3000}>
        <Glow id="r3-spot" x={0} y={FLOOR - 60} r={640} color="#6b78b8" opacity={0.14} />
        <Floor y={FLOOR + 2} w={1700} />
        {/* roots down to the core belief */}
        {ROOTS.map((x0, i) => {
          const len = 900;
          const wob = (hash(i * 5.3) - 0.5) * 220;
          return (
            <path
              key={i}
              d={`M ${x0} ${FLOOR + 6} C ${x0 * 1.6 + wob} ${FLOOR + 180}, ${x0 * 0.5 - wob} ${FLOOR + 330}, 0 ${FLOOR + 445}`}
              stroke="#8f86b8"
              strokeOpacity={0.55}
              strokeWidth={5 - Math.abs(x0) / 60}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${len * grow} ${len}`}
            />
          );
        })}
        <Glow id="r3-core" x={0} y={FLOOR + 450} r={260} color="#9b8fd6" opacity={0.35 * core.o} />
        <circle cx={0} cy={FLOOR + 450} r={120 * core.k} fill="rgba(30,26,58,0.92)" stroke="#9b8fd6" strokeOpacity={0.7} strokeWidth={3} opacity={core.o} />
        <Blob
          id="r3-me"
          x={0}
          y={FLOOR}
          r={90}
          s={s}
          seed={21}
          heart={1 - 0.15 * seen}
          shame={0.1 * seen}
          mood={seen > 0 ? "worried" : "calm"}
          look={0}
        />
      </Canvas>
      {R.r3.thoughts.map((t, i) => {
        const at = T.chips[i];
        const fly = whip(s - at, 1.1, 10);
        const p = CHIP_AT[i];
        const x = lerp(head.x, p.x, fly) + noise1(s * 0.13, i + 1) * 8;
        const y = lerp(head.y, p.y, fly) + noise1(s * 0.11, i + 7) * 6;
        const dim = i >= 2 && labelled ? 1 - 0.65 * inv(T.labels[0], T.labels[0] + 10, s) : 1;
        return (
          <Pill
            key={i}
            x={x}
            y={y}
            zh={t.zh}
            en={t.en}
            size={38}
            opacity={pop(s - at) * dim * away}
            scale={0.4 + 0.6 * fly}
            rot={(i % 2 ? 1 : -1) * 3}
            bg="rgba(255,106,90,0.10)"
            border="rgba(255,106,90,0.55)"
          />
        );
      })}
      {[R.r3.personal, R.r3.label].map((l, i) => {
        const a = appear(s, T.labels[i], 1, 9);
        const p = CHIP_AT[i];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y + 98,
              transform: `translate(-50%, -50%) scale(${a.k})`,
              opacity: a.o * away,
              textAlign: "center",
              whiteSpace: "nowrap",
              background: "rgba(255,181,71,0.12)",
              border: `2px solid rgba(255,181,71,0.6)`,
              borderRadius: 12,
              padding: "8px 18px",
            }}
          >
            <div style={{ fontFamily: ZH, fontSize: 28, fontWeight: 600, color: C.guilt }}>{l.zh}</div>
            <div style={{ fontFamily: EN, fontSize: 17, color: "#d9b77a", marginTop: 3 }}>{l.en}</div>
          </div>
        );
      })}
      <Txt3 s={s} core={core} />
    </Station>
  );
};

const Txt3: React.FC<{ s: number; core: { o: number; k: number } }> = ({ core }) => (
  <>
    <div style={{ position: "absolute", left: 0, top: FLOOR + 290, transform: "translate(-50%, -50%)", opacity: core.o, textAlign: "center", whiteSpace: "nowrap" }}>
      <span style={{ fontFamily: ZH, fontSize: 26, color: "#b9b0e6", letterSpacing: 2 }}>{R.r3.coreTag.zh}</span>
      <span style={{ fontFamily: EN, fontSize: 18, color: "#8f86b8", marginLeft: 10 }}>{R.r3.coreTag.en}</span>
    </div>
    <div style={{ position: "absolute", left: 0, top: FLOOR + 450, transform: `translate(-50%, -50%) scale(${core.k})`, opacity: core.o, textAlign: "center", whiteSpace: "nowrap" }}>
      <div style={{ fontFamily: ZH_SERIF, fontSize: 46, fontWeight: 700, color: "#e6e0ff" }}>{R.r3.core.zh}</div>
      <div style={{ fontFamily: EN, fontSize: 20, color: "#a99fdc", marginTop: 4 }}>{R.r3.core.en}</div>
    </div>
  </>
);
