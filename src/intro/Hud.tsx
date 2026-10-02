import { useCurrentFrame } from "remotion";
import type { Cam } from "./camera";
import { FONT } from "./fonts";
import { clamp, inv } from "./math";
import { RED } from "./theme";
import { HEIGHT, T, timecode, WIDTH } from "./timeline";

// Dot grid that belongs to the world: drawn in screen space from the camera
// so it pans, zooms and rotates with everything else at no extra cost.
export const Grid: React.FC<{ cam: Cam }> = ({ cam }) => {
  const step = 90 * cam.z;
  const size = 3200;
  const ox = (((size / 2 - cam.x * cam.z) % step) + step) % step;
  const oy = (((size / 2 - cam.y * cam.z) % step) + step) % step;
  const dot = clamp(1.3 * cam.z, 0.9, 3.2);
  return (
    <div
      style={{
        position: "absolute",
        left: WIDTH / 2 - size / 2 + cam.sx,
        top: HEIGHT / 2 - size / 2 + cam.sy,
        width: size,
        height: size,
        transform: `rotate(${cam.r + cam.sr}deg)`,
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.09) ${dot}px, transparent ${dot + 0.7}px)`,
        backgroundSize: `${step}px ${step}px`,
        backgroundPosition: `${ox - step / 2}px ${oy - step / 2}px`,
      }}
    />
  );
};

// Viewfinder overlay during the chaos: REC dot, running timecode, corners.
export const Hud: React.FC = () => {
  const f = useCurrentFrame();
  const opacity = inv(T.chaos - 2, T.chaos + 4, f) * (1 - inv(T.brake - 3, T.brake + 3, f));
  if (opacity <= 0) return null;
  const blink = Math.floor(f / 8) % 3 !== 2;
  const inset = 44;
  const len = 56;
  const corner = (h: "left" | "right", v: "top" | "bottom") => (
    <div
      key={h + v}
      style={{
        position: "absolute",
        [h]: inset,
        [v]: inset,
        width: len,
        height: len,
        [`border${v === "top" ? "Top" : "Bottom"}`]: "3px solid rgba(255,255,255,0.45)",
        [`border${h === "left" ? "Left" : "Right"}`]: "3px solid rgba(255,255,255,0.45)",
      }}
    />
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      {corner("left", "top")}
      {corner("right", "top")}
      {corner("left", "bottom")}
      {corner("right", "bottom")}
      <div
        style={{
          position: "absolute",
          left: inset + 30,
          top: inset + 24,
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontFamily: FONT,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <div style={{ width: 18, height: 18, borderRadius: 9, background: RED, opacity: blink ? 1 : 0.15 }} />
        <span style={{ fontWeight: 800, fontSize: 24, letterSpacing: "0.14em", color: "#f0f0f0" }}>REC</span>
        <span style={{ fontWeight: 600, fontSize: 24, color: "#a0a0a0" }}>{timecode(f)}</span>
      </div>
    </div>
  );
};
