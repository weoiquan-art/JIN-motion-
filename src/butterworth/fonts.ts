import { loadFont } from "@remotion/fonts";
import { getInfo as getInterInfo } from "@remotion/google-fonts/Inter";
import { getInfo as getSansInfo } from "@remotion/google-fonts/NotoSansSC";
import { getInfo as getSerifInfo } from "@remotion/google-fonts/NotoSerifSC";
import { staticFile } from "remotion";
import {
  INTER_DIR,
  localFontPath,
  NOTO_DIR,
  notoSubsetsCjkFirst,
  SERIF_DIR,
  withoutAscii,
} from "../intro/font-subsets";
import { ALL_TEXT_BW } from "./timeline";

// Titles: Noto Serif SC. Labels and small print: Noto Sans SC. All Latin:
// Inter. Files come from public/fonts/ (`npm run fonts`); loadFont() holds
// every frame with delayRender() until the face is ready.

// Same rule as IntroV2: the CJK faces are registered without ASCII so Latin
// letters and digits always come from Inter, while CJK punctuation ("，", "——")
// stays full-width from Noto.
export const SERIF = "NotoSerifSC-BW";
export const SANS = "NotoSansSC-BW";
export const INTER = "Inter-BW";

const inter = getInterInfo();
const interFonts = inter.fonts.normal as Record<string, Record<string, string>>;

for (const [family, info, dir] of [
  [SERIF, getSerifInfo(), SERIF_DIR],
  [SANS, getSansInfo(), NOTO_DIR],
] as const) {
  const files = info.fonts.normal as Record<string, Record<string, string>>;
  const ranges = info.unicodeRanges as Record<string, string>;
  // Variable fonts: one face per subset covers every weight used.
  for (const subset of notoSubsetsCjkFirst(ALL_TEXT_BW, ranges, inter.unicodeRanges.latin)) {
    loadFont({
      family,
      url: staticFile(localFontPath(dir, files["400"][subset])),
      weight: "200 900",
      unicodeRange: withoutAscii(ranges[subset]),
    });
  }
}
loadFont({
  family: INTER,
  url: staticFile(localFontPath(INTER_DIR, interFonts["400"].latin)),
  weight: "100 900",
  unicodeRange: inter.unicodeRanges.latin,
});

export const ZH_SERIF = `"${SERIF}", "${INTER}", serif`;
export const ZH_SANS = `"${SANS}", "${INTER}", sans-serif`;
export const EN = `"${INTER}", "${SANS}", sans-serif`;
