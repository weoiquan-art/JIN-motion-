import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from "remotion";
import { Grid } from "../intro/Hud";
import { inv } from "../intro/math";
import { MotionBlur } from "../intro/MotionBlur";
import { cameraV2, transformOf } from "./camera";
import { blurSamples, DURATION, S } from "./timeline.ts";
import { Doc } from "./world/Doc";
import { GlitchCards } from "./world/GlitchCards";
import { LogosV2 } from "./world/Logos";
import { Results, VersionStack } from "./world/Results";
import { EndText, OpeningTexts, Slams } from "./world/Texts";

// One world canvas; the virtual camera follows the template cursor.
const World: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraV2(frame);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0b0b", overflow: "hidden" }}>
      <Grid cam={cam} />
      <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: transformOf(cam) }}>
        <VersionStack />
        <Doc />
        <LogosV2 />
        <OpeningTexts />
        <Results />
        <GlitchCards />
        <Slams />
        <EndText />
      </div>
    </AbsoluteFill>
  );
};

export const IntroV2: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = 1 - inv(S.fadeOut, DURATION, frame);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0b0b" }}>
      <AbsoluteFill style={{ opacity: fade }}>
        <MotionBlur samples={blurSamples(frame)} shutter={frame >= S.loop3 && frame < S.stop ? 0.35 : 0.5}>
          <World />
        </MotionBlur>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.5) 100%)" }} />
      </AbsoluteFill>
      <Html5Audio src={staticFile("audio/intro-v2.wav")} />
    </AbsoluteFill>
  );
};
