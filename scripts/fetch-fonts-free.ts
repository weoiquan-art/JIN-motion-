// Downloads the Noto Sans SC slices that IntroFree's text (src/content.ts)
// needs into public/fonts/, skipping files that are already there.
// Re-run after editing src/content.ts:  npm run fonts:free

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getInfo as getInterInfo } from "@remotion/google-fonts/Inter";
import { getInfo as getNotoInfo } from "@remotion/google-fonts/NotoSansSC";
import { ALL_TEXT_FREE } from "../src/content.ts";
import { localFontPath, NOTO_DIR, neededNotoSubsets } from "../src/intro/font-subsets.ts";

const noto = getNotoInfo();
const notoFonts = noto.fonts.normal as Record<string, Record<string, string>>;
const notoRanges = noto.unicodeRanges as Record<string, string>;
const subsets = neededNotoSubsets(ALL_TEXT_FREE, getInterInfo().unicodeRanges.latin, notoRanges);

let fetched = 0;
for (const subset of subsets) {
  const url = notoFonts["400"][subset];
  const out = join("public", localFontPath(NOTO_DIR, url));
  if (existsSync(out)) continue;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  mkdirSync(dirname(out), { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(out, buf);
  fetched++;
  console.log(`${out}  ${buf.length} bytes`);
}
console.log(`IntroFree needs ${subsets.length} Noto Sans SC slices (${fetched} downloaded now): ${subsets.join(" ")}`);
