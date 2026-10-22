import { AbsoluteFill, useCurrentFrame } from "remotion";
import { clamp, easeIn, easeInOut, easeOut, inv, lerp } from "../../intro/math";
import { smoothPath } from "../draw";
import { EN, ZH_SANS, ZH_SERIF } from "../fonts";
import { ISLAND, MAINLAND, PLACES, ROUTES } from "../geo";
import { HEIGHT, M, MAP_TEXT, WIDTH } from "../timeline";

// Map projection: equirectangular around Butterworth, K px per degree.
const K = 3600;
const LON0 = 100.37;
const LAT0 = 5.38;
const COS = Math.cos((5.38 * Math.PI) / 180);
const P = ([lon, lat]: [number, number]): [number, number] => [(lon - LON0) * COS * K, -(lat - LAT0) * K];

const ISLAND_D = smoothPath(ISLAND.map(P), true, 0.7);
const MAINLAND_D = smoothPath(MAINLAND.map(P), true, 0.6);
const BW = P(PLACES.butterworth);
const GT = P(PLACES.georgeTown);
const HOME: [number, number] = P([100.25, 5.372]);

type MapCam = { x: number; y: number; z: number };

// Opening: slow push, then dive into the Butterworth dot. Ending: the reverse.
export const mapCam = (f: number): MapCam => {
  if (f < M.irisOut - 30) {
    const push = lerp(1, 1.07, easeInOut(inv(0, M.irisIn, f)));
    const dive = easeIn(inv(M.irisIn - 6, M.irisFull, f));
    return {
      x: lerp(HOME[0], BW[0], easeInOut(inv(M.irisIn - 6, M.irisFull - 10, f))),
      y: lerp(HOME[1], BW[1], easeInOut(inv(M.irisIn - 6, M.irisFull - 10, f))),
      z: Math.exp(lerp(Math.log(push), Math.log(14), dive)),
    };
  }
  const t = easeOut(inv(M.irisOut, M.irisGone + 10, f));
  const tc = easeInOut(inv(M.irisOut + 8, M.irisGone + 16, f));
  return {
    x: lerp(BW[0], HOME[0], tc),
    y: lerp(BW[1], HOME[1], tc),
    z: Math.exp(lerp(Math.log(14), Math.log(1.04), t)),
  };
};

export const toScreen = (c: MapCam, p: [number, number]) => ({
  x: WIDTH / 2 + (p[0] - c.x) * c.z,
  y: HEIGHT / 2 + (p[1] - c.y) * c.z,
});
export const butterworthOnScreen = (f: number) => toScreen(mapCam(f), BW);

// ------------------------------------------------------------------ routes
const routeD = (pts: [number, number][]) => smoothPath(pts.map(P), false, 0.6);
const pathLen = (pts: [number, number][]) => {
  const q = pts.map(P);
  let l = 0;
  for (let i = 1; i < q.length; i++) l += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
  return l * 1.04;
};
// Point at fraction t along a polyline (approximation of the spline).
const along = (pts: [number, number][], t: number): [number, number] => {
  const q = pts.map(P);
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < q.length; i++) {
    const d = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
    seg.push(d);
    total += d;
  }
  let want = clamp(t) * total;
  for (let i = 0; i < seg.length; i++) {
    if (want <= seg[i]) {
      const u = want / seg[i];
      return [lerp(q[i][0], q[i + 1][0], u), lerp(q[i][1], q[i + 1][1], u)];
    }
    want -= seg[i];
  }
  return q[q.length - 1];
};

type Flow = { route: [number, number][]; n: number; period: number; reverse?: boolean };
// Traffic that only passes through: trains in and out, ferries across, cars over the bridges.
const FLOWS: Flow[] = [
  { route: ROUTES.railSouth, n: 3, period: 120 },
  { route: ROUTES.railSouth, n: 2, period: 140, reverse: true },
  { route: ROUTES.railNorth, n: 2, period: 110, reverse: true },
  { route: ROUTES.ferry, n: 2, period: 90 },
  { route: ROUTES.ferry, n: 1, period: 100, reverse: true },
  { route: ROUTES.bridge, n: 4, period: 80 },
  { route: ROUTES.bridge, n: 3, period: 96, reverse: true },
  { route: ROUTES.bridge2, n: 3, period: 130 },
];

