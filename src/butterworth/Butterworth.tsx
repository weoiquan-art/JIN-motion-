import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from "remotion";
import { easeIn, easeInOut, inv, lerp } from "../intro/math";
import { MotionBlur } from "../intro/MotionBlur";
import { panSpeed } from "./camera";
import { DURATION, HEIGHT, M, WIDTH } from "./timeline";
import { butterworthOnScreen, MapView } from "./world/MapView";
import { Strip } from "./world/Strip";
import { Titles } from "./world/Titles";

const FULL = Math.hypot(WIDTH, HEIGHT) / 2 + 40;

// Iris between the map and the day: the Butterworth dot opens into the first
// scene and the last scene closes back into the dot.
const iris = (f: number) => {
  if (f < M.irisFull) {
    const t = easeIn(inv(M.irisIn, M.irisFull, f));
    return { r: t * FULL * 1.05, scale: lerp(1.35, 1, easeInOut(inv(M.irisIn, M.irisFull + 10, f))), ring: 1 - inv(M.irisFull - 8, M.irisFull, f) };
  }
  if (f < M.irisOut) return null;
  const t = easeInOut(inv(M.irisOut, M.irisGone, f));
  return { r: lerp(FULL, 0, t), scale: lerp(1, 0.55, t), ring: inv(M.irisOut, M.irisOut + 6, f) };
};

export const Butterworth: React.FC = () => {
  const f = useCurrentFrame();
  const ir = iris(f);
  const showStrip = f >= M.irisIn && f < M.irisGone;
  const c = butterworthOnScreen(f);
  const samples = panSpeed(f) > 24 ? 6 : 1;
  const fadeIn = inv(0, 14, f);
  const fadeOut = 1 - inv(M.fadeOut, DURATION - 1, f);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e2a3c" }}>
      <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
        {f < M.irisFull && <MapView />}
        {f >= M.irisOut && <MapView ending />}
        {showStrip && (
          <AbsoluteFill
            style={{
              clipPath: ir ? `circle(${ir.r}px at ${c.x}px ${c.y}px)` : undefined,
              transform: ir ? `scale(${ir.scale})` : undefined,
              transformOrigin: `${c.x}px ${c.y}px`,
            }}
          >
            <MotionBlur samples={samples} shutter={0.6}>
              <Strip />
            </MotionBlur>
            <Titles />
          </AbsoluteFill>
        )}
        {showStrip && ir && ir.r > 1 && (
          <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
            <circle cx={c.x} cy={c.y} r={ir.r * ir.scale} fill="none" stroke="#ffd36b" strokeWidth={5} opacity={ir.ring * 0.9} />
          </svg>
        )}
      </AbsoluteFill>
      <Html5Audio src={staticFile("audio/butterworth.wav")} />
    </AbsoluteFill>
  );
};
