import { useCurrentFrame } from "remotion";
import { easeOut, hash, inv, noise1 } from "../../../intro/math";
import { Layer, sagPoint, Svg, Wisps } from "../../draw";
import { EN, ZH_SERIF } from "../../fonts";
import { CUES, HEIGHT } from "../../timeline";
import { Skyline } from "./Ferry";
import { Bridge, HILL_D } from "./Sunset";

const HORIZON = 652;
const GROUND = 880;

type Stall = { x: number; w: number; roof: string; sign?: { zh: string; en?: string; color: string }; grill?: boolean };
const STALLS: Stall[] = [
  { x: 260, w: 380, roof: "#3a6ea5", sign: { zh: "海鲜", en: "SEAFOOD", color: "#ffe9a8" } },
  { x: 680, w: 340, roof: "#c8412d", sign: { zh: "沙爹", en: "SATAY", color: "#fff3d0" }, grill: true },
  { x: 1060, w: 360, roof: "#2f8a6a", sign: { zh: "炒粿条", color: "#ffe9a8" } },
  { x: 1460, w: 340, roof: "#e0a23a" },
  { x: 1840, w: 400, roof: "#3a6ea5", sign: { zh: "海鲜", en: "SEAFOOD", color: "#fff3d0" } },
];

const Diner: React.FC<{ x: number; s?: number; seed: number }> = ({ x, s = 1, seed }) => {
  const f = useCurrentFrame();
  const nod = Math.sin(f * 0.08 + seed) * 2;
  return (
    <g transform={`translate(${x},${GROUND + 70}) scale(${s})`} fill="#0f0c1e">
      <circle cx={0} cy={-96 + nod} r={18} />
      <path d="M-24,-10 Q-26,-70 0,-76 Q26,-70 24,-10 Z" />
      <rect x={-22} y={-10} width={44} height={8} />
    </g>
  );
};

