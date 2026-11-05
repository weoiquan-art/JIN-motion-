import { useCurrentFrame } from "remotion";
import { clamp, easeIn, fadeOut, inv, lerp, noise1, pop, whip } from "../anim.ts";
import { ZH_SERIF, EN } from "../fonts";
import { Blob, Bubble, Canvas, Cup, Floor, Glow, Station, Two, Typed } from "../parts";
import { C } from "../theme.ts";
import { CONTENT } from "../content.ts";
import { ST, T, TYPE } from "../timeline.ts";

const H = CONTENT.hook;
const FLOOR = 230;
const ME = { x: -60, r: 110 };
const HAND = { x: 142, y: -104 }; // right hand, relative to the feet
const CUP = 86;

// 0–16 s: a cup slips and breaks, "Wrong again?", two thoughts sink the heart,
// then the question appears above the small, grey figure.
export const Hook: React.FC = () => {
  const s = useCurrentFrame();
  const sinceBlame = s - T.blame;
  const titleIn = T.title[0];

  // the cup: in the hand → slips on T.slip → hits the floor on T.shatter
  const fall = inv(T.slip, T.shatter, s);
  const handX = ME.x + HAND.x;
  const handY = FLOOR + HAND.y;
  const cupX = lerp(handX + 6, handX + 46, fall);
  const cupY = s < T.shatter ? lerp(handY + 4, FLOOR, easeIn(fall) ** 0.67) : FLOOR;
  // the tilt straightens out while the pieces fly, so they come to rest flat
  const cupRot = s < T.shatter ? lerp(0, 38, fall) : 38 * (1 - clamp((s - T.shatter + 0.75) / 12));
  const broken = s < T.shatter ? 0 : clamp((s - T.shatter + 0.75) / 12);

  // the character: flinch on the blame, then shrinks and greys with the thoughts
  const flinch = sinceBlame < -0.75 ? 0 : Math.exp(-Math.max(0, sinceBlame) / 5) * whip(sinceBlame, 0, 2);
  const sink = inv(T.think2, T.think2 + 60, s);
  const shame = 0.15 * inv(T.blame, T.think1, s) + 0.45 * sink;
  const heart = 1 - 0.35 * inv(T.think1, T.think1 + 30, s) - 0.45 * sink;
  const mood = s < T.slip ? "calm" : s < T.blame ? "worried" : sinceBlame < 9 ? "flinch" : "sad";
  const scale = 1 - 0.18 * sink;

  // bubbles leave when the question arrives
  const leave = fadeOut(s - titleIn, 8);
  const blame = { o: pop(sinceBlame) * leave, k: 0.55 + 0.45 * whip(sinceBlame, 1.4, 9) };
  const jitter = sinceBlame >= 0 && sinceBlame < 14 ? noise1(s * 1.7, 4) * 7 * Math.exp(-sinceBlame / 5) : 0;
  const t1 = { o: pop(s - T.think1) * leave, k: 0.7 + 0.3 * whip(s - T.think1, 0.8, 8) };
  const t2 = { o: pop(s - T.think2) * leave, k: 0.7 + 0.3 * whip(s - T.think2, 0.8, 8) };
  const head = { x: ME.x, y: FLOOR - ME.r * 1.86 * scale };

  return (
    <Station x={ST.hook}>
      <Canvas>
        <Glow id="hook-spot" x={ME.x} y={FLOOR - 40} r={520} color="#5a6aa8" opacity={0.22 - 0.1 * sink} />
        <Floor y={FLOOR + 2} />
        <Blob
          id="hook-me"
          x={ME.x}
          y={FLOOR}
          r={ME.r}
          s={s}
          shame={shame}
          heart={heart}
          mood={mood}
          squash={flinch * 0.16}
          scale={scale}
          look={s < T.slip ? 0.6 : s < T.blame ? 1 : sinceBlame < 9 ? 0 : -0.3}
          arm={s < T.shatter + 10 ? { x: HAND.x, y: HAND.y + (s >= T.slip ? 10 * inv(T.slip, T.slip + 8, s) : 0) } : null}
        />
        <Cup x={cupX} y={cupY} size={CUP} rot={cupRot} broken={broken} />
        {/* thought dots from the head to the bubbles */}
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={head.x - 8 - i * 6} cy={head.y - 18 - i * 26} r={6 + i * 4} fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.28)" strokeWidth={2} opacity={pop(s - T.think1 - i) * leave} />
        ))}
      </Canvas>
      <Bubble
        x={590 + jitter}
        y={-190}
        w={430}
        h={150}
        tail={[-160, 110]}
        fill="#2a1316"
        stroke={C.blame}
        sharp
        opacity={blame.o}
        scale={blame.k}
        rot={-3}
      >
        <Two zh={H.blame.zh} en={H.blame.en} size={52} color="#ffd9d3" enColor="#ff9f94" weight={700} />
      </Bubble>
      <Bubble x={-70} y={-62} w={360} h={112} tail={[-30, 110]} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.32)" strokeWidth={2} opacity={t1.o} scale={t1.k}>
        <Two zh={<Typed text={H.think1.zh} times={TYPE.think1} s={s} />} en={H.think1.en} size={40} enOpacity={pop(s - TYPE.think1[TYPE.think1.length - 1])} />
      </Bubble>
      <Bubble x={-130} y={-226} w={540} h={124} tail={[-40, 70]} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.32)" strokeWidth={2} opacity={t2.o} scale={t2.k}>
        <Two zh={<Typed text={H.think2.zh} times={TYPE.think2} s={s} />} en={H.think2.en} size={42} enOpacity={pop(s - TYPE.think2[TYPE.think2.length - 1])} />
      </Bubble>
      {/* the question */}
      {CONTENT.title.zh.map((line, i) => {
        const t = s - T.title[i];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: -600 + i * 118,
              transform: `translate(-50%, -50%) translateY(${(1 - whip(t, 0.6, 10)) * 26}px)`,
              opacity: pop(t),
              fontFamily: ZH_SERIF,
              fontSize: 84,
              fontWeight: 700,
              color: i === 2 ? "#ffe2c8" : C.ink,
              whiteSpace: "nowrap",
              letterSpacing: 2,
            }}
          >
            {line}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: -600 + 3 * 118 - 4,
          transform: "translate(-50%, -50%)",
          opacity: pop(s - T.titleEn),
          fontFamily: EN,
          fontSize: 30,
          color: C.sub,
          whiteSpace: "nowrap",
        }}
      >
        {CONTENT.title.en}
      </div>
    </Station>
  );
};
