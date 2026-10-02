import { Img, staticFile, useCurrentFrame } from "remotion";
import { clamp, lerp, springAt } from "../math";
import { centred } from "../theme";
import { CRACK, DEBRIS_SCALE, LOGO_BOX, LOGOS, logoEmerge, logoFling, T } from "../timeline";

type LogoPose = { x: number; y: number; scale: number; rot: number; opacity: number };

// Burst out of the crack, get flung across the canvas, idle as debris.
const poseBeforeHit = (i: number, f: number): LogoPose | null => {
  const L = LOGOS[i];
  const e = logoEmerge(i);
  if (f < e) return null;
  const s1 = springAt(f - e, 300, 13, 0.7);
  const bx = CRACK.x + L.burst[0];
  const by = CRACK.y + L.burst[1];
  let x = lerp(CRACK.x, bx, s1);
  let y = lerp(CRACK.y, by, s1);
  let scale = lerp(0.15, 1, s1);
  let rot = L.spin * 0.4 * (1 - s1);
  const fl = logoFling(i);
  if (f >= fl) {
    const s2 = springAt(f - fl, 130 + i * 25, 15, 0.8);
    x = lerp(bx, L.anchor[0], s2);
    y = lerp(by, L.anchor[1], s2);
    scale = lerp(1, DEBRIS_SCALE, clamp(s2));
    rot = L.spin * 5 * s2;
    // gentle drift while waiting as background debris
    const idle = clamp((f - fl - 14) / 20);
    x += idle * 14 * Math.sin(f * 0.06 + i * 2);
    y += idle * 10 * Math.cos(f * 0.05 + i);
    rot += idle * 6 * Math.sin(f * 0.04 + i);
  }
  return { x, y, scale, rot, opacity: 1 };
};

const pose = (i: number, f: number): LogoPose | null => {
  const L = LOGOS[i];
  if (f < L.hit) return poseBeforeHit(i, f);
  // knocked away by the word slam
  const p0 = poseBeforeHit(i, L.hit) as LogoPose;
  const t = f - L.hit;
  return {
    x: p0.x + L.v[0] * t,
    y: p0.y + L.v[1] * t + 0.5 * t * t,
    scale: p0.scale * (1 - 0.012 * t),
    rot: p0.rot + L.spin * 1.6 * t,
    opacity: clamp(1 - t / 26),
  };
};

const LogoImg: React.FC<{ i: number; p: LogoPose; alpha?: number }> = ({ i, p, alpha = 1 }) => {
  const L = LOGOS[i];
  return (
    <div
      style={{
        ...centred(p.x, p.y, `rotate(${p.rot}deg) scale(${p.scale})`),
        width: LOGO_BOX,
        height: LOGO_BOX,
        opacity: p.opacity * alpha,
      }}
    >
      <Img
        src={staticFile(L.file)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          imageRendering: L.pixelated ? "pixelated" : "auto",
        }}
      />
    </div>
  );
};

export const Logos: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, top: 0, zIndex: f < T.chaos - 4 ? 40 : 1 }}>
      {LOGOS.map((_, i) => {
        const p = pose(i, f);
        if (!p || p.opacity <= 0) return null;
        // Smear: ghosts at earlier times, stronger the faster the logo moves.
        const prev = pose(i, f - 1);
        const speed = prev ? Math.hypot(p.x - prev.x, p.y - prev.y) : 0;
        const ghostAlpha = clamp((speed - 6) / 40) * 0.45;
        return (
          <div key={LOGOS[i].file}>
            {ghostAlpha > 0.01 &&
              [4, 3, 2, 1].map((k) => {
                const g = pose(i, f - k * 0.9);
                return g ? <LogoImg key={k} i={i} p={g} alpha={ghostAlpha / k} /> : null;
              })}
            <LogoImg i={i} p={p} />
          </div>
        );
      })}
    </div>
  );
};
