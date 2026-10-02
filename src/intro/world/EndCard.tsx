import { useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { easeOut, inv, lerp, springAt } from "../math";
import { WHITE } from "../theme";
import { END, FIT_Z, TL } from "../timeline";

// Sized in screen pixels and scaled by 1/FIT_Z, so with the camera parked at
// FIT_Z the text is drawn at exactly 1:1.
export const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  if (f < END.jinIn) return null;

  const jin = springAt(f - END.jinIn, 220, 24, 0.8);
  const zh = easeOut(inv(END.zhIn, END.zhIn + 12, f));
  const small = easeOut(inv(END.smallIn, END.smallIn + 12, f));

  return (
    <div
      style={{
        position: "absolute",
        left: TL.cx,
        top: TL.y,
        transform: `translate(-50%, -50%) scale(${1 / FIT_Z})`,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: FONT,
        color: WHITE,
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: 300,
          lineHeight: 0.9,
          letterSpacing: "-0.02em",
          opacity: inv(END.jinIn, END.jinIn + 5, f),
          transform: `scale(${lerp(1.12, 1, jin)})`,
        }}
      >
        {END.jin}
      </div>
      <div style={{ fontWeight: 700, fontSize: 86, marginTop: 36, opacity: zh, transform: `translateY(${lerp(16, 0, zh)}px)` }}>
        {END.zh}
      </div>
      <div style={{ fontWeight: 500, fontSize: 32, marginTop: 44, letterSpacing: "0.04em", color: "#b4b4b4", opacity: small }}>
        {END.small}
      </div>
    </div>
  );
};
