import { useCurrentFrame } from "remotion";
import { easeInOut, hash, inv, lerp, springAt } from "../../../intro/math";
import { Layer, Svg, Wisps } from "../../draw";
import { EN, ZH_SANS, ZH_SERIF } from "../../fonts";
import { DISHES, SCENES, titleOut } from "../../timeline";

const S = SCENES[1];
const GROUND = 850;

const FACADES = ["#a8d8c8", "#f3d27a", "#f6b38e", "#9cc7ea", "#f2a7a0", "#f4e4c1", "#b9d98f", "#f3d27a"];
const SHUTTERS = ["#2f7d6b", "#3a6ea5", "#2f7d6b", "#9a4a3a", "#3a6ea5", "#2f7d6b", "#7a4a8a", "#3a6ea5"];
const SIGNS: (string | null)[] = [null, "茶室", null, "咖啡", "KOPITIAM", null, "茶室", null];

// Pre-war shophouse: upper floor with shuttered windows, five-foot way below.
const Shophouse: React.FC<{ i: number }> = ({ i }) => {
  const x = -400 + i * 340;
  const w = 340;
  const c = FACADES[i % FACADES.length];
  const sh = SHUTTERS[i % SHUTTERS.length];
  const arched = i % 3 !== 1;
  const sign = SIGNS[i % SIGNS.length];
  return (
    <g>
      {/* roof + parapet */}
      <rect x={x - 4} y={226} width={w + 8} height={26} fill="#c66a4a" />
      {new Array(12).fill(0).map((_, k) => (
        <line key={k} x1={x + k * 30} x2={x + k * 30} y1={226} y2={252} stroke="#a2543a" strokeWidth={3} />
      ))}
      <rect x={x} y={250} width={w} height={350} fill={c} />
      <rect x={x} y={250} width={w} height={34} fill="#ffffff" opacity={0.35} />
      {i % 2 === 0 && <path d={`M${x + w / 2 - 70},250 Q${x + w / 2},196 ${x + w / 2 + 70},250 Z`} fill={c} />}
      {/* windows */}
      {[0, 1, 2].map((k) => {
        const wx = x + 52 + k * 92;
        return (
          <g key={k}>
            <rect x={wx - 6} y={318} width={68} height={176} fill="#ffffff" opacity={0.7} />
            {arched && <path d={`M${wx - 6},322 A34,34 0 0 1 ${wx + 62},322 Z`} fill="#ffffff" opacity={0.7} />}
            <rect x={wx} y={324} width={56} height={164} fill={sh} />
            {new Array(9).fill(0).map((_, n) => (
              <line key={n} x1={wx + 3} x2={wx + 53} y1={336 + n * 17} y2={336 + n * 17} stroke="#000" strokeOpacity={0.18} strokeWidth={3} />
            ))}
            <line x1={wx + 28} x2={wx + 28} y1={324} y2={488} stroke="#000" strokeOpacity={0.25} strokeWidth={2} />
          </g>
        );
      })}
      {/* pilasters */}
      <rect x={x} y={250} width={16} height={350} fill="#ffffff" opacity={0.45} />
      <rect x={x + w - 16} y={250} width={16} height={350} fill="#000" opacity={0.06} />
      <rect x={x - 4} y={580} width={w + 8} height={22} fill="#fbf6ea" />
      {/* five-foot way */}
      <rect x={x} y={602} width={w} height={GROUND - 602} fill="#4a3a3a" />
      <rect x={x + 30} y={640} width={w - 60} height={GROUND - 640} fill="#f4c27a" opacity={0.75} />
      <rect x={x + 30} y={640} width={w - 60} height={GROUND - 640} fill="#000" opacity={0.18} />
      <rect x={x + w / 2 - 50} y={700} width={100} height={GROUND - 700} fill="#3a2a2a" opacity={0.5} />
      <circle cx={x + w / 2} cy={670} r={9} fill="#fff1c0" />
      <rect x={x - 6} y={602} width={30} height={GROUND - 602} fill={c} />
      <rect x={x + w - 24} y={602} width={30} height={GROUND - 602} fill={c} />
      <rect x={x - 6} y={602} width={30} height={GROUND - 602} fill="#000" opacity={0.12} />
      {sign && (
        <g>
          <rect x={x + 60} y={604} width={w - 120} height={44} rx={3} fill={sign === "KOPITIAM" ? "#c8412d" : "#2b2622"} />
          <text
            x={x + w / 2}
            y={636}
            textAnchor="middle"
            fill="#f2c96b"
            fontFamily={sign === "KOPITIAM" ? EN : ZH_SERIF}
            fontWeight={900}
            fontSize={sign === "KOPITIAM" ? 24 : 30}
            letterSpacing={sign === "KOPITIAM" ? "0.18em" : "0.5em"}
          >
            {sign}
          </text>
        </g>
      )}
    </g>
  );
};

