import { loadFont } from "@remotion/fonts";
import { getInfo as getInterInfo } from "@remotion/google-fonts/Inter";
import { getInfo as getSansInfo } from "@remotion/google-fonts/NotoSansSC";
import { getInfo as getSerifInfo } from "@remotion/google-fonts/NotoSerifSC";
import { staticFile } from "remotion";
import {
  INTER_DIR,
  localFontPath,
  NOTO_DIR,
  SERIF_DIR,
  withoutAscii,
} from "../intro/font-subsets";
import subsets from "./font-subsets.json";

// Titles: Noto Serif SC. Subtitles and labels: Noto Sans SC. All Latin
// letters and digits: Inter (the CJK faces are registered without ASCII, as
// in Butterworth). The slices come from public/fonts (`npm run fonts:penang`).
export const SERIF = "NotoSerifSC-PB";
export const SANS = "NotoSansSC-PB";
export const INTER = "Inter-PB";

const inter = getInterInfo();
const interFonts = inter.fonts.normal as Record<string, Record<string, string>>;
const sansInfo = getSansInfo();
const serifInfo = getSerifInfo();
const sansRanges = sansInfo.unicodeRanges as Record<string, string>;
const serifRanges = serifInfo.unicodeRanges as Record<string, string>;

for (const [family, info, dir, list] of [
  [SERIF, serifInfo, SERIF_DIR, subsets.serif],
  [SANS, sansInfo, NOTO_DIR, subsets.sans],
] as const) {
  const files = info.fonts.normal as Record<string, Record<string, string>>;
  const ranges = info.unicodeRanges as Record<string, string>;
  for (const subset of list) {
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

const parse = (r: string) =>
  r.split(",").map((part) => {
    const [a, b] = part.trim().replace(/^U\+/i, "").split("-");
    return [parseInt(a, 16), parseInt(b ?? a, 16)] as const;
  });
const covered = (ranges: string[], cp: number) =>
  ranges.some((r) => parse(r).some(([a, b]) => cp >= a && cp <= b));

// Characters in `text` that no registered face can draw (they would silently
// fall back to a system font). Studio edits add new characters; the
// composition throws with this list so `npm run fonts:penang` is not forgotten.
export const missingGlyphs = (text: string) => {
  const sans = subsets.sans.map((s) => sansRanges[s]);
  const serif = subsets.serif.map((s) => serifRanges[s]);
  const missing = new Set<string>();
  for (const ch of new Set(text)) {
    const cp = ch.codePointAt(0) as number;
    if (cp < 0x80 || ch.trim() === "") continue;
    if (covered([inter.unicodeRanges.latin], cp)) continue;
    if (!covered(sans, cp) || !covered(serif, cp)) missing.add(ch);
  }
  return [...missing];
};
