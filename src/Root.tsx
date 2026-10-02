import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { Intro } from "./intro/Intro";
import { DURATION, FPS, HEIGHT, WIDTH } from "./intro/timeline";
import { TestComposition } from "./TestComposition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="Test"
        component={TestComposition}
        durationInFrames={30}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
