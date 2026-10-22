import { loadFont } from "@remotion/fonts";
import { getInfo as getInterInfo } from "@remotion/google-fonts/Inter";
import { getInfo as getMonoInfo } from "@remotion/google-fonts/JetBrainsMono";
import { getInfo as getNotoInfo } from "@remotion/google-fonts/NotoSansSC";
import { staticFile } from "remotion";
import { ALL_TEXT_FREE } from "../content";
import {
  INTER_DIR,
  localFontPath,
  MONO_DIR,
  NOTO_DIR,
  neededNotoSubsets,
} from "../intro/font-subsets";

// Chinese: the project's Noto Sans SC (only the unicode-range slices that the
// text in src/content.ts needs; `npm run fonts:free` downloads them).
// Latin: Inter for display text, JetBrains Mono for "machine" text.
// loadFont() wraps every face in delayRender(), so no frame is captured before
// all of them are ready, and a missing file cancels the render with an error.

export const NOTO = "NotoSansSC-Free";
export const INTER = "Inter-Free";
export const MONO_FACE = "JetBrainsMono-Free";

const noto = getNotoInfo();
const inter = getInterInfo();
const mono = getMonoInfo();
const notoFonts = noto.fonts.normal as Record<string, Record<string, string>>;
const interFonts = inter.fonts.normal as Record<string, Record<string, string>>;
const monoFonts = mono.fonts.normal as Record<string, Record<string, string>>;
const notoRanges = noto.unicodeRanges as Record<string, string>;

export const NOTO_SUBSETS_FREE = neededNotoSubsets(
  ALL_TEXT_FREE,
  inter.unicodeRanges.latin,
  notoRanges,
);

// All three files are variable fonts: one face per file covers every weight.
for (const subset of NOTO_SUBSETS_FREE) {
  loadFont({
    family: NOTO,
    url: staticFile(localFontPath(NOTO_DIR, notoFonts["400"][subset])),
    weight: "100 900",
    unicodeRange: notoRanges[subset],
  });
}
loadFont({
  family: INTER,
  url: staticFile(localFontPath(INTER_DIR, interFonts["400"].latin)),
  weight: "100 900",
  unicodeRange: inter.unicodeRanges.latin,
});
loadFont({
  family: MONO_FACE,
  url: staticFile(localFontPath(MONO_DIR, monoFonts["400"].latin)),
  weight: "100 800",
  unicodeRange: mono.unicodeRanges.latin,
});

// Latin from Inter / JetBrains Mono, everything CJK falls through to Noto.
export const ZH = `"${INTER}", "${NOTO}", sans-serif`;
export const MONO = `"${MONO_FACE}", "${NOTO}", monospace`;
