import { useCurrentFrame } from "remotion";
import { hash, inv, lerp, noise1 } from "../../../intro/math";
import { Gull, Layer, Palm, ridge, Svg } from "../../draw";
import { HEIGHT, SCENES } from "../../timeline";
import { skyAt } from "../Sky";

const S = SCENES[0];
const HORIZON = 620;

// Stilt house of the fishing kampung, backlit by the low sun.
const StiltHouse: React.FC<{ x: number; w: number; h: number; floor: number; wall: string; roof: string; lit: number }> = ({ x, w, h, floor, wall, roof, lit }) => {
  const legs = Math.max(3, Math.round(w / 60));
  return (
    <g>
      {new Array(legs + 1).fill(0).map((_, i) => (
        <rect key={i} x={x + (i / legs) * (w - 8)} y={floor} width={7} height={HORIZON + 110 - floor} fill="#3b2a3e" />
      ))}
      <rect x={x - 14} y={floor - 6} width={w + 28} height={10} fill="#4a3346" />
      <rect x={x} y={floor - h} width={w} height={h} fill={wall} />
      {new Array(Math.floor(h / 14)).fill(0).map((_, i) => (
        <line key={i} x1={x} x2={x + w} y1={floor - h + 14 * (i + 1)} y2={floor - h + 14 * (i + 1)} stroke="#000" strokeOpacity={0.08} strokeWidth={2} />
      ))}
      <path d={`M${x - 26},${floor - h + 6} L${x + w / 2},${floor - h - w * 0.36} L${x + w + 26},${floor - h + 6} Z`} fill={roof} />
      <rect x={x + w * 0.2} y={floor - h * 0.7} width={w * 0.18} height={h * 0.36} fill="#ffcf7a" opacity={lit} />
      <rect x={x + w * 0.58} y={floor - h * 0.7} width={w * 0.18} height={h * 0.36} fill="#ffcf7a" opacity={lit * 0.8} />
    </g>
  );
};

// Malay fishing boat with an upswept bow, heading left.
const Boat: React.FC<{ x: number; y: number; s: number; hull: string; stripe: string; cabin?: boolean; man?: boolean }> = ({ x, y, s, hull, stripe, cabin = true, man = true }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M-170,-40 C-150,-10 -120,8 -60,12 L150,12 C170,6 180,-10 184,-30 L-150,-30 C-160,-34 -166,-40 -170,-40 Z" fill={hull} />
    <path d="M-158,-30 L184,-30 L182,-20 L-140,-20 Z" fill={stripe} />
    <path d="M-150,-14 L176,-14 L172,-8 L-128,-8 Z" fill="#f4efe6" opacity={0.9} />
    <path d="M-176,-58 L-168,-38 L-160,-38 Z" fill={hull} />
    {cabin && (
      <g>
        <rect x={60} y={-84} width={92} height={54} fill="#f2e7d6" />
        <rect x={72} y={-74} width={26} height={20} fill="#6db5c9" />
        <rect x={110} y={-74} width={26} height={20} fill="#6db5c9" />
        <path d="M50,-84 L162,-84 L156,-96 L56,-96 Z" fill="#c8412d" />
        <line x1={100} y1={-96} x2={100} y2={-150} stroke="#3b2a3e" strokeWidth={4} />
        <path d="M100,-150 L132,-142 L100,-134 Z" fill="#c8412d" />
      </g>
    )}
    {man && (
      <g fill="#2f2236">
        <circle cx={-60} cy={-80} r={11} />
        <path d="M-74,-30 L-70,-68 L-50,-68 L-46,-30 Z" />
        <path d="M-80,-86 L-40,-86 L-60,-98 Z" />
      </g>
    )}
  </g>
);

