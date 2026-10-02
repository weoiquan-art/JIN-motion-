// Downloads the Noto Sans SC / Inter woff2 files the Intro needs into
// public/fonts/, using the URLs and unicode ranges from @remotion/google-fonts.
// Re-run (npm run fonts) whenever on-screen text gains new characters.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getInfo as getInterInfo } from "@remotion/google-fonts/Inter";
import { getInfo as getNotoInfo } from "@remotion/google-fonts/NotoSansSC";
import { ALL_TEXT } from "../src/intro/timeline.ts";
import {
  INTER_DIR,
  localFontPath,
  NOTO_DIR,
  neededNotoSubsets,
} from "../src/intro/font-subsets.ts";

const noto = getNotoInfo();
const inter = getInterInfo();
const notoFonts = noto.fonts.normal as Record<string, Record<string, string>>;
const interFonts = inter.fonts.normal as Record<string, Record<string, string>>;

const subsets = neededNotoSubsets(
  ALL_TEXT,
  inter.unicodeRanges.latin,
  noto.unicodeRanges as Record<string, string>,
);

const jobs = [
  ...subsets.map((s) => ({ dir: NOTO_DIR, url: notoFonts["400"][s] })),
  { dir: INTER_DIR, url: interFonts["400"].latin },
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
