import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from "remotion";
import "./fonts";
import { Blur } from "./Blur";
import { Vignette } from "./parts";
import { Daily } from "./scenes/Daily";
import { Ending } from "./scenes/Ending";
import { Full } from "./scenes/Full";
import { Opening } from "./scenes/Opening";
import { Question } from "./scenes/Question";
import { Nice, Squeeze } from "./scenes/Turn";
import { shutter } from "./shutter.ts";
import { C } from "./theme.ts";
import { T } from "./timeline.ts";

// Which scene is on screen at (fractional) frame s. The opening hands over to
// the windows a quarter frame early so the whip's first frame is all motion.
const Scenes: React.FC = () => {
  const s = useCurrentFrame();
  if (s < T.windows[0] - 0.25) return <Opening />;
  if (s < T.nice) return <Daily />;
  if (s < T.squeeze) return <Nice />;
  if (s < T.stop) return <Squeeze />;
  if (s < T.drop) return <Question />;
  if (s < T.land) return <Full />;
  return <Ending />;
};

export const IntroFree: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Blur offsets={shutter(f)}>
        <Scenes />
      </Blur>
      <Vignette strength={f >= T.nice && f < T.squeeze ? 0.12 : f >= T.drop && f < T.land ? 0.2 : 0.55} />
      <Html5Audio src={staticFile("audio/intro-free.wav")} />
    </AbsoluteFill>
  );
};
