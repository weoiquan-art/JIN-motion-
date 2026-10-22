import { AbsoluteFill, useCurrentFrame } from "remotion";
import { camZ, sceneDx, SPAN } from "../camera";
import { DxProvider } from "../draw";
import { SCENES, type SceneId, WIDTH } from "../timeline";
import { Art } from "./scenes/Art";
import { Dawn } from "./scenes/Dawn";
import { Ferry } from "./scenes/Ferry";
import { Food } from "./scenes/Food";
import { Night } from "./scenes/Night";
import { Sunset } from "./scenes/Sunset";
import { Temple } from "./scenes/Temple";
import { SkyLayer } from "./Sky";

const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  dawn: Dawn,
  food: Food,
  art: Art,
  temple: Temple,
  ferry: Ferry,
  sunset: Sunset,
  night: Night,
};

// One clipped window per scene on the strip; only the ones on screen render.
const SceneWindow: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const dx = sceneDx(f, i);
  const left = WIDTH / 2 - SPAN / 2 - dx;
  if (left >= WIDTH || left + SPAN <= 0) return null;
  const Scene = SCENE_COMPONENTS[SCENES[i].id];
  return (
    <div style={{ position: "absolute", left, top: 0, width: SPAN, height: "100%", overflow: "hidden" }}>
      <DxProvider value={dx}>
        <Scene />
      </DxProvider>
    </div>
  );
};

// The whole day: global sky behind, scene windows on top, gentle zoom.
export const Strip: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <SkyLayer />
      <AbsoluteFill style={{ transform: `scale(${camZ(f)})` }}>
        {SCENES.map((s, i) => (
          <SceneWindow key={s.id} i={i} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
