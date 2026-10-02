import { Img, staticFile, useCurrentFrame } from "remotion";
import { easeOut, inv, lerp, springAt } from "../../intro/math";
import { screenToWorld } from "../camera";
import {
  AI_POS,
  CORNER_ICON,
  cornerSlot,
  LOGO_BOX,
  LOGO_FILES,
  LOGO_OFFSETS,
  LOGO_TO_TOPBAR,
  logoDock,
  logoEmerge,
  TOPBAR_ICON,
  topbarSlot,
} from "../timeline.ts";

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

// burst out of "AI" → shrink into a row in the screen corner → settle into
// the editor top bar (the Doc header takes over from there).
const pose = (i: number, f: number) => {
  const e = logoEmerge(i);
  if (f < e || f >= LOGO_TO_TOPBAR[1]) return null;
  const [ox, oy] = LOGO_OFFSETS[i];
  const s1 = springAt(f - e, 320, 13, 0.7);
  const bx = AI_POS.x + ox;
  const by = AI_POS.y + oy;
  let x = lerp(AI_POS.x, bx, s1);
  let y = lerp(AI_POS.y, by, s1);
  let size = lerp(0.2, 1, s1) * LOGO_BOX;
  const d = logoDock(i);
  if (f >= d) {
    const c = cornerSlot(i);
    const w = screenToWorld(f, c.x, c.y);
    const s2 = springAt(f - d, 200, 20, 0.8);
    x = lerp(bx, w.x, s2);
    y = lerp(by, w.y, s2);
    size = lerp(LOGO_BOX, CORNER_ICON / w.z, Math.min(1, s2));
    if (f >= LOGO_TO_TOPBAR[0]) {
      const q = smooth((f - LOGO_TO_TOPBAR[0]) / (LOGO_TO_TOPBAR[1] - LOGO_TO_TOPBAR[0]));
      const t = topbarSlot(i);
      x = lerp(w.x, t.x, q);
      y = lerp(w.y, t.y, q);
      size = lerp(CORNER_ICON / w.z, TOPBAR_ICON, q);
    }
  }
  return { x, y, size };
};

export const LogosV2: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, top: 0, zIndex: 40 }}>
      {LOGO_FILES.map((l, i) => {
        const e = logoEmerge(i);
        const ring = inv(e, e + 14, f);
        const p = pose(i, f);
        return (
          <div key={l.file}>
            {f >= e && ring < 1 && (
              <div
                style={{
                  position: "absolute",
                  left: AI_POS.x,
                  top: AI_POS.y,
                  width: 40 + 380 * easeOut(ring),
                  height: 40 + 380 * easeOut(ring),
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: `${lerp(6, 1, ring)}px solid rgba(255,255,255,${0.8 * (1 - ring)})`,
                }}
              />
            )}
            {p && (
              <div style={{ position: "absolute", left: p.x, top: p.y, width: p.size, height: p.size, transform: "translate(-50%, -50%)" }}>
                <Img
                  src={staticFile(l.file)}
                  style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: l.pixelated ? "pixelated" : "auto" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
