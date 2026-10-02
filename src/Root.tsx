import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { Intro } from "./intro/Intro";
import { DURATION, FPS, HEIGHT, WIDTH } from "./intro/timeline";
import { IntroV2 } from "./intro-v2/IntroV2";
import * as Free from "./intro-free/beat.ts";
import { IntroFree } from "./intro-free/IntroFree";
import * as V2 from "./intro-v2/timeline.ts";
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
      <Composition
        id="IntroV2"
        component={IntroV2}
        durationInFrames={V2.DURATION}
        fps={V2.FPS}
        width={V2.WIDTH}
        height={V2.HEIGHT}
      />
      <Composition
        id="IntroFree"
        component={IntroFree}
        durationInFrames={Free.DURATION}
        fps={Free.FPS}
        width={Free.WIDTH}
        height={Free.HEIGHT}
      />
    </>
  );
};
