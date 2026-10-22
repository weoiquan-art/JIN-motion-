import { useCurrentFrame } from "remotion";
import { hash, inv, lerp, noise1 } from "../../../intro/math";
import { Gull, Layer, ridge, Svg } from "../../draw";
import { HEIGHT, SCENES } from "../../timeline";
import { skyAt } from "../Sky";

const S = SCENES[4];
const HORIZON = 640;
const BOAT_Y = 790;

// George Town across the strait: low town, a few towers, Komtar's cylinder.
export const Skyline: React.FC<{ x: number; base: number; s: number; color: string; lights?: number }> = ({ x, base, s, color, lights = 0 }) => {
  const blocks: [number, number, number][] = [
    [-520, 40, 90], [-430, 70, 60], [-370, 55, 80], [-290, 110, 46], [-240, 60, 90], [-150, 150, 56], [-90, 90, 70],
    [-20, 70, 60], [120, 130, 50], [170, 80, 90], [260, 175, 60], [320, 100, 70], [390, 60, 110], [500, 120, 54], [560, 50, 120],
  ];
  return (
    <g transform={`translate(${x},${base}) scale(${s})`} fill={color}>
      {blocks.map(([bx, h, w], i) => (
        <rect key={i} x={bx} y={-h} width={w} height={h + 4} />
      ))}
      {/* Komtar: tall cylinder with a crown */}
      <rect x={40} y={-300} width={64} height={304} rx={10} />
      <rect x={34} y={-316} width={76} height={22} rx={6} />
      <rect x={70} y={-350} width={4} height={36} />
      {lights > 0 &&
        new Array(70).fill(0).map((_, i) => {
          const b = blocks[i % blocks.length];
          const lx = b[0] + 6 + hash(i * 3.3) * (b[2] - 12);
          const ly = -6 - hash(i * 5.1) * (b[1] - 12);
          return <rect key={i} x={lx} y={ly} width={5} height={4} fill="#ffd98a" opacity={lights * (hash(i * 9.7) > 0.25 ? 1 : 0)} />;
        })}
      {lights > 0 &&
        new Array(14).fill(0).map((_, i) => <rect key={`k${i}`} x={46 + (i % 2) * 34} y={-290 + i * 20} width={18} height={4} fill="#ffd98a" opacity={lights} />)}
    </g>
  );
};

// Penang Hill ridge behind the town.
export const hillPath = (base: number, amp: number) => ridge(-400, 2320, base, amp, 0.0011, 12, base + 6);

const Catamaran: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M-200,0 L190,0 C214,-6 228,-24 232,-44 L-214,-44 Z" fill="#f4f4f0" />
    <rect x={-210} y={-30} width={436} height={10} fill="#2c6fb0" />
    <rect x={-210} y={-18} width={430} height={6} fill="#e8b04a" />
    <path d="M-180,-44 L170,-44 L150,-104 L-150,-104 Z" fill="#ffffff" />
    {new Array(10).fill(0).map((_, i) => (
      <rect key={i} x={-140 + i * 29} y={-92} width={22} height={30} rx={3} fill="#3a5a7a" />
    ))}
    <path d="M-110,-104 L100,-104 L80,-138 L-90,-138 Z" fill="#f4f4f0" />
    {new Array(6).fill(0).map((_, i) => (
      <rect key={i} x={-76 + i * 26} y={-130} width={18} height={20} rx={3} fill="#3a5a7a" />
    ))}
    <rect x={-6} y={-170} width={8} height={34} fill="#5a5a6a" />
    <rect x={-210} y={-2} width={436} height={10} fill="#2a3a4a" opacity={0.6} />
  </g>
);

