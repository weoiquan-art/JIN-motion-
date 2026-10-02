import { loadFont } from "@remotion/fonts";
import { getInfo as getMonoInfo } from "@remotion/google-fonts/JetBrainsMono";
import { getInfo as getNotoInfo } from "@remotion/google-fonts/NotoSansSC";
import { staticFile } from "remotion";
import {
  localFontPath,
  MONO_DIR,
  NOTO_DIR,
  notoSubsetsCjkFirst,
  withoutAscii,
} from "../intro/font-subsets";
import { ALL_TEXT_V2 } from "./timeline";

// Chinese: Noto Sans SC. Latin / version numbers / field labels: JetBrains
// Mono. Files come from public/fonts/ (`npm run fonts`), with URLs and unicode
// ranges from @remotion/google-fonts. loadFont() holds every frame with
// delayRender() until the face is ready and cancels the render if it fails.

// Own family name: some Noto slices also contain ASCII, and here Latin must
// always come from the mono font, so these faces are registered without it.
export const NOTO = "NotoSansSC-V2";
export const MONO = "JetBrainsMono-Local";

const noto = getNotoInfo();
const mono = getMonoInfo();
const notoFonts = noto.fonts.normal as Record<string, Record<string, string>>;
const monoFonts = mono.fonts.normal as Record<string, Record<string, string>>;
const notoRanges = noto.unicodeRanges as Record<string, string>;

export const NOTO_SUBSETS_V2 = notoSubsetsCjkFirst(ALL_TEXT_V2, notoRanges, mono.unicodeRanges.latin);

// Both are variable fonts: one face per file covers every weight used.
for (const subset of NOTO_SUBSETS_V2) {
  loadFont({
    family: NOTO,
    url: staticFile(localFontPath(NOTO_DIR, notoFonts["400"][subset])),
    weight: "100 900",
    unicodeRange: withoutAscii(notoRanges[subset]),
  });
}
loadFont({
  family: MONO,
  url: staticFile(localFontPath(MONO_DIR, monoFonts["400"].latin)),
  weight: "100 800",
  unicodeRange: mono.unicodeRanges.latin,
});

// Chinese-first: CJK + full-width punctuation from Noto, Latin falls to mono.
export const ZH = `"${NOTO}", "${MONO}", sans-serif`;
// Mono-first: labels, version numbers, English (CJK falls back to Noto).
export const MONO_STACK = `"${MONO}", "${NOTO}", monospace`;
