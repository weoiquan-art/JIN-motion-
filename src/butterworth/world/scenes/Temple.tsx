import { useCurrentFrame } from "remotion";
import { hash, noise1 } from "../../../intro/math";
import { Layer, sagPoint, Svg, Wisps } from "../../draw";
import { ZH_SERIF } from "../../fonts";

const GROUND = 830;
const CX = 1060; // hall centre

// Upturned "swallowtail" roof between x0 and x1.
const Roof: React.FC<{ x0: number; x1: number; y: number; h: number; tile: string; ridge: string }> = ({ x0, x1, y, h, tile, ridge }) => {
  const m = (x0 + x1) / 2;
  const w = x1 - x0;
  return (
    <g>
      {/* roof face: eaves curl up at both ends, flat main ridge on top */}
      <path
        d={`M${x0 - 46},${y - 40} Q${x0 + w * 0.05},${y + 8} ${x0 + w * 0.14},${y - h * 0.1} L${x0 + w * 0.22},${y - h} L${x1 - w * 0.22},${y - h} L${x1 - w * 0.14},${y - h * 0.1} Q${x1 - w * 0.05},${y + 8} ${x1 + 46},${y - 40} L${x1 + 10},${y + 10} L${x0 - 10},${y + 10} Z`}
        fill={tile}
      />
      {new Array(Math.floor(w / 26)).fill(0).map((_, i) => {
        const x = x0 + 13 + i * 26;
        const top = m + (x - m) * 0.56;
        return <line key={i} x1={x} y1={y + 6} x2={top} y2={y - h + 4} stroke="#000" strokeOpacity={0.12} strokeWidth={3} />;
      })}
      {/* main ridge with swallowtail ends */}
      <rect x={x0 + w * 0.2} y={y - h - 16} width={w * 0.6} height={18} rx={4} fill={ridge} />
      <path d={`M${x1 - w * 0.2},${y - h - 16} Q${x1 - w * 0.13},${y - h - 18} ${x1 - w * 0.1},${y - h - 58} Q${x1 - w * 0.15},${y - h - 30} ${x1 - w * 0.2},${y - h + 2} Z`} fill={ridge} />
      <path d={`M${x0 + w * 0.2},${y - h - 16} Q${x0 + w * 0.13},${y - h - 18} ${x0 + w * 0.1},${y - h - 58} Q${x0 + w * 0.15},${y - h - 30} ${x0 + w * 0.2},${y - h + 2} Z`} fill={ridge} />
      <rect x={x0 + 10} y={y + 6} width={w - 20} height={14} fill="#e8b04a" />
    </g>
  );
};

const Lantern: React.FC<{ x: number; y: number; s: number; swing: number }> = ({ x, y, s, swing }) => (
  <g transform={`translate(${x},${y}) rotate(${swing}) scale(${s})`}>
    <line x1={0} y1={-26} x2={0} y2={-6} stroke="#3a2a2a" strokeWidth={3} />
    <rect x={-12} y={-8} width={24} height={8} fill="#e8b04a" />
    <ellipse cx={0} cy={28} rx={30} ry={34} fill="#e0362a" />
    <ellipse cx={-8} cy={22} rx={10} ry={22} fill="#ff6a50" opacity={0.6} />
    <rect x={-12} y={58} width={24} height={8} fill="#e8b04a" />
    <path d="M-6,66 L-8,92 M0,66 L0,96 M6,66 L8,92" stroke="#e8b04a" strokeWidth={3} />
  </g>
);