export const Night: React.FC = () => {
  const f = useCurrentFrame();
  const on = easeOut(inv(CUES.stallsOn, CUES.stallsOn + 20, f));
  return (
    <>
      <Layer k={0.08}>
        <Svg>
          <path d={HILL_D} fill="#151a3e" />
          <Skyline x={760} base={HORIZON + 4} s={0.7} color="#11163a" lights={1} />
          {new Array(40).fill(0).map((_, i) => (
            <circle key={i} cx={-300 + hash(i * 4.4) * 2500} cy={HORIZON - 4 - hash(i * 2.2) * 30} r={2} fill="#ffd98a" opacity={0.5 + 0.5 * Math.sin(f * 0.1 + i)} />
          ))}
        </Svg>
      </Layer>
      <Layer k={0.15}>
        <Svg>
          <Bridge x0={-420} x1={600} y={HORIZON - 12} color="#1a1f48" lights={1} />
        </Svg>
      </Layer>
      <Layer k={0.35}>
        <Svg>
          <defs>
            <linearGradient id="nightSea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a3670" />
              <stop offset="100%" stopColor="#0b0f2a" />
            </linearGradient>
          </defs>
          <rect x={-400} y={HORIZON} width={2720} height={HEIGHT - HORIZON} fill="url(#nightSea)" />
          {/* lights of the far shore on the water */}
          {new Array(40).fill(0).map((_, i) => {
            const x = -300 + hash(i * 4.4) * 2500;
            return <rect key={i} x={x - 2} y={HORIZON + 4 + hash(i * 1.3) * 20} width={4} height={18 + hash(i) * 30} fill="#ffd98a" opacity={0.18 + 0.15 * Math.sin(f * 0.15 + i)} />;
          })}
        </Svg>
      </Layer>
      {/* moon road */}
      <Layer k={0}>
        <Svg>
          {new Array(18).fill(0).map((_, i) => {
            const v = i / 17;
            const w = 24 + v * 120;
            return <rect key={i} x={1500 - w / 2 + noise1(f * 0.1 + i * 3, 8) * (8 + v * 26)} y={HORIZON + 6 + v * v * 200} width={w} height={2 + v * 4} rx={2} fill="#e6ecff" opacity={(0.55 - v * 0.35) * (0.6 + 0.4 * Math.sin(f * 0.2 + i))} />;
          })}
        </Svg>
      </Layer>
      {/* stalls */}
      <Layer k={0.75}>
        <Svg>
          <defs>
            <linearGradient id="stallGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd9a0" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#c0703a" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <rect x={-400} y={GROUND - 10} width={2720} height={220} fill="#1a1630" />
          {STALLS.map((s, i) => (
            <g key={i}>
              {/* warm pool of light */}
              <ellipse cx={s.x + s.w / 2} cy={GROUND + 10} rx={s.w * 0.75} ry={60} fill="#ffb35c" opacity={0.25 * on} />
              <rect x={s.x + 10} y={560} width={8} height={GROUND - 560} fill="#2a2440" />
              <rect x={s.x + s.w - 18} y={560} width={8} height={GROUND - 560} fill="#2a2440" />
              <path d={`M${s.x - 30},580 L${s.x + s.w + 30},580 L${s.x + s.w},530 L${s.x},530 Z`} fill={s.roof} />
              <path d={`M${s.x - 30},580 L${s.x + s.w + 30},580 L${s.x + s.w + 30},592 L${s.x - 30},592 Z`} fill="#000" opacity={0.3} />
              {/* inside glow and counter */}
              <rect x={s.x + 18} y={592} width={s.w - 36} height={GROUND - 690} fill="#2a2036" />
              <rect x={s.x + 18} y={592} width={s.w - 36} height={GROUND - 690} fill="url(#stallGlow)" opacity={0.2 + 0.8 * on} />
              {/* shelf with jars, and the cook */}
              <rect x={s.x + 40} y={650} width={s.w - 80} height={6} fill="#5a3a2a" />
              {new Array(Math.floor((s.w - 90) / 34)).fill(0).map((_, k) => (
                <rect key={k} x={s.x + 48 + k * 34} y={624} width={20} height={26} rx={4} fill={["#e8b04a", "#c8412d", "#6fae6a"][k % 3]} opacity={0.85} />
              ))}
              {i % 2 === 0 && (
                <g fill="#1c1428">
                  <circle cx={s.x + s.w * 0.62} cy={700} r={20} />
                  <path d={`M${s.x + s.w * 0.62 - 34},${GROUND - 98} Q${s.x + s.w * 0.62 - 30},${724} ${s.x + s.w * 0.62},${720} Q${s.x + s.w * 0.62 + 30},${724} ${s.x + s.w * 0.62 + 34},${GROUND - 98} Z`} />
                  <rect x={s.x + s.w * 0.62 - 18} y={672} width={36} height={12} rx={6} fill="#f4f0e6" />
                </g>
              )}
              <rect x={s.x + 18} y={GROUND - 100} width={s.w - 36} height={100} fill="#5a3a2a" />
              <rect x={s.x + 18} y={GROUND - 100} width={s.w - 36} height={12} fill="#7a5a3a" />
              {/* bulbs under the roof edge */}
              {new Array(Math.floor(s.w / 40)).fill(0).map((_, k) => (
                <g key={k}>
                  <circle cx={s.x + 20 + k * 40} cy={600} r={14} fill="#ffcf7a" opacity={0.25 * on} />
                  <circle cx={s.x + 20 + k * 40} cy={600} r={5} fill={on > 0.5 ? "#fff3d0" : "#6a5a4a"} />
                </g>
              ))}
              {s.sign && (
                <g>
                  <rect x={s.x + s.w / 2 - 110} y={462} width={220} height={66} rx={8} fill="#1f1a2a" stroke={s.sign.color} strokeWidth={3} opacity={0.95} />
                  <rect x={s.x + s.w / 2 - 110} y={462} width={220} height={66} rx={8} fill={s.sign.color} opacity={0.12 * on} />
                  <text
                    x={s.x + s.w / 2}
                    y={s.sign.en ? 498 : 508}
                    textAnchor="middle"
                    fontFamily={ZH_SERIF}
                    fontWeight={900}
                    fontSize={s.sign.en ? 30 : 38}
                    fill={s.sign.color}
                    opacity={0.35 + 0.65 * on}
                    letterSpacing="0.2em"
                  >
                    {s.sign.zh}
                  </text>
                  {s.sign.en && (
                    <text x={s.x + s.w / 2} y={520} textAnchor="middle" fontFamily={EN} fontWeight={700} fontSize={15} letterSpacing="0.3em" fill={s.sign.color} opacity={0.35 + 0.65 * on}>
                      {s.sign.en}
                    </text>
                  )}
                </g>
              )}
              {s.grill && (
                <g>
                  <rect x={s.x + 60} y={GROUND - 130} width={200} height={30} fill="#3a2a2a" />
                  <rect x={s.x + 66} y={GROUND - 128} width={188} height={10} fill="#ff6a2a" opacity={0.6 + 0.4 * Math.sin(f * 0.5)} />
                  {new Array(9).fill(0).map((_, k) => (
                    <line key={k} x1={s.x + 74 + k * 20} y1={GROUND - 132} x2={s.x + 64 + k * 20} y2={GROUND - 160} stroke="#c98a5a" strokeWidth={4} />
                  ))}
                  <Wisps x={s.x + 160} y={GROUND - 150} h={330} n={5} color="#cfc4d8" width={10} seed={61} drift={-0.2} />
                </g>
              )}
            </g>
          ))}
          {/* tables and diners */}
          {[440, 860, 1250, 1640, 2040].map((x, i) => (
            <g key={x}>
              <Diner x={x - 60} seed={i} s={0.95} />
              <Diner x={x + 64} seed={i + 3} />
              <rect x={x - 70} y={GROUND + 40} width={140} height={10} fill="#e8e4ea" opacity={0.85} />
              <rect x={x - 4} y={GROUND + 50} width={8} height={60} fill="#3a3448" />
            </g>
          ))}
        </Svg>
      </Layer>
      {/* foreground bulb garland */}
      <Layer k={1.15}>
        <Svg>
          <defs>
            <radialGradient id="bulbGlow">
              <stop offset="0%" stopColor="#ffd27a" stopOpacity={0.75} />
              <stop offset="45%" stopColor="#ffb35c" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#ffb35c" stopOpacity={0} />
            </radialGradient>
          </defs>
          <path d={`M-400,40 Q960,${40 + 260} 2320,60`} stroke="#1a1426" strokeWidth={3} fill="none" />
          {new Array(26).fill(0).map((_, i) => {
            const p = sagPoint(-400, 40, 2320, 60, 130, (i + 0.5) / 26);
            const flick = 0.85 + 0.15 * Math.sin(f * 0.3 + i * 2.1);
            return (
              <g key={i}>
                <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + 8} stroke="#1a1426" strokeWidth={3} />
                <circle cx={p.x} cy={p.y + 16} r={48} fill="url(#bulbGlow)" opacity={on * flick} />
                <circle cx={p.x} cy={p.y + 16} r={8} fill={on > 0.5 ? "#fff6dc" : "#5a4a3a"} />
              </g>
            );
          })}
        </Svg>
      </Layer>
    </>
  );
};
