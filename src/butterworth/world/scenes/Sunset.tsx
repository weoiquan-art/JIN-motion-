import { useCurrentFrame } from "remotion";
import { easeOut, hash, inv, noise1 } from "../../../intro/math";
import { Gull, Layer, Palm, smoothPath, Svg } from "../../draw";
import { CUES, HEIGHT } from "../../timeline";
import { skyAt } from "../Sky";
import { Skyline } from "./Ferry";

const HORIZON = 652;

// Penang Hill as seen across the strait; the sun sets behind its shoulder.
const HILL: [number, number][] = [
  [-420, 656], [0, 642], [300, 624], [600, 596], [850, 570], [1050, 552], [1190, 540], [1350, 520], [1480, 528],
  [1700, 560], [1900, 600], [2100, 632], [2340, 652],
];
export const HILL_D = `${smoothPath(HILL)} L2340,${HORIZON + 6} L-420,${HORIZON + 6} Z`;

// Penang Bridge: long deck with a cable-stayed main span.
export const Bridge: React.FC<{ x0: number; x1: number; y: number; color: string; lights: number }> = ({ x0, x1, y, color, lights }) => {
  const p1 = x0 + (x1 - x0) * 0.42;
  const p2 = x0 + (x1 - x0) * 0.58;
  return (
    <g>
      <rect x={x0} y={y} width={x1 - x0} height={5} fill={color} />
      {new Array(Math.floor((x1 - x0) / 46)).fill(0).map((_, i) => (
        <rect key={i} x={x0 + i * 46} y={y + 4} width={3} height={10} fill={color} />
      ))}
      {[p1, p2].map((px) => (
        <g key={px}>
          <rect x={px - 3} y={y - 62} width={6} height={66} fill={color} />
          <rect x={px - 9} y={y - 56} width={18} height={3} fill={color} />
          {[1, 2, 3, 4].map((k) => (
            <g key={k} stroke={color} strokeWidth={1.2}>
              <line x1={px} y1={y - 60 + k * 4} x2={px - k * 30} y2={y} />
              <line x1={px} y1={y - 60 + k * 4} x2={px + k * 30} y2={y} />
            </g>
          ))}
        </g>
      ))}
      {lights > 0 &&
        new Array(Math.floor((x1 - x0) / 22)).fill(0).map((_, i) => (
          <circle key={i} cx={x0 + 8 + i * 22} cy={y - 1} r={2.2} fill="#ffe2a0" opacity={lights * (0.7 + 0.3 * Math.sin(i * 1.7))} />
        ))}
    </g>
  );
};

const LampPost: React.FC<{ x: number; on: number }> = ({ x, on }) => (
  <g>
    {on > 0 && <circle cx={x} cy={706} r={70} fill="#ffcf7a" opacity={on * 0.28} />}
    <rect x={x - 5} y={706} width={10} height={180} fill="#1c1428" />
    <path d={`M${x - 20},712 L${x + 20},712 L${x + 12},694 L${x - 12},694 Z`} fill="#1c1428" />
    <circle cx={x} cy={716} r={8} fill={on > 0 ? "#fff0c0" : "#3a2a3a"} opacity={0.4 + on * 0.6} />
  </g>
);

