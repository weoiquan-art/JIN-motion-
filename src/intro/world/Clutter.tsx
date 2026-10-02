import { useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, inv, lerp, springAt } from "../math";
import { GHOSTS, PROMPTS, T } from "../timeline";

// Queued shot frames and typed prompt lines: background texture only.
export const Clutter: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.chaos || f > T.brake + 12) return null;
  const out = 1 - inv(T.brake, T.brake + 10, f);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, zIndex: 2, opacity: out }}>
      {GHOSTS.map((g) => {
        if (f < g.appear) return null;
        const s = springAt(f - g.appear, 300, 16, 0.6);
        return (
          <div
            key={`${g.x}-${g.y}`}
            style={{
              position: "absolute",
              left: g.x,
              top: g.y,
              width: g.w,
              height: g.h,
              transform: `translate(-50%, -50%) scale(${lerp(0.4, 1, s)})`,
              opacity: clamp(s) * 0.9,
              border: "2px dashed rgba(255,255,255,0.34)",
              borderRadius: 6,
              background: "rgba(255,255,255,0.045)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 10,
                top: 8,
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "0.14em",
                color: "rgba(255,255,255,0.5)",
                whiteSpace: "nowrap",
              }}
            >
              {`QUEUED · v${g.v}`}
            </div>
          </div>
        );
      })}
      {PROMPTS.map((p) => {
        if (f < p.appear) return null;
        const shown = Math.min(p.text.length, Math.floor((f - p.appear) * 2.6));
        const cursor = Math.floor(f / 6) % 2 === 0 || shown < p.text.length;
        return (
          <div
            key={p.text}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              transform: "translate(-50%, -50%)",
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 26,
              lineHeight: "30px",
              color: "#727272",
              whiteSpace: "pre",
            }}
          >
            {/* full text reserves the width so the line doesn't drift while typing */}
            <span style={{ visibility: "hidden" }}>{p.text}</span>
            <span style={{ position: "absolute", left: 0, top: 0 }}>
              {p.text.slice(0, shown)}
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 26,
                  marginLeft: 4,
                  verticalAlign: "-4px",
                  background: cursor ? "#9a9a9a" : "transparent",
                }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
};
