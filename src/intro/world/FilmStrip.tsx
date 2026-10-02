import { useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { easeOut, inv, lerp } from "../math";
import { RED, WHITE } from "../theme";
import { T, timecode, TL, TL_LEFT, TL_RIGHT, TL_WIDTH } from "../timeline";

// Film strip behind the snapped cards, plus a playhead sweeping left → right.
export const FilmStrip: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.brake) return null;
  const appear = easeOut(inv(T.brake + 2, T.brake + 16, f));
  const gone = 1 - inv(T.end - 1, T.end + 13, f);
  const opacity = appear * gone;
  if (opacity <= 0) return null;

  const margin = 90;
  const stripH = TL.h + 150;
  const holeBand = 22;
  const holes = {
    position: "absolute" as const,
    left: 0,
    right: 0,
    height: holeBand,
    backgroundImage: "repeating-linear-gradient(90deg, #0b0b0b 0 30px, transparent 30px 58px)",
  };

  const sweep = inv(T.sweepStart + 2, T.sweepEnd, f); // linear on purpose
  const px = lerp(TL_LEFT - 50, TL_RIGHT + 50, sweep);
  const headH = TL.h + 230;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, zIndex: 5, opacity }}>
      <div
        style={{
          position: "absolute",
          left: TL_LEFT - margin,
          top: TL.y - stripH / 2,
          width: TL_WIDTH + margin * 2,
          height: stripH,
          background: "#171717",
          borderRadius: 10,
          transform: `scaleX(${lerp(0.92, 1, appear)})`,
        }}
      >
        <div style={{ ...holes, top: 18 }} />
        <div style={{ ...holes, bottom: 18 }} />
      </div>
      {f >= T.sweepStart && (
        <div style={{ position: "absolute", left: px, top: TL.y - headH / 2, opacity: inv(T.sweepStart, T.sweepStart + 4, f) }}>
          <div style={{ position: "absolute", left: -3, top: 0, width: 6, height: headH, background: RED }} />
          <div
            style={{
              position: "absolute",
              left: -16,
              top: -18,
              width: 0,
              height: 0,
              borderLeft: "16px solid transparent",
              borderRight: "16px solid transparent",
              borderTop: `22px solid ${RED}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: -78,
              transform: "translateX(-50%)",
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 44,
              color: WHITE,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {timecode(lerp(0, T.brake, sweep))}
          </div>
        </div>
      )}
    </div>
  );
};
