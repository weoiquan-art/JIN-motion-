// Downloads the Noto Sans SC / Noto Serif SC slices (and Inter) that SelfBlame's
// on-screen text needs into public/fonts/, skipping files that are already there.
// The text lives in src/self-blame/content.ts; timeline.ts collects it.
// Re-run after editing the text:  npm run fonts:self-blame

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getInfo as getInterInfo } from "@remotion/google-fonts/Inter";
import { getInfo as getSansInfo } from "@remotion/google-fonts/NotoSansSC";
import { getInfo as getSerifInfo } from "@remotion/google-fonts/NotoSerifSC";
import { INTER_DIR, localFontPath, NOTO_DIR, notoSubsetsCjkFirst, SERIF_DIR } from "../src/intro/font-subsets.ts";
import { ALL_TEXT_SB, ALL_TEXT_SB_SERIF } from "../src/self-blame/timeline.ts";

const inter = getInterInfo();
const sans = getSansInfo();
const serif = getSerifInfo();
const latin = inter.unicodeRanges.latin;
const files = (info: { fonts: unknown }) => (info.fonts as { normal: Record<string, Record<string, string>> }).normal["400"];

const sansSubsets = notoSubsetsCjkFirst(ALL_TEXT_SB, sans.unicodeRanges as Record<string, string>, latin);
const serifSubsets = notoSubsetsCjkFirst(ALL_TEXT_SB_SERIF, serif.unicodeRanges as Record<string, string>, latin);
const jobs = [
  ...sansSubsets.map((s) => ({ dir: NOTO_DIR, url: files(sans)[s] })),
  ...serifSubsets.map((s) => ({ dir: SERIF_DIR, url: files(serif)[s] })),
  { dir: INTER_DIR, url: files(inter).latin },
];

let fetched = 0;
for (const { dir, url } of jobs) {
  const out = join("public", localFontPath(dir, url));
  if (existsSync(out)) continue;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  mkdirSync(dirname(out), { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(out, buf);
  fetched++;
  console.log(`${out}  ${buf.length} bytes`);
}
console.log(`SelfBlame: Noto Sans SC ${sansSubsets.length} slices, Noto Serif SC ${serifSubsets.length} slices (${fetched} downloaded now)`);
console.log(`  sans:  ${sansSubsets.join(" ")}`);
console.log(`  serif: ${serifSubsets.join(" ")}`);
