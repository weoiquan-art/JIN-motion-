import { useCurrentFrame } from "remotion";
import { hash } from "../../../intro/math";
import { Layer, Palm, sagPoint, Svg } from "../../draw";

const WALL_TOP = 210;
const WALL_BOTTOM = 860;

// Mural panels painted straight onto the back-lane wall (local history:
// paddy fields, coconut and sugar cane plantations, fishing).
const Paddy: React.FC<{ x: number; w: number }> = ({ x, w }) => (
  <g>
    <rect x={x} y={300} width={w} height={420} fill="#9fd0e6" />
    <path d={`M${x},470 Q${x + w * 0.3},380 ${x + w * 0.55},440 T${x + w},420 L${x + w},720 L${x},720 Z`} fill="#7aa6b8" />
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={i} d={`M${x},${500 + i * 46} Q${x + w / 2},${480 + i * 46} ${x + w},${506 + i * 44} L${x + w},${720} L${x},${720} Z`} fill={["#a9cf5a", "#8fbf4a", "#7aac3e", "#9ac850", "#6f9e38"][i]} />
    ))}
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
      <path key={i} d={`M${x + 30 + i * (w / 8)},${640} l-6,-26 m6,26 l0,-30 m0,30 l6,-26`} stroke="#4f7a2a" strokeWidth={3} fill="none" />
    ))}
    {/* farmer with a caping hat, bending */}
    <g transform={`translate(${x + w * 0.62},560)`}>
      <path d="M-34,-40 L0,-62 L34,-40 Z" fill="#e8c77a" />
      <path d="M-10,-40 Q-30,-10 -20,30 L14,30 Q20,-6 10,-40 Z" fill="#3a6ea5" />
      <path d="M-20,30 L-24,70 M10,30 L14,70" stroke="#3a2a2a" strokeWidth={8} />
      <path d="M-12,-10 Q-40,20 -46,36" stroke="#c98a5a" strokeWidth={7} fill="none" strokeLinecap="round" />
    </g>
  </g>
);

const Coconut: React.FC<{ x: number; w: number }> = ({ x, w }) => (
  <g>
    <rect x={x} y={300} width={w} height={420} fill="#f6b56b" />
    <circle cx={x + w * 0.7} cy={420} r={60} fill="#fff0c0" opacity={0.9} />
    <rect x={x} y={600} width={w} height={120} fill="#d9894a" />
    <Palm x={x + 90} y={700} h={330} lean={0.1} color="#5a3a2a" seed={31} />
    <Palm x={x + 260} y={704} h={260} lean={-0.12} color="#6a442e" seed={33} />
    <Palm x={x + w - 110} y={700} h={300} lean={0.16} color="#5a3a2a" seed={35} />
  </g>
);

const Cane: React.FC<{ x: number; w: number }> = ({ x, w }) => (
  <g>
    <rect x={x} y={300} width={w} height={420} fill="#e8f0c8" />
    {new Array(11).fill(0).map((_, i) => {
      const cx = x + 26 + i * ((w - 52) / 10);
      const top = 340 + hash(i * 3.7) * 60;
      return (
        <g key={i}>
          <rect x={cx - 7} y={top} width={14} height={720 - top} fill={i % 2 ? "#7a9a3a" : "#8aa84a"} />
          {new Array(6).fill(0).map((_, k) => (
            <rect key={k} x={cx - 8} y={top + 30 + k * 56} width={16} height={5} fill="#5a7a2a" />
          ))}
          <path d={`M${cx},${top} q-40,-10 -64,26 M${cx},${top} q40,-14 60,20 M${cx},${top + 10} q-30,10 -50,52`} stroke="#5f8f2f" strokeWidth={6} fill="none" strokeLinecap="round" />
        </g>
      );
    })}
  </g>
);

const Fishing: React.FC<{ x: number; w: number }> = ({ x, w }) => (
  <g>
    <rect x={x} y={300} width={w} height={420} fill="#8fd0d6" />
    <rect x={x} y={480} width={w} height={240} fill="#2f8fa5" />
    {[0, 1, 2, 3].map((i) => (
      <path key={i} d={`M${x},${520 + i * 50} q30,-14 60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0`} stroke="#bfe8ec" strokeWidth={4} fill="none" opacity={0.6} />
    ))}
    <path d={`M${x + 120},470 L${x + 420},470 L${x + 380},510 L${x + 150},510 Z`} fill="#c8412d" />
    <rect x={x + 150} y={470} width={230} height={10} fill="#f4efe6" />
    <line x1={x + 270} y1={470} x2={x + 270} y2={360} stroke="#3a2a2a" strokeWidth={6} />
    <path d={`M${x + 274},366 L${x + 360},440 L${x + 274},440 Z`} fill="#f4efe6" />
    {/* the big fish */}
    <g transform={`translate(${x + w * 0.62},620)`}>
      <path d="M-90,0 Q-30,-56 60,-6 L110,-40 L100,0 L110,40 L60,6 Q-30,56 -90,0 Z" fill="#f2c84a" />
      <circle cx={-56} cy={-6} r={8} fill="#2b2230" />
      <path d="M-20,-30 Q0,-10 -20,30" stroke="#d9a02a" strokeWidth={5} fill="none" />
    </g>
    <path d={`M${x + 40},560 Q${x + 140},700 ${x + 260},600`} stroke="#f4efe6" strokeWidth={3} fill="none" strokeDasharray="8 8" />
  </g>
);

