// Downloads the Fredoka (headings) woff2 for the jinmyaigc promo into
// public/fonts/fredoka/. The promo's text is English only, so the latin
// subset is enough; Inter (body text) is already in public/fonts/inter/.
//   npm run fonts:jinmy

import { mkdirSync, writeFileSync } from "node:fs";
import { getInfo } from "@remotion/google-fonts/Fredoka";

const fonts = getInfo().fonts.normal as Record<string, Record<string, string>>;
// Fredoka is a variable font: every weight points at the same file
const url = fonts["600"].latin;
const res = await fetch(url);
if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
mkdirSync("public/fonts/fredoka", { recursive: true });
const buf = Buffer.from(await res.arrayBuffer());
writeFileSync("public/fonts/fredoka/fredoka-latin.woff2", buf);
console.log(`public/fonts/fredoka/fredoka-latin.woff2  ${buf.length} bytes  (${url})`);
