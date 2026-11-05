// Captions and labels: Noto Sans SC; titles: Noto Serif SC; Latin letters and
// digits: Inter (the CJK faces are registered without ASCII). The slices
// come from public/fonts (`npm run fonts:rainbow`). The faces are loaded with
// the FontFace API, so canvas text can use them too.
import { loadFont } from "@remotion/fonts";
import { getInfo as getInterInfo } from "@remotion/google-fonts/Inter";
import { getInfo as getSansInfo } from "@remotion/google-fonts/NotoSansSC";
import { getInfo as getSerifInfo } from "@remotion/google-fonts/NotoSerifSC";
import { staticFile } from "remotion";
import { INTER_DIR, localFontPath, NOTO_DIR, SERIF_DIR, withoutAscii } from "../intro/font-subsets";
import subsets from "./font-subsets.json";

export const SERIF_FACE = "NotoSerifSC-RB";
export const SANS_FACE = "NotoSansSC-RB";
export const INTER_FACE = "Inter-RB";

const inter = getInterInfo();
const interFonts = inter.fonts.normal as Record<string, Record<string, string>>;
for (const [family, info, dir, list] of [
  [SERIF_FACE, getSerifInfo(), SERIF_DIR, subsets.serif],
  [SANS_FACE, getSansInfo(), NOTO_DIR, subsets.sans],
] as const) {
  const files = info.fonts.normal as Record<string, Record<string, string>>;
  const ranges = info.unicodeRanges as Record<string, string>;
  for (const subset of list) {
    loadFont({ family, url: staticFile(localFontPath(dir, files["400"][subset])), weight: "200 900", unicodeRange: withoutAscii(ranges[subset]) });
  }
}
loadFont({ family: INTER_FACE, url: staticFile(localFontPath(INTER_DIR, interFonts["400"].latin)), weight: "100 900", unicodeRange: inter.unicodeRanges.latin });

export const ZH_SERIF = `"${SERIF_FACE}", "${INTER_FACE}", serif`;
export const ZH_SANS = `"${SANS_FACE}", "${INTER_FACE}", sans-serif`;
export const EN = `"${INTER_FACE}", "${SANS_FACE}", sans-serif`;
