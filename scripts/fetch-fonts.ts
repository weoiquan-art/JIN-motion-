// Downloads the Noto Sans SC / Noto Serif SC / Inter / JetBrains Mono woff2
// files that Intro, IntroV2 and Butterworth need into public/fonts/, using the
// URLs and unicode ranges from @remotion/google-fonts.
// Re-run (npm run fonts) whenever on-screen text gains new characters.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getInfo as getInterInfo } from "@remotion/google-fonts/Inter";
import { getInfo as getMonoInfo } from "@remotion/google-fonts/JetBrainsMono";
import { getInfo as getNotoInfo } from "@remotion/google-fonts/NotoSansSC";
import { getInfo as getSerifInfo } from "@remotion/google-fonts/NotoSerifSC";
import { ALL_TEXT_BW } from "../src/butterworth/timeline.ts";
import { ALL_TEXT } from "../src/intro/timeline.ts";
import { ALL_TEXT_V2 } from "../src/intro-v2/timeline.ts";
import {
  INTER_DIR,
  localFontPath,
  MONO_DIR,
  NOTO_DIR,
  neededNotoSubsets,
  notoSubsetsCjkFirst,
  SERIF_DIR,
} from "../src/intro/font-subsets.ts";

const noto = getNotoInfo();
const serif = getSerifInfo();
const inter = getInterInfo();
const mono = getMonoInfo();
const monoFonts = mono.fonts.normal as Record<string, Record<string, string>>;
const notoFonts = noto.fonts.normal as Record<string, Record<string, string>>;
const interFonts = inter.fonts.normal as Record<string, Record<string, string>>;
const serifFonts = serif.fonts.normal as Record<string, Record<string, string>>;

const notoRanges = noto.unicodeRanges as Record<string, string>;
const subsets = [
  ...new Set([
    ...neededNotoSubsets(ALL_TEXT, inter.unicodeRanges.latin, notoRanges),
    ...notoSubsetsCjkFirst(ALL_TEXT_V2, notoRanges, mono.unicodeRanges.latin),
    ...notoSubsetsCjkFirst(ALL_TEXT_BW, notoRanges, inter.unicodeRanges.latin),
  ]),
].sort();
const serifSubsets = notoSubsetsCjkFirst(
  ALL_TEXT_BW,
  serif.unicodeRanges as Record<string, string>,
  inter.unicodeRanges.latin,
);

const jobs = [
  ...subsets.map((s) => ({ dir: NOTO_DIR, url: notoFonts["400"][s] })),
  ...serifSubsets.map((s) => ({ dir: SERIF_DIR, url: serifFonts["400"][s] })),
  { dir: INTER_DIR, url: interFonts["400"].latin },
  { dir: MONO_DIR, url: monoFonts["400"].latin },
];

for (const { dir, url } of jobs) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const out = join("public", localFontPath(dir, url));
  mkdirSync(dirname(out), { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(out, buf);
  console.log(`${out}  ${buf.length} bytes`);
}
console.log(`Noto Sans SC subsets: ${subsets.join(" ")}`);
console.log(`Noto Serif SC subsets: ${serifSubsets.join(" ")}`);
