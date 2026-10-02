import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from "remotion";
import { camera, cameraTransform } from "./camera";
import { Grid, Hud } from "./Hud";
import { inv } from "./math";
import { MotionBlur } from "./MotionBlur";
import { BG } from "./theme";
import { blurSamples, DURATION, T } from "./timeline";
import { EndCard } from "./world/EndCard";
import { FilmStrip } from "./world/FilmStrip";
import { CrackFx, IntroLines } from "./world/IntroLines";
import { Clutter } from "./world/Clutter";
import { Logos } from "./world/Logos";
import { ShotCards } from "./world/ShotCards";
import { Flights, Words } from "./world/Words";

// Everything lives on one big world canvas; a virtual camera
// (pan / zoom / rotate / shake) chases the current word or card.
const World: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camera(frame);
  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <Grid cam={cam} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transformOrigin: "0 0",
          transform: cameraTransform(cam),
        }}
      >
        <Clutter />
        <Logos />
        <FilmStrip />
        <ShotCards />
        <IntroLines />
        <Words />
        <Flights />
        <CrackFx />
        <EndCard />
      </div>
    </AbsoluteFill>
  );
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = 1 - inv(T.fadeOut, DURATION, frame);
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <AbsoluteFill style={{ opacity: fade }}>
        <MotionBlur samples={blurSamples(frame)}>
          <World />
        </MotionBlur>
        <Hud />
        <AbsoluteFill
          style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }}
        />
      </AbsoluteFill>
      <Html5Audio src={staticFile("audio/intro.wav")} />
    </AbsoluteFill>
  );
};
