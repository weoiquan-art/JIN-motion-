import { loadFont } from "@remotion/fonts";
import { getInfo as getInterInfo } from "@remotion/google-fonts/Inter";
import { getInfo as getNotoInfo } from "@remotion/google-fonts/NotoSansSC";
import { staticFile } from "remotion";
import {
  INTER_DIR,
  localFontPath,
  NOTO_DIR,
  neededNotoSubsets,
} from "./font-subsets";
import { ALL_TEXT } from "./timeline";

// Fonts are served from public/fonts/ (fetched by `npm run fonts`) because the
// render browser cannot reach fonts.gstatic.com through this environment's
// TLS-intercepting proxy. File URLs and unicode ranges come from the
// @remotion/google-fonts metadata. loadFont() holds every frame with
// delayRender() until the face is ready and cancels the render if it fails.

export const NOTO = "NotoSansSC-Local";
export const INTER = "Inter-Local";

const noto = getNotoInfo();
const inter = getInterInfo();
const notoFonts = noto.fonts.normal as Record<string, Record<string, string>>;
const interFonts = inter.fonts.normal as Record<string, Record<string, string>>;
const notoRanges = noto.unicodeRanges as Record<string, string>;

export const NOTO_SUBSETS = neededNotoSubsets(
  ALL_TEXT,
  inter.unicodeRanges.latin,
  notoRanges,
);

// Both files are variable fonts (wght 100–900): one face per subset covers
// 400 (small print), 700 (secondary lines) and 900 (headlines).
for (const subset of NOTO_SUBSETS) {
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

// Latin glyphs come from Inter, CJK glyphs fall through to Noto Sans SC.
export const FONT = `"${INTER}", "${NOTO}", sans-serif`;