export const Sunset: React.FC = () => {
  const f = useCurrentFrame();
  const sky = skyAt(f);
  const lights = easeOut(inv(CUES.lightsOn, CUES.lightsOn + 30, f));
  return (
    <>
      <Layer k={0.08}>
        <Svg>
          <path d={HILL_D} fill="#4a2a5a" />
          <Skyline x={760} base={HORIZON + 4} s={0.7} color="#3a2148" lights={lights} />
        </Svg>
      </Layer>
      <Layer k={0.15}>
        <Svg>
          <Bridge x0={-420} x1={600} y={HORIZON - 12} color="#3a2148" lights={lights} />
        </Svg>
      </Layer>
      <Layer k={0.35}>
        <Svg>
          <defs>
            <linearGradient id="sunsetSea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff9a5a" />
              <stop offset="30%" stopColor="#b9506e" />
              <stop offset="100%" stopColor="#2e1a4a" />
            </linearGradient>
          </defs>
          <rect x={-400} y={HORIZON} width={2720} height={HEIGHT - HORIZON} fill="url(#sunsetSea)" />
          {new Array(60).fill(0).map((_, i) => {
            const y = HORIZON + 8 + hash(i * 2.3) ** 1.5 * 400;
            const x = -400 + hash(i * 7.9) * 2720 + Math.sin(f * 0.025 + i) * 20;
            return <rect key={i} x={x} y={y} width={30 + (y - HORIZON) * 0.3} height={3} rx={2} fill="#ffc08a" opacity={0.12 + 0.12 * Math.sin(f * 0.06 + i)} />;
          })}
        </Svg>
      </Layer>
      {/* sun glitter road */}
      <Layer k={0}>
        <Svg>
          {new Array(26).fill(0).map((_, i) => {
            const v = i / 25;
            const w = 40 + v * 260;
            const sx = 960 + (sky.sun.x - 960) / 1.03;
            return (
              <rect
                key={i}
                x={sx - w / 2 + noise1(f * 0.12 + i * 3, 6) * (10 + v * 50)}
                y={HORIZON + 4 + v * v * 330}
                width={w}
                height={3 + v * 7}
                rx={3}
                fill="#ffd08a"
                opacity={(0.8 - v * 0.5) * (0.55 + 0.45 * Math.sin(f * 0.22 + i * 1.7))}
              />
            );
          })}
        </Svg>
      </Layer>
      {/* a flock across the sun */}
      <Layer k={0.6}>
        <Svg>
          {new Array(7).fill(0).map((_, i) => (
            <Gull
              key={i}
              x={500 + (i % 4) * 70 + Math.floor(i / 4) * 40 + f * 1.8 - 1296 * 1.8}
              y={300 + (i % 3) * 28 + Math.floor(i / 4) * 36}
              s={13 - (i % 3) * 2}
              color="#2a1838"
              phase={i * 1.3}
            />
          ))}
        </Svg>
      </Layer>
      {/* promenade */}
      <Layer k={1}>
        <Svg>
          <rect x={-400} y={884} width={2720} height={200} fill="#1c1428" />
          <rect x={-400} y={876} width={2720} height={12} fill="#2a1e36" />
          <rect x={-400} y={800} width={2720} height={8} fill="#1c1428" />
          <rect x={-400} y={836} width={2720} height={5} fill="#1c1428" />
          {new Array(48).fill(0).map((_, i) => (
            <rect key={i} x={-400 + i * 58} y={800} width={7} height={80} fill="#1c1428" />
          ))}
          {[300, 1100, 1900].map((x) => (
            <LampPost key={x} x={x} on={lights} />
          ))}
          {/* two people on a bench, facing the sunset */}
          <g fill="#140e1e">
            <rect x={1360} y={836} width={220} height={12} />
            <rect x={1370} y={846} width={10} height={40} />
            <rect x={1560} y={846} width={10} height={40} />
            <rect x={1360} y={792} width={220} height={8} />
            <circle cx={1430} cy={756} r={20} />
            <path d="M1406,840 Q1400,786 1430,776 Q1460,786 1456,840 Z" />
            <circle cx={1500} cy={762} r={18} />
            <path d="M1478,840 Q1472,792 1500,782 Q1528,792 1524,840 Z" />
            <path d="M1452,800 Q1466,792 1480,800" stroke="#140e1e" strokeWidth={8} fill="none" />
          </g>
          <Palm x={2120} y={884} h={420} lean={-0.2} color="#140e1e" seed={51} />
        </Svg>
      </Layer>
    </>
  );
};
