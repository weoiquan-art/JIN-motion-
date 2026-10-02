import { Freeze, Loop, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { easeOut, inv, lerp, springAt } from "../../intro/math";
import { MONO_STACK, ZH } from "../fonts";
import { CLIPS, RESULTS, S, STACK_STEP, SUCCESS_NOTE, VERSIONS } from "../timeline.ts";
import { Doc } from "./Doc";

const GREEN = "#3ddc84";

// Clean footage after v13: native aspect, no stretch, no crop, no bars.
const CleanCard: React.FC<{ kind: "portrait" | "wide" }> = ({ kind }) => {
  const f = useCurrentFrame();
  const r = RESULTS[kind];
  const clip = CLIPS[kind];
  if (f < r.in) return null;
  const w = r.w;
  const h = w / clip.aspect;
  const s = springAt(f - r.in, 220, 20, 0.8);
  return (
    <div
      style={{
        position: "absolute",
        left: r.x,
        top: r.y,
        width: w,
        height: h,
        zIndex: 50,
        transform: `translate(-50%, -50%) translateY(${lerp(40, 0, s)}px) scale(${lerp(0.9, 1, s)})`,
        opacity: Math.min(1, (f - r.in) / 6),
      }}
    >
      <div style={{ position: "absolute", left: 0, bottom: h + 16, display: "flex", alignItems: "center", gap: 14, whiteSpace: "pre" }}>
        <span style={{ fontFamily: MONO_STACK, fontWeight: 700, fontSize: 24, letterSpacing: "0.12em", color: "#e6e6e6" }}>RESULT · v13</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, background: GREEN, color: "#0b0b0b", borderRadius: 5, padding: "3px 10px", fontFamily: MONO_STACK, fontWeight: 800, fontSize: 18 }}>
          <svg width={16} height={16} viewBox="0 0 16 16">
            <path d="M3 8.5 L6.6 12 L13 4.5" fill="none" stroke="#0b0b0b" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          OK
        </span>
      </div>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", boxShadow: `0 0 0 3px ${GREEN}, 0 40px 90px rgba(0,0,0,0.6)` }}>
        {/* pinned to the whole frame so motion-blur samples never mix two source frames */}
        <Freeze frame={Math.round(f)}>
          <Sequence from={r.in} layout="none">
            <Loop durationInFrames={clip.frames} layout="none">
              <OffthreadVideo src={staticFile(clip.src)} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
            </Loop>
          </Sequence>
        </Freeze>
      </div>
    </div>
  );
};

export const Results: React.FC = () => {
  const f = useCurrentFrame();
  const note = easeOut(inv(SUCCESS_NOTE.f, SUCCESS_NOTE.f + 14, f));
  const p = RESULTS.portrait;
  const ph = p.w / CLIPS.portrait.aspect;
  return (
    <>
      <CleanCard kind="portrait" />
      <CleanCard kind="wide" />
      {f >= SUCCESS_NOTE.f && (
        <div
          style={{
            position: "absolute",
            left: p.x - p.w / 2,
            top: p.y + ph / 2 + 36,
            zIndex: 50,
            opacity: note,
            transform: `translateY(${lerp(10, 0, note)}px)`,
            whiteSpace: "pre",
          }}
        >
          <div style={{ fontFamily: ZH, fontWeight: 700, fontSize: 40, color: "#f2f2f2" }}>{SUCCESS_NOTE.zh}</div>
          <div style={{ fontFamily: MONO_STACK, fontWeight: 500, fontSize: 22, letterSpacing: "0.14em", color: "#8c8c8c", marginTop: 8 }}>{SUCCESS_NOTE.en}</div>
        </div>
      )}
    </>
  );
};

// v1 … v12 fan out behind the live document as the camera pulls back.
export const VersionStack: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.look) return null;
  const older = VERSIONS.filter((v) => v.v < 13);
  return (
    <>
      {older.map((v) => {
        const k = 13 - v.v; // v12 → 1 step back, v1 → 12 steps back
        const s = springAt(f - (S.look + 2 + k * 2), 160, 18, 0.8);
        if (s <= 0) return null;
        return (
          <Doc
            key={v.v}
            snapshot={v.f + 1}
            dx={STACK_STEP.x * k * s}
            dy={STACK_STEP.y * k * s}
            rot={(k % 2 ? 1 : -1) * (0.5 + (k % 3) * 0.45) * s}
            opacity={Math.min(1, s * 1.5) * lerp(1, 0.72, k / 12)}
          />
        );
      })}
    </>
  );
};