export const Dawn: React.FC = () => {
  const f = useCurrentFrame();
  const sky = skyAt(f);
  const t = inv(S.from - 30, S.to, f);
  // the boat glides in towards the jetty
  const boatX = lerp(1960, 1180, Math.min(1, inv(S.from - 40, S.to - 20, f)) ** 0.8);
  const bob = (p: number) => Math.sin(f * 0.11 + p) * 4;
  const lit = 0.9 - 0.4 * t;
  return (
    <>
      {/* far shore, hazy */}
      <Layer k={0.12}>
        <Svg>
          <path d={ridge(-400, 2320, HORIZON + 2, 130, 0.0016, 4, HORIZON + 2)} fill="#a27a9c" />
          <path d={ridge(-400, 2320, HORIZON + 2, 70, 0.0024, 9, HORIZON + 2)} fill="#866a94" />
        </Svg>
      </Layer>
      {/* sea */}
      <Layer k={0.4}>
        <Svg>
          <defs>
            <linearGradient id="dawnSea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f2a887" />
              <stop offset="25%" stopColor="#b77d98" />
              <stop offset="100%" stopColor="#3f3f78" />
            </linearGradient>
          </defs>
          <rect x={-400} y={HORIZON} width={2720} height={HEIGHT - HORIZON} fill="url(#dawnSea)" />
          {new Array(60).fill(0).map((_, i) => {
            const y = HORIZON + 10 + hash(i * 3.3) ** 1.5 * 440;
            const x = -400 + hash(i * 9.1) * 2720 + Math.sin(f * 0.03 + i) * 20;
            const w = 30 + (y - HORIZON) * 0.25;
            return <rect key={i} x={x} y={y} width={w} height={2 + (y - HORIZON) / 160} rx={2} fill="#ffd9c0" opacity={0.18 + 0.18 * Math.sin(f * 0.07 + i * 1.7)} />;
          })}
        </Svg>
      </Layer>
      {/* sun glitter, stays under the sun */}
      <Layer k={0}>
        <Svg>
          {new Array(26).fill(0).map((_, i) => {
            const v = i / 25;
            const y = HORIZON + 6 + v * v * 420;
            const w = 26 + v * 160;
            const jitter = noise1(f * 0.15 + i * 3, 2) * (8 + v * 30);
            const sx = 960 + (sky.sun.x - 960) / 1.02;
            return <rect key={i} x={sx - w / 2 + jitter} y={y} width={w} height={3 + v * 6} rx={3} fill="#ffe6b8" opacity={(0.75 - v * 0.45) * (0.6 + 0.4 * Math.sin(f * 0.2 + i * 2.1))} />;
          })}
        </Svg>
      </Layer>
      {/* kampung on stilts, palms behind */}
      <Layer k={0.5}>
        <Svg>
          <Palm x={-170} y={HORIZON + 30} h={330} lean={0.12} color="#3e2c4a" seed={2} />
          <Palm x={120} y={HORIZON + 24} h={280} lean={-0.16} color="#3a2a46" seed={5} />
          <Palm x={520} y={HORIZON + 26} h={360} lean={0.2} color="#3e2c4a" seed={8} />
          <StiltHouse x={-330} w={250} h={130} floor={HORIZON + 18} wall="#6b4a5c" roof="#4a3048" lit={lit} />
          <StiltHouse x={-20} w={200} h={110} floor={HORIZON + 28} wall="#755062" roof="#523650" lit={lit * 0.9} />
          <StiltHouse x={260} w={230} h={124} floor={HORIZON + 20} wall="#6e4c60" roof="#4a3048" lit={lit} />
          {/* reflections */}
          <g opacity={0.22} transform={`translate(0,${2 * (HORIZON + 110)}) scale(1,-1)`}>
            <rect x={-360} y={HORIZON - 120} width={880} height={110} fill="#3b2a3e" />
          </g>
          <Boat x={900} y={HORIZON + 70 + bob(1)} s={0.42} hull="#2f6f8f" stripe="#e8b04a" man={false} />
          <Boat x={640} y={HORIZON + 96 + bob(2.4)} s={0.5} hull="#8f3b3b" stripe="#f2e7d6" man={false} />
        </Svg>
      </Layer>
      {/* gulls */}
      <Layer k={0.85}>
        <Svg>
          {[0, 1, 2, 3].map((i) => (
            <Gull key={i} x={200 + i * 230 + f * (1.6 + i * 0.3) - S.from * 1.6} y={250 + i * 36 + Math.sin(f * 0.04 + i) * 14} s={20 - i * 2} color="#3b2a45" phase={i * 1.7} />
          ))}
        </Svg>
      </Layer>
      {/* jetty and the boat coming in */}
      <Layer k={1}>
        <Svg>
          {/* wake */}
          <g fill="none" stroke="#ffe8d4" strokeLinecap="round" opacity={0.55}>
            {[0, 1, 2].map((i) => (
              <path key={i} d={`M${boatX + 60 + i * 110},${HORIZON + 286 + i * 14} Q${boatX + 140 + i * 150},${HORIZON + 300 + i * 24} ${boatX + 300 + i * 200},${HORIZON + 312 + i * 40}`} strokeWidth={5 - i} />
            ))}
          </g>
          <Boat x={boatX} y={HORIZON + 300 + bob(0)} s={1.05} hull="#2c5f8a" stripe="#d9433a" />
          {/* jetty */}
          {new Array(10).fill(0).map((_, i) => (
            <rect key={i} x={-380 + i * 110} y={862} width={16} height={240} fill="#3a2838" />
          ))}
          <rect x={-420} y={846} width={1180} height={26} fill="#5a3f4c" />
          {new Array(24).fill(0).map((_, i) => (
            <line key={i} x1={-420 + i * 50} x2={-420 + i * 50} y1={846} y2={872} stroke="#2e2030" strokeWidth={2} opacity={0.5} />
          ))}
          <rect x={740} y={812} width={20} height={300} fill="#3a2838" />
          <circle cx={622} cy={832} r={16} fill="#e8b04a" />
          <circle cx={660} cy={834} r={14} fill="#d9433a" />
        </Svg>
      </Layer>
      {/* foreground fronds */}
      <Layer k={1.3}>
        <Svg>
          <g fill="#241a33">
            {[0, 1, 2, 3, 4].map((i) => {
              const sway = Math.sin(f * 0.04 + i) * 10;
              const x0 = 2000 + i * 60;
              return <path key={i} d={`M${x0 + 300},-40 Q${x0 - 40 - i * 40},${20 + i * 30 + sway} ${x0 - 220 - i * 70},${150 + i * 50 + sway} Q${x0 - 20 - i * 30},${60 + i * 30 + sway} ${x0 + 300},${10 + i * 14} Z`} />;
            })}
          </g>
        </Svg>
      </Layer>
    </>
  );
};