// Top-down dishes.
const Noodles: React.FC<{ cx: number; cy: number; r: number; color: string; seed: number; wide?: boolean }> = ({ cx, cy, r, color, seed, wide }) => (
  <g fill="none" stroke={color} strokeWidth={wide ? 9 : 4} strokeLinecap="round" opacity={0.95}>
    {new Array(wide ? 7 : 12).fill(0).map((_, i) => {
      const a = hash(seed + i) * Math.PI * 2;
      const rr = r * (0.2 + hash(seed * 3 + i) * 0.55);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      const l = r * 0.5;
      return <path key={i} d={`M${x - l / 2},${y} q${l / 4},${-l / 5} ${l / 2},0 t${l / 2},0`} transform={`rotate(${hash(seed * 7 + i) * 180},${x},${y})`} />;
    })}
  </g>
);

const Dish: React.FC<{ kind: number }> = ({ kind }) => {
  const R = 96;
  if (kind === 3) {
    // nasi kandar: rice flooded with curries, fried chicken, egg, okra
    return (
      <g>
        <circle r={R} fill="#ffffff" />
        <circle r={R - 10} fill="#f2ede4" />
        <path d="M-60,-10 Q-50,-62 4,-58 Q58,-50 56,4 Q40,56 -10,52 Q-58,40 -60,-10 Z" fill="#fbf6ea" />
        <path d="M-20,-6 Q10,-30 52,-6 Q56,40 0,46 Q-40,44 -30,14 Z" fill="#c9652a" opacity={0.85} />
        <path d="M-58,-30 Q-40,-50 -10,-40 Q-20,-14 -50,-6 Z" fill="#8a4a1e" opacity={0.85} />
        <path d="M8,-50 C40,-58 60,-30 44,-14 C30,-2 4,-16 0,-30 Z" fill="#a9561f" />
        <path d="M14,-44 C34,-48 46,-32 38,-22" fill="none" stroke="#7a3a14" strokeWidth={4} />
        <ellipse cx={-30} cy={30} rx={20} ry={16} fill="#ffffff" />
        <circle cx={-28} cy={30} r={8} fill="#f2b33a" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${18 + i * 12},${18 + i * 6} l18,-6 l2,6 z`} fill="#5f9a3a" />
        ))}
      </g>
    );
  }
  const broth = ["#f1d9a6", "#e0672f", "#5a3a22"][kind];
  return (
    <g>
      <circle r={R} fill="#ffffff" />
      <circle r={R} fill="none" stroke="#3a6ea5" strokeWidth={6} strokeDasharray="6 10" opacity={0.5} />
      <circle r={R - 14} fill={broth} />
      {kind === 1 && <circle r={R - 14} fill="#ffb347" opacity={0.25} />}
      <Noodles cx={0} cy={0} r={R - 20} color={kind === 0 ? "#fbf6ea" : "#f2c84a"} seed={kind * 11 + 3} wide={kind === 0} />
      {kind === 0 && (
        <g>
          {[[-30, -24], [26, -30], [8, 26], [-34, 22]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={11} fill="#fffdf4" stroke="#e8e0cc" strokeWidth={2} />
          ))}
          {[[30, 10], [-6, -40]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx={14} ry={8} fill="#f6c6b6" stroke="#e08a76" strokeWidth={3} />
          ))}
        </g>
      )}
      {kind === 1 && (
        <g>
          {[[-30, -20], [24, 24]].map(([x, y], i) => (
            <rect key={i} x={x - 12} y={y - 12} width={24} height={24} rx={5} fill="#c98a3a" transform={`rotate(${i * 30},${x},${y})`} />
          ))}
          {[[20, -30], [-24, 30], [36, 0]].map(([x, y], i) => (
            <path key={i} d={`M${x - 10},${y} a10,10 0 1 1 14,9`} fill="none" stroke="#f08a6a" strokeWidth={7} strokeLinecap="round" />
          ))}
          {[[-8, 4], [4, 12], [-14, 16]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx={7} ry={5} fill="#5a3a3a" />
          ))}
          <circle cx={0} cy={-6} r={9} fill="#9a1f1f" />
        </g>
      )}
      {kind === 2 && (
        <g>
          <ellipse cx={-22} cy={-18} rx={22} ry={18} fill="#ffffff" />
          <circle cx={-22} cy={-18} r={10} fill="#f2a12a" />
          {[[22, 14], [6, 30]].map(([x, y], i) => (
            <rect key={i} x={x - 18} y={y - 9} width={36} height={18} rx={4} fill="#9a5a3a" transform={`rotate(${-20 + i * 30},${x},${y})`} />
          ))}
          <circle cx={30} cy={-22} r={9} fill="#d9342a" />
        </g>
      )}
      {new Array(10).fill(0).map((_, i) => (
        <circle key={i} cx={Math.cos(i * 2.4) * (20 + i * 5)} cy={Math.sin(i * 2.4) * (20 + i * 5)} r={3} fill={i % 2 ? "#5fa84a" : "#8a5a2a"} />
      ))}
    </g>
  );
};

const FoodCards: React.FC = () => {
  const f = useCurrentFrame();
  const out = easeInOut(inv(titleOut(S), titleOut(S) + 12, f));
  return (
    <g>
      {DISHES.map((d, i) => {
        const t = f - d.f;
        if (t < 0) return null;
        const s = springAt(t, 260, 15) * (1 - out);
        const x = 860 + i * 250;
        const y = 380 + (i % 2) * 36;
        return (
          <g key={d.zh} transform={`translate(${x},${y}) scale(${s}) rotate(${lerp(-25, 0, Math.min(1, s))})`} opacity={Math.min(1, t / 3)}>
            <circle r={112} cy={10} fill="#000" opacity={0.18} />
            <Dish kind={i} />
            <Wisps x={0} y={-60} h={110} n={3} color="#ffffff" width={7} seed={i * 5 + 1} />
            <g transform="translate(0,140)">
              <rect x={-94} y={-30} width={188} height={68} rx={34} fill="#fffaf0" />
              <text y={2} textAnchor="middle" fontFamily={ZH_SANS} fontWeight={800} fontSize={28} fill="#2b2230">
                {d.zh}
              </text>
              <text y={28} textAnchor="middle" fontFamily={EN} fontWeight={600} fontSize={16} letterSpacing="0.06em" fill="#8a6a4a">
                {d.en}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
};

const Stool: React.FC<{ x: number; color: string }> = ({ x, color }) => (
  <g fill={color}>
    <ellipse cx={x} cy={GROUND + 92} rx={34} ry={9} />
    <path d={`M${x - 30},${GROUND + 94} L${x - 36},${GROUND + 150} L${x + 36},${GROUND + 150} L${x + 30},${GROUND + 94} Z`} />
    <rect x={x - 20} y={GROUND + 110} width={40} height={22} fill="#000" opacity={0.15} />
  </g>
);

const Table: React.FC<{ x: number }> = ({ x }) => (
  <g>
    <rect x={x - 6} y={GROUND + 56} width={12} height={100} fill="#4a4a4a" />
    <ellipse cx={x} cy={GROUND + 152} rx={40} ry={8} fill="#4a4a4a" />
    <ellipse cx={x} cy={GROUND + 52} rx={86} ry={18} fill="#f4f2ec" />
    <ellipse cx={x} cy={GROUND + 58} rx={86} ry={18} fill="#d8d4c8" opacity={0.6} />
    <ellipse cx={x - 30} cy={GROUND + 44} rx={20} ry={7} fill="#ffffff" stroke="#3a6ea5" strokeWidth={3} />
    <rect x={x + 20} y={GROUND + 18} width={18} height={26} rx={4} fill="#c98a3a" opacity={0.9} />
  </g>
);

export const Food: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Layer k={0.25}>
        <Svg>
          {[[-300, 120, 150], [-80, 180, 120], [300, 90, 170], [700, 160, 110], [1100, 110, 160], [1500, 200, 130], [1900, 130, 150], [2200, 170, 120]].map(([x, h, w], i) => (
            <g key={i}>
              <rect x={x} y={250 - h} width={w} height={h + 40} fill={i % 2 ? "#bcd3e2" : "#c9dce8"} />
              {new Array(Math.floor(h / 30)).fill(0).map((_, k) => (
                <rect key={k} x={x + 14} y={262 - h + k * 30} width={w - 28} height={8} fill="#ffffff" opacity={0.35} />
              ))}
            </g>
          ))}
          {[[-200, 1.1], [520, 1.3], [1320, 1.0], [2050, 1.2]].map(([x, s], i) => (
            <g key={i} fill="#7fb38c">
              <circle cx={x} cy={230} r={60 * s} />
              <circle cx={x + 60 * s} cy={240} r={48 * s} />
              <circle cx={x - 56 * s} cy={246} r={44 * s} />
            </g>
          ))}
        </Svg>
      </Layer>
      <Layer k={0.7}>
        <Svg>
          {new Array(8).fill(0).map((_, i) => (
            <Shophouse key={i} i={i} />
          ))}
          <rect x={-400} y={GROUND - 4} width={2720} height={30} fill="#d8cfbf" />
        </Svg>
      </Layer>
      <Layer k={1}>
        <Svg>
          <rect x={-400} y={GROUND + 20} width={2720} height={260} fill="#7a7d86" />
          <rect x={-400} y={GROUND + 20} width={2720} height={12} fill="#5f626b" />
          {new Array(14).fill(0).map((_, i) => (
            <rect key={i} x={-380 + i * 220} y={GROUND + 196} width={110} height={8} fill="#f4f0e6" opacity={0.7} />
          ))}
          {/* tables and stools */}
          <Table x={1600} />
          <Stool x={1500} color="#d9433a" />
          <Stool x={1700} color="#3a7fc4" />
          {/* hawker cart */}
          <g transform="translate(-170,0)">
            <path d="M1180,560 L1500,560 L1480,520 L1200,520 Z" fill="#ffffff" />
            {new Array(7).fill(0).map((_, i) => (
              <path key={i} d={`M${1200 + i * 40},520 L${1240 + i * 40},520 L${1226 + i * 46},560 L${1180 + i * 46},560 Z`} fill={i % 2 ? "#ffffff" : "#d9433a"} />
            ))}
            <rect x={1196} y={560} width={6} height={160} fill="#6a5a4a" />
            <rect x={1478} y={560} width={6} height={160} fill="#6a5a4a" />
            <rect x={1190} y={720} width={300} height={130} fill="#b5703c" />
            <rect x={1190} y={720} width={300} height={16} fill="#8a4f24" />
            <rect x={1210} y={650} width={150} height={70} fill="#cfe8f0" opacity={0.75} stroke="#8a4f24" strokeWidth={4} />
            {new Array(5).fill(0).map((_, i) => (
              <rect key={i} x={1222 + i * 26} y={690} width={18} height={26} rx={3} fill={i % 2 ? "#f2c84a" : "#fbf6ea"} />
            ))}
            <rect x={1384} y={672} width={84} height={48} rx={8} fill="#c0c4c8" />
            <ellipse cx={1426} cy={672} rx={42} ry={9} fill="#9aa0a6" />
            <Wisps x={1426} y={660} h={200} n={4} color="#ffffff" width={9} seed={21} drift={0.1} />
            <text x={1340} y={800} textAnchor="middle" fontFamily={ZH_SERIF} fontWeight={900} fontSize={40} fill="#fff2c8" letterSpacing="0.2em">
              粿条汤
            </text>
            {[1230, 1450].map((wx) => (
              <g key={wx}>
                <circle cx={wx} cy={866} r={34} fill="#2b2b2b" />
                <circle cx={wx} cy={866} r={14} fill="#9aa0a6" />
              </g>
            ))}
          </g>
          {/* scooter */}
          <g transform="translate(1960,0)">
            <circle cx={-70} cy={GROUND + 120} r={34} fill="#2b2b2b" />
            <circle cx={80} cy={GROUND + 120} r={34} fill="#2b2b2b" />
            <path d={`M-90,${GROUND + 100} Q-60,${GROUND + 30} 0,${GROUND + 40} L60,${GROUND + 40} Q90,${GROUND + 60} 100,${GROUND + 110} L-90,${GROUND + 110} Z`} fill="#4fa3a5" />
            <rect x={-40} y={GROUND + 26} width={90} height={18} rx={9} fill="#2b2b2b" />
            <path d={`M70,${GROUND + 40} L96,${GROUND - 40}`} stroke="#3a3a3a" strokeWidth={8} />
            <rect x={80} y={GROUND - 48} width={40} height={10} rx={5} fill="#3a3a3a" />
          </g>
          {/* a cat on the stool, tail flicking */}
          <g transform={`translate(1700,${GROUND + 54})`}>
            <ellipse cx={0} cy={16} rx={30} ry={20} fill="#e89a4a" />
            <circle cx={-24} cy={-4} r={16} fill="#e89a4a" />
            <path d="M-36,-14 L-34,-30 L-24,-18 Z M-20,-18 L-14,-30 L-10,-14 Z" fill="#e89a4a" />
            <path d={`M28,22 Q${52 + Math.sin(f * 0.15) * 10},${10} ${44 + Math.sin(f * 0.15) * 14},${-14}`} fill="none" stroke="#e89a4a" strokeWidth={8} strokeLinecap="round" />
          </g>
        </Svg>
      </Layer>
      <Layer k={0}>
        <Svg>
          <FoodCards />
        </Svg>
      </Layer>
    </>
  );
};