export const Art: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {/* rooftops and water tanks behind the lane */}
      <Layer k={0.35}>
        <Svg>
          {new Array(9).fill(0).map((_, i) => {
            const x = -400 + i * 320;
            const h = 60 + hash(i * 2.2) * 50;
            return (
              <g key={i}>
                <path d={`M${x},${WALL_TOP + 20} L${x + 40},${WALL_TOP - h} L${x + 280},${WALL_TOP - h} L${x + 320},${WALL_TOP + 20} Z`} fill={i % 2 ? "#c66a4a" : "#b85c40"} />
                {i % 3 === 0 && (
                  <g>
                    <rect x={x + 120} y={WALL_TOP - h - 64} width={70} height={64} rx={6} fill="#3a7fc4" />
                    <rect x={x + 120} y={WALL_TOP - h - 64} width={70} height={10} fill="#2f6aa8" />
                  </g>
                )}
                {i % 3 === 1 && <line x1={x + 200} y1={WALL_TOP - h} x2={x + 200} y2={WALL_TOP - h - 90} stroke="#5a5a6a" strokeWidth={4} />}
              </g>
            );
          })}
          <circle cx={1500} cy={120} r={90} fill="#6fae6a" />
          <circle cx={1580} cy={150} r={70} fill="#5fa060" />
        </Svg>
      </Layer>
      {/* the wall */}
      <Layer k={1}>
        <Svg>
          <rect x={-400} y={WALL_TOP} width={2720} height={WALL_BOTTOM - WALL_TOP} fill="#efe2c6" />
          <rect x={-400} y={WALL_TOP - 14} width={2720} height={22} fill="#d9c9a6" />
          {new Array(24).fill(0).map((_, i) => (
            <ellipse
              key={i}
              cx={-400 + hash(i * 4.1) * 2720}
              cy={WALL_TOP + 60 + hash(i * 6.3) * 560}
              rx={30 + hash(i) * 90}
              ry={12 + hash(i * 2) * 40}
              fill="#c9b48a"
              opacity={0.18}
            />
          ))}
          <Paddy x={-330} w={620} />
          <Coconut x={360} w={560} />
          <Cane x={990} w={520} />
          <Fishing x={1580} w={700} />
          {/* weathering over the paint */}
          <rect x={-400} y={WALL_TOP} width={2720} height={WALL_BOTTOM - WALL_TOP} fill="#efe2c6" opacity={0.12} />
          {/* pipes, a window, a meter box */}
          <rect x={318} y={WALL_TOP} width={16} height={WALL_BOTTOM - WALL_TOP} fill="#9a9a9a" />
          <rect x={312} y={WALL_TOP + 140} width={28} height={10} fill="#7a7a7a" />
          <rect x={1534} y={WALL_TOP} width={16} height={WALL_BOTTOM - WALL_TOP} fill="#9a9a9a" />
          <rect x={940} y={250} width={34} height={46} fill="#5a6a7a" />
          {/* drain, ground, plants, bicycle */}
          <rect x={-400} y={WALL_BOTTOM} width={2720} height={40} fill="#8a8678" />
          <rect x={-400} y={WALL_BOTTOM + 40} width={2720} height={200} fill="#b9b3a2" />
          {new Array(30).fill(0).map((_, i) => (
            <rect key={i} x={-400 + i * 92} y={WALL_BOTTOM + 6} width={6} height={28} fill="#6a6658" />
          ))}
          {[1110, 1960].map((x, i) => (
            <g key={x}>
              <path d={`M${x - 34},${WALL_BOTTOM + 20} L${x + 34},${WALL_BOTTOM + 20} L${x + 26},${WALL_BOTTOM + 80} L${x - 26},${WALL_BOTTOM + 80} Z`} fill="#c66a4a" />
              {[0, 1, 2, 3, 4].map((k) => (
                <path key={k} d={`M${x},${WALL_BOTTOM + 22} q${-40 + k * 20},-60 ${-50 + k * 25},-${90 + (k % 2) * 30}`} stroke={i % 2 ? "#4f8f3a" : "#3f7f3a"} strokeWidth={10} fill="none" strokeLinecap="round" />
              ))}
            </g>
          ))}
          <g transform={`translate(1390,${WALL_BOTTOM + 8})`} fill="none" stroke="#2b5f8a" strokeWidth={7} strokeLinecap="round">
            <circle cx={-80} cy={0} r={52} stroke="#2b2b2b" strokeWidth={8} />
            <circle cx={80} cy={0} r={52} stroke="#2b2b2b" strokeWidth={8} />
            <path d="M-80,0 L-20,-70 L60,-70 L80,0 M-20,-70 L0,0 L60,-70 M-80,0 L0,0" />
            <path d="M-30,-86 L-6,-86 M60,-70 L54,-100 L80,-104" />
          </g>
        </Svg>
      </Layer>
      {/* overhead cables with a few birds */}
      <Layer k={1.25}>
        <Svg>
          {[[-400, 40, 2320, 70, 60], [-400, 90, 2320, 60, 80]].map(([x0, y0, x1, y1, sag], i) => (
            <path key={i} d={`M${x0},${y0} Q${(x0 + x1) / 2},${(y0 + y1) / 2 + sag * 2} ${x1},${y1}`} stroke="#2b2b33" strokeWidth={4} fill="none" />
          ))}
          {[0.32, 0.36, 0.7].map((t, i) => {
            const p = sagPoint(-400, 90, 2320, 60, 80, t);
            const hop = Math.max(0, Math.sin(f * 0.2 + i * 2)) * (i === 1 ? 6 : 0);
            return (
              <g key={i} transform={`translate(${p.x},${p.y - hop})`} fill="#2b2b33">
                <ellipse cx={0} cy={-12} rx={13} ry={10} />
                <circle cx={10} cy={-22} r={7} />
                <path d="M16,-22 l8,2 l-8,2 Z" fill="#e8a33a" />
                <path d="M-12,-10 l-12,6 l2,-8 Z" />
              </g>
            );
          })}
        </Svg>
      </Layer>
    </>
  );
};
