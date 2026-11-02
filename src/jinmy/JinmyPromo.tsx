// JinmyPromo: a 26 s vertical (1080×1920) promo for jinmyaigc
// (www.jinmyaigc.studio), cut to a 120 BPM soundtrack made in code
// (scripts/gen-audio-jinmy.ts → public/audio/jinmy.wav). Scenes and every
// cue come from timeline.ts.

import React from "react";
import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from "remotion";
import { Cta, Hook, Photo, Pick, Result } from "./scenes.tsx";
import { M, S } from "./timeline.ts";
import { Background } from "./ui.tsx";

export const JinmyPromo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#fff6ec" }}>
      <Background frame={frame} />
      {/* the photo and upload step sit under the hook: the hook's frozen frame
          becomes the photo, so the hook ends on the shutter */}
      {frame >= S.photo.from && frame < M.swipeToPick + 9 ? <Photo frame={frame} /> : null}
      {frame >= M.swipeToPick - 9 && frame < M.expand + 12 ? <Pick frame={frame} /> : null}
      {frame >= M.expand ? <Result frame={frame} /> : null}
      {frame >= S.cta.from ? <Cta frame={frame} /> : null}
      {frame < S.hook.to ? <Hook frame={frame} /> : null}
      <Html5Audio src={staticFile("audio/jinmy.wav")} />
    </AbsoluteFill>
  );
};