// Label pinned to a map point; text stays screen-sized.
const Label: React.FC<{
  at: { x: number; y: number };
  zh: string;
  en?: string;
  dx?: number;
  dy?: number;
  size?: number;
  color?: string;
  align?: "left" | "right" | "center";
  opacity: number;
}> = ({ at, zh, en, dx = 0, dy = 0, size = 26, color = "#2f2a3a", align = "left", opacity }) => (
  <div
    style={{
      position: "absolute",
      left: at.x + dx,
      top: at.y + dy,
      transform: `translate(${align === "left" ? 0 : align === "right" ? -100 : -50}%, -50%)`,
      textAlign: align,
      opacity,
      whiteSpace: "pre",
      color,
    }}
  >
    <div style={{ fontFamily: ZH_SANS, fontWeight: 700, fontSize: size, lineHeight: 1.1 }}>{zh}</div>
    {en && <div style={{ fontFamily: EN, fontWeight: 600, fontSize: size * 0.62, letterSpacing: "0.14em", marginTop: 4, opacity: 0.75 }}>{en}</div>}
  </div>
);

// Two-line serif statement over the sea, left of the island.
const Statement: React.FC<{ zh: string[]; en: string; inF: number; outF: number; big?: boolean }> = ({ zh, en, inF, outF, big }) => {
  const f = useCurrentFrame();
  const out = easeInOut(inv(outF, outF + 12, f));
  if (f < inF - 1 || out >= 1) return null;
  const fs = big ? 112 : 88;
  return (
    <div style={{ position: "absolute", left: 118, top: big ? 330 : 360, color: "#fbf3e2", opacity: 1 - out }}>
      {zh.map((line, i) => {
        const a = easeOut(inv(inF + i * 9, inF + i * 9 + 18, f));
        return (
          <div key={i} style={{ fontFamily: ZH_SERIF, fontWeight: 900, fontSize: fs, lineHeight: 1.22, whiteSpace: "pre", opacity: a, transform: `translateY(${lerp(24, 0, a)}px)` }}>
            {line}
          </div>
        );
      })}
      {(() => {
        const a = easeOut(inv(inF + 22, inF + 38, f));
        return (
          <div style={{ fontFamily: EN, fontWeight: 500, fontSize: big ? 34 : 28, marginTop: 22, opacity: a * 0.85, transform: `translateY(${lerp(16, 0, a)}px)` }}>
            {en}
          </div>
        );
      })()}
    </div>
  );
};

