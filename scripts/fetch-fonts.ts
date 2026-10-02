// Downloads the Noto Sans SC / Inter / JetBrains Mono woff2 files that Intro
// and IntroV2 need into public/fonts/, using the URLs and unicode ranges from
// @remotion/google-fonts.
// Re-run (npm run fonts) whenever on-screen text gains new characters.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getInfo as getInterInfo } from "@remotion/google-fonts/Inter";
import { getInfo as getMonoInfo } from "@remotion/google-fonts/JetBrainsMono";
import { getInfo as getNotoInfo } from "@remotion/google-fonts/NotoSansSC";
import { ALL_TEXT } from "../src/intro/timeline.ts";
import { ALL_TEXT_V2 } from "../src/intro-v2/timeline.ts";
import {
  INTER_DIR,
  localFontPath,
  MONO_DIR,
  NOTO_DIR,
  neededNotoSubsets,
  notoSubsetsCjkFirst,
} from "../src/intro/font-subsets.ts";

const noto = getNotoInfo();
const inter = getInterInfo();
const mono = getMonoInfo();
const monoFonts = mono.fonts.normal as Record<string, Record<string, string>>;
const notoFonts = noto.fonts.normal as Record<string, Record<string, string>>;
const interFonts = inter.fonts.normal as Record<string, Record<string, string>>;

const notoRanges = noto.unicodeRanges as Record<string, string>;
const subsets = [
  ...new Set([
    ...neededNotoSubsets(ALL_TEXT, inter.unicodeRanges.latin, notoRanges),
    ...notoSubsetsCjkFirst(ALL_TEXT_V2, notoRanges, mono.unicodeRanges.latin),
  ]),
].sort();

const jobs = [
  ...subsets.map((s) => ({ dir: NOTO_DIR, url: notoFonts["400"][s] })),
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