export const Temple: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Layer k={0.3}>
        <Svg>
          {new Array(10).fill(0).map((_, i) => {
            const x = -380 + i * 290;
            const r = 70 + hash(i * 3.1) * 50;
            return (
              <g key={i} fill={i % 2 ? "#6f9a6a" : "#7fa878"}>
                <circle cx={x} cy={GROUND - 260} r={r} />
                <circle cx={x + r * 0.8} cy={GROUND - 240} r={r * 0.8} />
                <rect x={x - 10} y={GROUND - 260} width={20} height={200} fill="#5a4a3a" />
              </g>
            );
          })}
        </Svg>
      </Layer>
      <Layer k={0.65}>
        <Svg>
          {/* side wings */}
          {[-1, 1].map((d) => (
            <g key={d}>
              <rect x={CX + d * 620 - 190} y={520} width={380} height={GROUND - 520} fill="#f3e3c3" />
              <rect x={CX + d * 620 - 190} y={600} width={380} height={GROUND - 600} fill="#c8412d" opacity={0.9} />
              {[0, 1, 2].map((k) => (
                <rect key={k} x={CX + d * 620 - 150 + k * 110} y={640} width={70} height={110} rx={35} fill="#7a1f1a" />
              ))}
              <Roof x0={CX + d * 620 - 210} x1={CX + d * 620 + 210} y={520} h={90} tile="#2f8a6a" ridge="#e0a23a" />
            </g>
          ))}
          {/* main hall */}
          <rect x={CX - 420} y={GROUND - 20} width={840} height={40} fill="#d9cdb8" />
          <rect x={CX - 470} y={GROUND + 10} width={940} height={30} fill="#cbbfa8" />
          <rect x={CX - 380} y={470} width={760} height={GROUND - 490} fill="#f6e9cf" />
          <rect x={CX - 380} y={470} width={760} height={50} fill="#2f5f8a" />
          {new Array(12).fill(0).map((_, i) => (
            <rect key={i} x={CX - 372 + i * 63} y={478} width={50} height={34} fill={i % 2 ? "#e8b04a" : "#3f8a6a"} opacity={0.85} />
          ))}
          {/* columns */}
          {[-330, -200, 200, 330].map((dx) => (
            <g key={dx}>
              <rect x={CX + dx - 18} y={520} width={36} height={GROUND - 540} fill="#c8412d" />
              <rect x={CX + dx - 18} y={520} width={12} height={GROUND - 540} fill="#e0624a" />
              <rect x={CX + dx - 24} y={GROUND - 40} width={48} height={20} fill="#9a8a72" />
            </g>
          ))}
          {/* doors and the name board */}
          <rect x={CX - 150} y={590} width={300} height={GROUND - 610} fill="#a3251c" />
          <line x1={CX} y1={590} x2={CX} y2={GROUND - 20} stroke="#6a1510" strokeWidth={4} />
          {new Array(5).fill(0).map((_, r) =>
            new Array(8).fill(0).map((__, c) => (
              <circle key={`${r}-${c}`} cx={CX - 128 + c * (c < 4 ? 32 : 32) + (c >= 4 ? 16 : 0)} cy={620 + r * 40} r={5} fill="#e8b04a" />
            )),
          )}
          <rect x={CX - 130} y={532} width={260} height={52} rx={4} fill="#1f1a1a" stroke="#e8b04a" strokeWidth={5} />
          <text x={CX} y={571} textAnchor="middle" fontFamily={ZH_SERIF} fontWeight={900} fontSize={36} fill="#f2c96b" letterSpacing="0.4em">
            斗母宫
          </text>
          <Roof x0={CX - 460} x1={CX + 460} y={470} h={170} tile="#e07a2a" ridge="#e0a23a" />
          {/* pearl between two ridge dragons (stylised) */}
          <g>
            <circle cx={CX} cy={250} r={22} fill="#ff6a3a" />
            <circle cx={CX} cy={250} r={36} fill="#ffb347" opacity={0.35 + 0.15 * Math.sin(f * 0.12)} />
            {[-1, 1].map((d) => (
              <path
                key={d}
                d={`M${CX + d * 46},276 q${d * 30},-50 ${d * 70},-18 t${d * 70},-8 t${d * 56},18`}
                stroke="#3f8a6a"
                strokeWidth={14}
                fill="none"
                strokeLinecap="round"
              />
            ))}
          </g>
        </Svg>
      </Layer>
      {/* courtyard: incense urn and sticks */}
      <Layer k={0.9}>
        <Svg>
          <rect x={-400} y={GROUND + 30} width={2720} height={260} fill="#d8c8a8" />
          {new Array(20).fill(0).map((_, i) => (
            <line key={i} x1={-400 + i * 150} y1={GROUND + 30} x2={-400 + i * 150 - 80} y2={1080} stroke="#c2b08e" strokeWidth={3} />
          ))}
          <g transform={`translate(${CX + 150},${GROUND + 110})`}>
            <path d="M-120,-40 L120,-40 L100,60 L-100,60 Z" fill="#7a5a2a" />
            <rect x={-136} y={-56} width={272} height={20} rx={6} fill="#9a7a3a" />
            <path d="M-100,60 L-110,96 M100,60 L110,96 M0,60 L0,96" stroke="#5a4020" strokeWidth={14} />
            <circle cx={-136} cy={-20} r={16} fill="none" stroke="#9a7a3a" strokeWidth={8} />
            <circle cx={136} cy={-20} r={16} fill="none" stroke="#9a7a3a" strokeWidth={8} />
            {new Array(9).fill(0).map((_, i) => (
              <g key={i}>
                <line x1={-60 + i * 15} y1={-56} x2={-62 + i * 15} y2={-120 - (i % 3) * 10} stroke="#c8412d" strokeWidth={4} />
                <circle cx={-62 + i * 15} cy={-120 - (i % 3) * 10} r={3} fill="#ff8a3a" />
              </g>
            ))}
          </g>
          <Wisps x={CX + 150} y={GROUND - 20} h={420} n={5} color="#ffffff" width={8} seed={41} drift={0.25} />
        </Svg>
      </Layer>
      {/* foreground: strings of red lanterns */}
      <Layer k={1.2}>
        <Svg>
          {[
            { x0: -400, y0: 20, x1: 2320, y1: 40, sag: 150, n: 11, s: 1.25 },
            { x0: -400, y0: -40, x1: 2320, y1: -20, sag: 110, n: 9, s: 0.9 },
          ].map((row, r) => (
            <g key={r}>
              <path d={`M${row.x0},${row.y0} Q${(row.x0 + row.x1) / 2},${(row.y0 + row.y1) / 2 + row.sag * 2} ${row.x1},${row.y1}`} stroke="#3a2a2a" strokeWidth={3} fill="none" />
              {new Array(row.n).fill(0).map((_, i) => {
                const t = (i + 0.5) / row.n;
                const p = sagPoint(row.x0, row.y0, row.x1, row.y1, row.sag, t);
                const swing = noise1(f * 0.03 + i * 0.7 + r, 5) * 6;
                return <Lantern key={i} x={p.x} y={p.y + 26} s={row.s} swing={swing} />;
              })}
            </g>
          ))}
        </Svg>
      </Layer>
    </>
  );
};
