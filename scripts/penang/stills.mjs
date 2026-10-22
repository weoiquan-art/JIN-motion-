// Render many frames of PenangBridge in one go (one bundle, one browser):
//   node scripts/penang/stills.mjs <out-dir> <scale> <frame> [<frame> ...]
// e.g. node scripts/penang/stills.mjs /tmp/stills 0.5 30 120 514
// Much faster than calling `remotion still` once per frame.

import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [outDir, scaleArg, ...frames] = process.argv.slice(2);
if (!outDir || frames.length === 0) {
  console.error("usage: node scripts/penang/stills.mjs <out-dir> <scale> <frame> [<frame> ...]");
  process.exit(1);
}
const scale = Number(scaleArg) || 0.5;
const browserExecutable =
  process.env.REMOTION_BROWSER ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), rspack: true });
const browser = await openBrowser("chrome", { browserExecutable });
const composition = await selectComposition({ serveUrl, id: "PenangBridge", puppeteerInstance: browser });
for (const f of frames) {
  const t0 = Date.now();
  await renderStill({
    composition,
    serveUrl,
    output: path.join(outDir, `f${String(f).padStart(5, "0")}.png`),
    frame: Number(f),
    puppeteerInstance: browser,
    scale,
  });
  console.log(`frame ${f}  ${Date.now() - t0} ms`);
}
await browser.close({ silent: true });