export const Ferry: React.FC = () => {
  const f = useCurrentFrame();
  const sky = skyAt(f);
  const go = inv(S.from - 20, S.to, f);
  const boatX = lerp(960, 1720, go ** 1.2);
  const bob = Math.sin(f * 0.1) * 3;
  return (
    <>
      <Layer k={0.1}>
        <Svg>
          <path d={hillPath(HORIZON - 6, 210)} fill="#8a6f9a" opacity={0.7} />
          <Skyline x={1240} base={HORIZON + 2} s={0.62} color="#6f5a86" />
        </Svg>
      </Layer>
      <Layer k={0.35}>
        <Svg>
          <defs>
            <linearGradient id="ferrySea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f3b67a" />
              <stop offset="30%" stopColor="#5a8aa0" />
              <stop offset="100%" stopColor="#1f4f6a" />
            </linearGradient>
          </defs>
          <rect x={-400} y={HORIZON} width={2720} height={HEIGHT - HORIZON} fill="url(#ferrySea)" />
          {new Array(70).fill(0).map((_, i) => {
            const y = HORIZON + 8 + hash(i * 2.9) ** 1.4 * 420;
            const x = -400 + hash(i * 8.3) * 2720 + Math.sin(f * 0.025 + i) * 24;
            return <rect key={i} x={x} y={y} width={30 + (y - HORIZON) * 0.3} height={3} rx={2} fill="#ffe2b0" opacity={0.15 + 0.15 * Math.sin(f * 0.06 + i)} />;
          })}
        </Svg>
      </Layer>
      <Layer k={0}>
        <Svg>
          {new Array(22).fill(0).map((_, i) => {
            const v = i / 21;
            const w = 30 + v * 200;
            const sx = 960 + (sky.sun.x - 960) / 1.02;
            return (
              <rect
                key={i}
                x={sx - w / 2 + noise1(f * 0.12 + i * 3, 4) * (10 + v * 40)}
                y={HORIZON + 6 + v * v * 400}
                width={w}
                height={3 + v * 6}
                rx={3}
                fill="#ffe0a0"
                opacity={(0.7 - v * 0.4) * (0.6 + 0.4 * Math.sin(f * 0.2 + i * 1.9))}
              />
            );
          })}
        </Svg>
      </Layer>
      {/* a second ferry far out, a buoy */}
      <Layer k={0.55}>
        <Svg>
          <Catamaran x={lerp(1900, 1700, go)} y={HORIZON + 34} s={0.22} />
          <g transform={`translate(380,${HORIZON + 120 + Math.sin(f * 0.12) * 4})`}>
            <path d="M-16,0 L16,0 L10,-40 L-10,-40 Z" fill="#d9433a" />
            <rect x={-12} y={-24} width={24} height={8} fill="#ffffff" />
          </g>
        </Svg>
      </Layer>
      <Layer k={0.9}>
        <Svg>
          {[0, 1, 2].map((i) => (
            <Gull key={i} x={200 + i * 220 + (f - S.from) * (1.6 + i * 0.3)} y={170 + i * 45 + Math.sin(f * 0.05 + i) * 10} s={24 - i * 3} color="#4a3a52" phase={i * 2} />
          ))}
        </Svg>
      </Layer>
      {/* terminal pier and the departing ferry */}
      <Layer k={1}>
        <Svg>
          <g fill="none" stroke="#e8f4f4" strokeLinecap="round" opacity={0.6}>
            {[0, 1, 2].map((i) => (
              <path key={i} d={`M${boatX - 190 - i * 70},${BOAT_Y - 4 + i * 12} Q${boatX - 310 - i * 120},${BOAT_Y + 4 + i * 22} ${boatX - 470 - i * 180},${BOAT_Y + 18 + i * 38}`} strokeWidth={6 - i * 1.5} />
            ))}
          </g>
          <Catamaran x={boatX} y={BOAT_Y + bob} s={0.86} />
          {/* pier */}
          <rect x={-420} y={760} width={700} height={36} fill="#8a8a92" />
          <rect x={-420} y={796} width={700} height={14} fill="#5a5a66" />
          {new Array(7).fill(0).map((_, i) => (
            <rect key={i} x={-400 + i * 100} y={810} width={18} height={280} fill="#4a4a58" />
          ))}
          {/* terminal building, backlit */}
          <rect x={-420} y={584} width={600} height={176} fill="#7d7590" />
          <path d={`M-440,590 Q-120,520 210,560 L210,584 L-440,600 Z`} fill="#5e5674" />
          {new Array(6).fill(0).map((_, i) => (
            <rect key={i} x={-396 + i * 96} y={612} width={78} height={120} fill="#f2c27a" opacity={0.55} />
          ))}
          {new Array(6).fill(0).map((_, i) => (
            <rect key={i} x={-396 + i * 96} y={612} width={78} height={14} fill="#5e5674" />
          ))}
          {[120, 230].map((x) => (
            <g key={x}>
              <rect x={x} y={738} width={22} height={24} rx={4} fill="#3a3a44" />
              <rect x={x - 4} y={734} width={30} height={8} rx={4} fill="#3a3a44" />
            </g>
          ))}
        </Svg>
      </Layer>
    </>
  );
};
