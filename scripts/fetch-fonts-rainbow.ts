// Downloads the Noto Serif SC / Noto Sans SC / Inter woff2 slices that the
// Rainbow film needs into public/fonts/ and writes the list of slices to
// src/rainbow/font-subsets.json (read by src/rainbow/fonts.ts). Every
// non-ASCII character in src/rainbow/ is covered, so re-run after changing
// any text:  npm run fonts:rainbow

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getInfo as getInterInfo } from "@remotion/google-fonts/Inter";
import { getInfo as getSansInfo } from "@remotion/google-fonts/NotoSansSC";
import { getInfo as getSerifInfo } from "@remotion/google-fonts/NotoSerifSC";
import { INTER_DIR, localFontPath, NOTO_DIR, notoSubsetsCjkFirst, SERIF_DIR } from "../src/intro/font-subsets.ts";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });

// comments are left out (they hold symbols like π or λ that are never drawn)
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
const text = walk("src/rainbow")
  .map((p) => stripComments(readFileSync(p, "utf8")))
  .join("");

const inter = getInterInfo();
const sans = getSansInfo();
const serif = getSerifInfo();
const interFonts = inter.fonts.normal as Record<string, Record<string, string>>;
const sansFonts = sans.fonts.normal as Record<string, Record<string, string>>;
const serifFonts = serif.fonts.normal as Record<string, Record<string, string>>;

const sansSubsets = notoSubsetsCjkFirst(text, sans.unicodeRanges as Record<string, string>, inter.unicodeRanges.latin);
const serifSubsets = notoSubsetsCjkFirst(text, serif.unicodeRanges as Record<string, string>, inter.unicodeRanges.latin);

const jobs = [
  ...sansSubsets.map((s) => ({ dir: NOTO_DIR, url: sansFonts["400"][s] })),
  ...serifSubsets.map((s) => ({ dir: SERIF_DIR, url: serifFonts["400"][s] })),
  { dir: INTER_DIR, url: interFonts["400"].latin },
];

for (const { dir, url } of jobs) {
  const out = join("public", localFontPath(dir, url));
  try {
    statSync(out);
    continue; // already there (shared with the other films)
  } catch {
    // download it
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  mkdirSync(dirname(out), { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(out, buf);
  console.log(`${out}  ${buf.length} bytes`);
}

writeFileSync("src/rainbow/font-subsets.json", JSON.stringify({ sans: sansSubsets, serif: serifSubsets }, null, 2) + "\n");
console.log(`Noto Sans SC subsets: ${sansSubsets.join(" ")}`);
console.log(`Noto Serif SC subsets: ${serifSubsets.join(" ")}`);
