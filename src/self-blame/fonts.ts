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
import { ALL_TEXT_SB, ALL_TEXT_SB_SERIF } from "./timeline";

// Captions and labels: Noto Sans SC. The question, the cards and the closing
// line: Noto Serif SC. All Latin letters and digits: Inter. Files come from
// public/fonts/ (`npm run fonts:self-blame`); loadFont() holds every frame with
// delayRender() until the face is ready, and a missing file fails the render.
// Same rule as Butterworth: the CJK faces are registered without ASCII, so Latin
// always comes from Inter while CJK punctuation (“，”“？”) stays full-width.
export const SERIF = "NotoSerifSC-SB";
export const SANS = "NotoSansSC-SB";
export const INTER = "Inter-SB";

const inter = getInterInfo();
const interFonts = inter.fonts.normal as Record<string, Record<string, string>>;

for (const [family, info, dir, text] of [
  [SERIF, getSerifInfo(), SERIF_DIR, ALL_TEXT_SB_SERIF],
  [SANS, getSansInfo(), NOTO_DIR, ALL_TEXT_SB],
] as const) {
  const files = info.fonts.normal as Record<string, Record<string, string>>;
  const ranges = info.unicodeRanges as Record<string, string>;
  for (const subset of notoSubsetsCjkFirst(text, ranges, inter.unicodeRanges.latin)) {
    const range = withoutAscii(ranges[subset]);
    if (!range) continue;
    loadFont({
      family,
      url: staticFile(localFontPath(dir, files["400"][subset])),
      weight: "200 900",
      unicodeRange: range,
    });
  }
}
loadFont({
  family: INTER,
  url: staticFile(localFontPath(INTER_DIR, interFonts["400"].latin)),
  weight: "100 900",
  unicodeRange: inter.unicodeRanges.latin,
});

export const ZH = `"${SANS}", "${INTER}", sans-serif`;
export const ZH_SERIF = `"${SERIF}", "${SANS}", "${INTER}", serif`;
export const EN = `"${INTER}", "${SANS}", sans-serif`;
