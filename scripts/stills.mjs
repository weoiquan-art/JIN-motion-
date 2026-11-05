// Render many frames of any composition in one go (one bundle, one browser):
//   node scripts/stills.mjs <composition> <out-dir> <scale> <frame> [<frame> ...]
// e.g. node scripts/stills.mjs SelfBlame out/stills 0.5 0 60 120
// Much faster than calling `remotion still` once per frame.
// Browser: REMOTION_BROWSER if set (the cloud container's headless shell lives at
// /opt/pw-browsers/...), otherwise the Chrome Headless Shell that Remotion
// downloads by itself (what a local Windows / Mac machine uses).
// (Taken from the jinmyaigc branch and changed only in the browser default.)

import { bundle } from "@remotion/bundler";
import { ensureBrowser, openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [id, outDir, scaleArg, ...frames] = process.argv.slice(2);
if (!id || !outDir || frames.length === 0) {
  console.error("usage: node scripts/stills.mjs <composition> <out-dir> <scale> <frame> [<frame> ...]");
  process.exit(1);
}
const scale = Number(scaleArg) || 0.5;
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
mkdirSync(outDir, { recursive: true });

if (!browserExecutable) await ensureBrowser();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), rspack: true });
const browser = await openBrowser("chrome", { browserExecutable });
const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser });
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