export const MapView: React.FC<{ ending?: boolean }> = ({ ending = false }) => {
  const f = useCurrentFrame();
  const c = mapCam(f);
  const s = (p: [number, number]) => toScreen(c, p);
  // routes draw on in the opening; at the end they are simply there
  const draw = ending ? 1 : easeInOut(inv(M.routesIn, M.routesIn + 50, f));
  // labels fade as the camera dives in (and back in at the end)
  const labels = ending ? easeOut(inv(M.irisGone - 8, M.irisGone + 16, f)) : easeOut(inv(6, 30, f)) * (1 - inv(M.irisIn - 10, M.irisIn + 10, f));
  const sw = 1 / c.z; // keep strokes screen-sized

  // traffic: frozen at the stop; at the end it converges into Butterworth
  const tokens: { p: [number, number]; a: number }[] = [];
  if (!ending) {
    const tf = Math.min(f, M.stop);
    const vis = inv(M.routesIn + 20, M.routesIn + 40, f) * (1 - inv(M.stop + 18, M.stop + 34, f));
    FLOWS.forEach((fl, j) => {
      for (let i = 0; i < fl.n; i++) {
        let t = (((tf + (i / fl.n) * fl.period + j * 17) % fl.period) + fl.period) % fl.period / fl.period;
        if (fl.reverse) t = 1 - t;
        tokens.push({ p: along(fl.route, t), a: vis * Math.sin(Math.PI * t) ** 0.4 });
      }
    });
  } else {
    const vis = inv(M.irisGone, M.irisGone + 12, f);
    const ins: [number, number][][] = [
      ROUTES.railSouth.slice().reverse(),
      ROUTES.ferry.slice().reverse(),
      [...ROUTES.railNorth.slice().reverse(), ...ROUTES.railSouth.slice(0, 3).reverse()],
    ];
    ins.forEach((route, j) => {
      for (let i = 0; i < 4; i++) {
        const period = 70 + j * 10;
        const t = ((f + (i / 4) * period + j * 23) % period) / period;
        tokens.push({ p: along(route, t), a: vis * Math.sin(Math.PI * t) ** 0.5 });
      }
    });
  }

  const pulse = (f % 54) / 54;
  const stopFreeze = !ending && f >= M.stop;
  return (
    <AbsoluteFill style={{ background: "#0e2a3c", overflow: "hidden" }}>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="mapVignette" cx="50%" cy="50%" r="75%">
            <stop offset="60%" stopColor="#000" stopOpacity={0} />
            <stop offset="100%" stopColor="#000" stopOpacity={0.45} />
          </radialGradient>
          <linearGradient id="landFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3e6c8" />
            <stop offset="100%" stopColor="#e6d3ac" />
          </linearGradient>
        </defs>
        <g transform={`translate(${WIDTH / 2},${HEIGHT / 2}) scale(${c.z}) translate(${-c.x},${-c.y})`}>
          {/* graticule */}
          <g stroke="#ffffff" strokeOpacity={0.06} strokeWidth={sw}>
            {new Array(13).fill(0).map((_, i) => {
              const x = P([100.05 + i * 0.05, 5])[0];
              return <line key={`v${i}`} x1={x} y1={-2000} x2={x} y2={2000} />;
            })}
            {new Array(13).fill(0).map((_, i) => {
              const y = P([100, 5.05 + i * 0.05])[1];
              return <line key={`h${i}`} x1={-3000} y1={y} x2={3000} y2={y} />;
            })}
          </g>
          {/* shallow-water halo, then land */}
          <path d={ISLAND_D} fill="none" stroke="#1d4a5e" strokeWidth={26 * sw} strokeLinejoin="round" />
          <path d={MAINLAND_D} fill="none" stroke="#1d4a5e" strokeWidth={26 * sw} strokeLinejoin="round" />
          <path d={ISLAND_D} fill="url(#landFill)" stroke="#cdb487" strokeWidth={2 * sw} />
          <path d={MAINLAND_D} fill="url(#landFill)" stroke="#cdb487" strokeWidth={2 * sw} />
          {/* Penang Hill contours */}
          <clipPath id="islandClip">
            <path d={ISLAND_D} />
          </clipPath>
          <g clipPath="url(#islandClip)">
          {[1, 0.72, 0.46].map((r, i) => {
            const cx = P([100.262, 5.395]);
            const pts: [number, number][] = new Array(9).fill(0).map((_, k) => {
              const a = (k / 9) * Math.PI * 2;
              const w = 1 + 0.18 * Math.sin(a * 3 + i);
              return [cx[0] + Math.cos(a) * 120 * r * w, cx[1] + Math.sin(a) * 170 * r * w];
            });
            return <path key={i} d={smoothPath(pts, true)} fill="#d9c08f" fillOpacity={0.22 + i * 0.1} stroke="#c9ad7a" strokeOpacity={0.5} strokeWidth={1.5 * sw} />;
          })}
          </g>
          {/* routes */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {(["railSouth", "railNorth"] as const).map((k) => {
              const len = pathLen(ROUTES[k]);
              return (
                <g key={k} strokeDasharray={`${len * draw} ${len}`}>
                  <path d={routeD(ROUTES[k])} stroke="#3a3346" strokeWidth={7 * sw} />
                </g>
              );
            })}
            {(["railSouth", "railNorth"] as const).map((k) => (
              <path key={`t${k}`} d={routeD(ROUTES[k])} stroke="#f3e6c8" strokeWidth={3 * sw} strokeDasharray={`${12 * sw} ${12 * sw}`} opacity={draw >= 1 ? 1 : 0} />
            ))}
            {(["bridge", "bridge2"] as const).map((k) => {
              const len = pathLen(ROUTES[k]);
              return <path key={k} d={routeD(ROUTES[k])} stroke="#f6d28a" strokeWidth={6 * sw} strokeDasharray={`${len * draw} ${len}`} />;
            })}
            <path d={routeD(ROUTES.ferry)} stroke="#ffffff" strokeOpacity={0.85} strokeWidth={3 * sw} strokeDasharray={`${10 * sw} ${9 * sw}`} opacity={easeOut(inv(0.5, 1, draw))} />
          </g>
          {/* traffic */}
          {tokens.map((t, i) => (
            <g key={i} opacity={t.a}>
              <circle cx={t.p[0]} cy={t.p[1]} r={12 * sw} fill="#ffd36b" opacity={0.3} />
              <circle cx={t.p[0]} cy={t.p[1]} r={5.5 * sw} fill={stopFreeze ? "#ffffff" : "#ffd36b"} />
            </g>
          ))}
          {/* George Town */}
          <circle cx={GT[0]} cy={GT[1]} r={6 * sw} fill="#3a3346" />
          {/* Butterworth */}
          <g>
            <circle cx={BW[0]} cy={BW[1]} r={(16 + 40 * pulse) * sw} fill="none" stroke="#ffd36b" strokeWidth={3 * sw} opacity={(1 - pulse) * (ending ? 1 : 0.8)} />
            <circle cx={BW[0]} cy={BW[1]} r={11 * sw} fill="#ffd36b" stroke="#ffffff" strokeWidth={3 * sw} />
          </g>
        </g>
        <rect width={WIDTH} height={HEIGHT} fill="url(#mapVignette)" />
      </svg>
      {/* labels */}
      <Label at={s(P([100.255, 5.33]))} zh="槟城岛" en="PENANG ISLAND" align="center" size={30} color="#7a6646" opacity={labels * 0.9} />
      <Label at={s(GT)} zh="乔治市" en="George Town" dx={-18} dy={-6} align="right" size={24} opacity={labels} />
      <Label at={s(BW)} zh="北海" en="Butterworth" dx={24} dy={-46} size={40} opacity={labels} />
      <Label at={s(P([100.43, 5.48]))} zh="威省" en="SEBERANG PERAI" align="center" size={28} color="#7a6646" opacity={labels * 0.85} />
      <Label at={s(P([100.36, 5.355]))} zh="槟威大桥 13.5 km" dy={30} align="center" size={20} color="#f6d28a" opacity={labels * easeOut(inv(0.7, 1, draw))} />
      <Label at={s(P([100.356, 5.262]))} zh="第二大桥 24 km" dy={30} align="center" size={20} color="#f6d28a" opacity={labels * easeOut(inv(0.7, 1, draw))} />
      <Label at={s(P([100.482, 5.2]))} zh="铁路 · 往吉隆坡" en="To Kuala Lumpur" dx={-22} align="right" size={20} color="#3a3346" opacity={labels * easeOut(inv(0.7, 1, draw))} />
      <Label at={s(P([100.364, 5.428]))} zh="渡轮" en="Ferry" align="center" size={20} color="#ffffff" opacity={labels * easeOut(inv(0.7, 1, draw))} />
      <Label at={s(P([100.06, 5.2]))} zh="马六甲海峡" en="STRAIT OF MALACCA" align="center" size={22} color="#6f97a8" opacity={labels * 0.8} />
      {!ending && (
        <>
          <Statement zh={MAP_TEXT.a.zh} en={MAP_TEXT.a.en} inF={M.lineA} outF={M.stop - 6} />
          <Statement zh={MAP_TEXT.b.zh} en={MAP_TEXT.b.en} inF={M.lineB} outF={M.irisIn + 8} />
        </>
      )}
      {ending && <Statement zh={MAP_TEXT.end.zh} en={MAP_TEXT.end.en} inF={M.endA} outF={M.fadeOut + 40} big />}
      {ending && (
        <div
          style={{
            position: "absolute",
            left: 118,
            top: 760,
            fontFamily: EN,
            fontWeight: 600,
            fontSize: 22,
            letterSpacing: "0.3em",
            color: "#ffd36b",
            opacity: easeOut(inv(M.endSmall, M.endSmall + 16, f)),
            whiteSpace: "pre",
          }}
        >
          <span style={{ fontFamily: ZH_SANS, letterSpacing: "0.12em" }}>{MAP_TEXT.endSmall.split("   ")[0]}</span>
          {"   " + MAP_TEXT.endSmall.split("   ")[1]}
        </div>
      )}
    </AbsoluteFill>
  );
};
