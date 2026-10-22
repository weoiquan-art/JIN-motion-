import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeInOut, hash, inv, lerp } from "../../intro/math";
import { camX } from "../camera";
import { mixHex } from "../draw";
import { HEIGHT, PAN_LEAD, PAN_TAIL, SCENES, type Sky, SKIES, WIDTH } from "../timeline";

const lerpSky = (a: Sky, b: Sky, t: number): Sky => ({
  top: mixHex(a.top, b.top, t),
  mid: mixHex(a.mid, b.mid, t),
  low: mixHex(a.low, b.low, t),
  sun: {
    x: lerp(a.sun.x, b.sun.x, t),
    y: lerp(a.sun.y, b.sun.y, t),
    r: lerp(a.sun.r, b.sun.r, t),
    color: mixHex(a.sun.color, b.sun.color, t),
    glow: mixHex(a.sun.glow, b.sun.glow, t),
    a: lerp(a.sun.a, b.sun.a, t),
  },
  moon: lerp(a.moon, b.moon, t),
  stars: lerp(a.stars, b.stars, t),
});

// Sky at frame f: each scene eases from its first to its second sky while it
// holds, and the whip pans blend into the next scene's sky.
export const skyAt = (f: number): Sky => {
  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i];
    const [a, b] = SKIES[s.id];
    const holdFrom = i === 0 ? s.from : s.from + PAN_TAIL;
    const holdTo = i === SCENES.length - 1 ? s.to : s.to - PAN_LEAD;
    if (f < holdFrom && i > 0) {
      const prev = SKIES[SCENES[i - 1].id][1];
      return lerpSky(prev, a, easeInOut(inv(SCENES[i - 1].to - PAN_LEAD, holdFrom, f)));
    }
    if (f <= holdTo || i === SCENES.length - 1) return lerpSky(a, b, easeInOut(inv(holdFrom, holdTo, f)));
  }
  return SKIES.night[1];
};

const STARS = new Array(90).fill(0).map((_, i) => ({
  x: hash(i * 3.1) * WIDTH,
  y: hash(i * 7.7) ** 1.6 * HEIGHT * 0.6,
  r: 0.8 + hash(i * 1.9) * 1.8,
  tw: hash(i * 5.3) * 10,
}));

const CLOUDS = [
  { x: 260, y: 150, s: 1.2 },
  { x: 900, y: 90, s: 0.8 },
  { x: 1500, y: 210, s: 1.0 },
  { x: 2200, y: 130, s: 1.3 },
  { x: 2900, y: 190, s: 0.9 },
];
const cloudPath = (x: number, y: number, s: number) =>
  `M${x - 150 * s},${y + 22 * s} Q${x - 150 * s},${y - 6 * s} ${x - 100 * s},${y - 4 * s} Q${x - 86 * s},${y - 46 * s} ${x - 34 * s},${y - 40 * s} Q${x - 4 * s},${y - 78 * s} ${x + 46 * s},${y - 48 * s} Q${x + 96 * s},${y - 56 * s} ${x + 108 * s},${y - 10 * s} Q${x + 160 * s},${y - 6 * s} ${x + 160 * s},${y + 22 * s} Z`;

export const SkyLayer: React.FC = () => {
  const f = useCurrentFrame();
  const s = skyAt(f);
  // clouds drift with time and slide a little with the whip pans
  const cloudShift = -camX(f) * 0.06 - f * 0.4;
  const cloudA = (1 - s.stars) * 0.85;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${s.top} 0%, ${s.mid} 52%, ${s.low} 78%, ${s.low} 100%)` }}>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="sunGlow">
            <stop offset="0%" stopColor={s.sun.glow} stopOpacity={0.85} />
            <stop offset="35%" stopColor={s.sun.glow} stopOpacity={0.3} />
            <stop offset="100%" stopColor={s.sun.glow} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="moonGlow">
            <stop offset="0%" stopColor="#dfe6ff" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#dfe6ff" stopOpacity={0} />
          </radialGradient>
        </defs>
        {s.stars > 0.01 &&
          STARS.map((st, i) => (
            <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#ffffff" opacity={s.stars * (0.45 + 0.55 * Math.abs(Math.sin(f * 0.06 + st.tw)))} />
          ))}
        {s.sun.a > 0.01 && (
          <g opacity={s.sun.a}>
            <circle cx={s.sun.x} cy={s.sun.y} r={s.sun.r * 5.5} fill="url(#sunGlow)" />
            <circle cx={s.sun.x} cy={s.sun.y} r={s.sun.r} fill={s.sun.color} />
          </g>
        )}
        {s.moon > 0.01 && (
          <g opacity={s.moon}>
            <circle cx={1500} cy={300} r={170} fill="url(#moonGlow)" />
            <circle cx={1500} cy={300} r={46} fill="#f4f1e2" />
            <circle cx={1484} cy={288} r={9} fill="#e3dcc4" />
            <circle cx={1516} cy={314} r={6} fill="#e3dcc4" />
            <circle cx={1510} cy={282} r={4} fill="#e3dcc4" />
          </g>
        )}
        {cloudA > 0.01 && (
          <g opacity={cloudA}>
            {CLOUDS.map((c, i) => {
              const span = 3400;
              const x = ((((c.x + cloudShift) % span) + span) % span) - 400;
              return <path key={i} d={cloudPath(x, c.y, c.s)} fill={mixHex("#ffffff", s.low, 0.35)} opacity={0.55} />;
            })}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};
