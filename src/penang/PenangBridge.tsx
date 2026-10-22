// PenangBridge: a ~60 s history short about the first Penang Bridge, cut to
// the beat of a BGM. Three layers that can be switched off and rendered on
// their own (props.layers): pictures, effects, text. All timing comes from
// public/data/penang-bgm.json through the beat clock (beats.ts).

import React, { useMemo } from "react";
import { AbsoluteFill, type CalculateMetadataFunction, Html5Audio, staticFile, useVideoConfig } from "remotion";
import { clamp } from "./anim";
import { makeClock } from "./beats";
import { missingGlyphs } from "./fonts";
import { FxLayer } from "./FxLayer";
import { PhotoLayer, schedule } from "./PhotoLayer";
import type { PenangProps } from "./schema";
import { TextLayer } from "./TextLayer";

const FPS = 30;

export const calculatePenangMetadata: CalculateMetadataFunction<PenangProps> = ({ props }) => ({
  durationInFrames: makeClock(props.music, FPS).durationInFrames,
});

const allText = (p: PenangProps) =>
  [
    ...p.captions.flatMap((c) => [c.kicker, c.title, c.sub, c.en, c.big]),
    ...p.chapters.flatMap((c) => [c.label, c.en]),
    ...p.years.map((y) => y.text),
    ...p.credits,
  ].join("");

export const PenangBridge: React.FC<PenangProps> = (props) => {
  const { fps } = useVideoConfig();
  const clock = useMemo(() => makeClock(props.music, fps), [props.music, fps]);
  const slots = useMemo(() => schedule(props.shots, clock), [props.shots, clock]);
  const missing = useMemo(() => missingGlyphs(allText(props)), [props]);
  if (missing.length > 0) {
    throw new Error(`PenangBridge: 字体里没有这些字：${missing.join(" ")}。改了文字要先运行 npm run fonts:penang`);
  }
  const { music } = props;
  return (
    <AbsoluteFill style={{ backgroundColor: props.layers.photos ? "#05070c" : undefined }}>
      {props.layers.photos ? <PhotoLayer shots={props.shots} clock={clock} look={props.look} /> : null}
      {props.layers.fx ? <FxLayer clock={clock} slots={slots} flares={props.flares} look={props.look} /> : null}
      {props.layers.text ? <TextLayer props={props} clock={clock} /> : null}
      {/* Html5Audio, not @remotion/media's <Audio>: with this mp3 the latter
          rendered the music 25 ms late (the mp3 encoder delay was not
          skipped), which shifts every hit off its cut. */}
      <Html5Audio
        name="BGM"
        src={staticFile(music.src)}
        trimBefore={clock.trimBefore}
        volume={(f) => {
          const fin = music.fadeIn > 0 ? clamp(f / (music.fadeIn * fps)) : 1;
          const x = music.fadeOut > 0 ? clamp((f - clock.endFrame) / (music.fadeOut * fps)) : f < clock.endFrame ? 0 : 1;
          return music.volume * fin * Math.pow(1 - x, 1.6);
        }}
      />
    </AbsoluteFill>
  );
};
