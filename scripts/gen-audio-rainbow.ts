// Soundtrack of the Rainbow film, from src/rainbow/timeline.ts, written to
// public/audio/rainbow.wav. D major, 90 BPM, 30 bars: rain and a pad under
// the opening, the crane up rises into the title; harp arpeggios through the
// drop; a light groove under the cone; a lift for the double rainbow; the
// ending resolves to D. Sound effects sit on the picture's cues (rays
// entering and reflecting, the 48-ray sweep, the colours splitting, the sun
// climbing). Everything is synthesised (scripts/lib/synth.ts).
//   npm run audio:rainbow

import { at as barAt, BAR, BEAT, BPM, DURATION, FPS, M } from "../src/rainbow/timeline.ts";
import { synth } from "./lib/synth.ts";

const s = synth({ fps: FPS, frames: DURATION, seed: 11 });
const { music, sfx } = s;
const beatSec = 60 / BPM;

// ------------------------------------------------------------------ harmony
type Chord = { bass: number; pad: number[]; arp: number[] };
const CH: Record<string, Chord> = {
  D: { bass: 38, pad: [57, 62, 66, 69], arp: [62, 66, 69, 74, 78, 74, 69, 66] },
  Bm: { bass: 35, pad: [59, 62, 66, 71], arp: [59, 62, 66, 71, 74, 71, 66, 62] },
  G: { bass: 31, pad: [59, 62, 67, 71], arp: [55, 59, 62, 67, 71, 67, 62, 59] },
  A: { bass: 33, pad: [57, 61, 64, 69], arp: [57, 61, 64, 69, 73, 69, 64, 61] },
  Em: { bass: 40, pad: [59, 64, 67, 71], arp: [52, 55, 59, 64, 67, 64, 59, 55] },
};
// one chord per bar
const CHORDS = ["D", "Bm", "G", "A", "D", "G", "Bm", "G", "D", "A", "Bm", "G", "Em", "G", "A", "D", "A", "Bm", "G", "Em", "A", "D", "A", "Bm", "G", "A", "G", "A", "D", "D"];
// celesta: [beat, beats, midi]
type Note = [number, number, number];
const MEL: Record<number, Note[]> = {
  0: [[1, 1, 74], [2, 2, 78]],
  1: [[0, 1, 78], [1, 1, 76], [2, 2, 74]],
  2: [[0, 2, 71], [2, 1, 74], [3, 1, 76]],
  3: [[0, 3, 76], [3, 1, 81]],
  4: [[0, 4, 81]],
  5: [[0, 1, 78], [1, 1, 76], [2, 2, 74]],
  7: [[2, 1, 74], [3, 1, 76]],
  8: [[0, 2, 78], [2, 2, 76]],
  10: [[0, 3, 81]],
  11: [[0, 1, 79], [1, 1, 78], [2, 2, 76]],
  13: [[0, 2, 79], [2, 2, 78]],
  14: [[0, 2, 76], [2, 2, 73]],
  15: [[0, 1, 74], [1, 1, 78], [2, 2, 81]],
  16: [[0, 1, 81], [1, 1, 79], [2, 2, 76]],
  17: [[0, 2, 78], [2, 2, 74]],
  18: [[0, 2, 79], [2, 1, 78], [3, 1, 76]],
  19: [[0, 4, 76]],
  20: [[0, 2, 73], [2, 2, 76]],
  21: [[0, 1, 74], [1, 1, 78], [2, 1, 81], [3, 1, 78]],
  22: [[0, 2, 76], [2, 2, 73]],
  23: [[0, 2, 78], [2, 2, 74]],
  24: [[0, 1, 79], [1, 1, 83], [2, 2, 86]],
  25: [[0, 2, 85], [2, 2, 81]],
  26: [[0, 2, 83], [2, 2, 79]],
  27: [[0, 2, 81], [2, 2, 76]],
  28: [[0, 4, 78]],
  29: [[0, 4, 74]],
};

for (let bar = 0; bar < 30; bar++) {
  const ch = CH[CHORDS[bar]];
  const b0 = barAt(bar);
  const intro = bar < 4;
  const last = bar >= 28;
  // pad
  const padG = intro ? 0.03 : bar < 6 ? 0.034 : bar < 15 ? 0.026 : bar < 23 ? 0.028 : 0.032;
  s.pad(music, b0, ch.pad, last && bar === 29 ? 4 * beatSec + 1.5 : 4 * beatSec, padG, intro ? 1.2 : 0.5);
  // harp arpeggio in 8ths from the drop on
  if (bar >= 6 && bar <= 27) {
    for (let k = 0; k < 8; k++) {
      const g = (bar < 15 ? 0.055 : 0.06) * (k % 2 ? 0.75 : 1);
      s.pluck(music, b0 + (k * BEAT) / 2, ch.arp[k] + (bar >= 23 ? 12 : 0), g, k % 2 ? 0.35 : -0.35);
    }
  }
  if (bar === 28) ch.arp.slice(0, 5).forEach((m, k) => s.pluck(music, b0 + k * 2, m + 12, 0.06, k % 2 ? 0.3 : -0.3, 0.998, 4));
  // bass
  if (bar >= 4 && bar <= 28) {
    s.bass(music, b0, ch.bass, 2 * beatSec - 0.05, 0.15);
    if (!last) s.bass(music, b0 + 2 * BEAT, ch.bass + 7, 2 * beatSec - 0.05, 0.12);
  }
  // groove under the cone and the double rainbow
  if (bar >= 15 && bar <= 25) {
    s.kick(music, b0, 0.32);
    s.kick(music, b0 + 2 * BEAT, 0.26);
    s.snap(music, b0 + BEAT, 0.1);
    s.snap(music, b0 + 3 * BEAT, 0.1);
  }
  if (bar >= 9 && bar <= 25) for (let k = 0; k < 8; k++) s.shaker(music, b0 + (k * BEAT) / 2, k % 2 ? 0.018 : 0.028, k % 2 ? 0.4 : -0.4);
  // celesta
  for (const [beat, len, m] of MEL[bar] ?? []) s.bell(music, b0 + beat * BEAT, m, len * beatSec, intro ? 0.065 : 0.06, 0.15);
}

// ------------------------------------------------------------------ sound effects
// rain under the landscape shots
s.rain(sfx, 0, M.dropIn + 10, 0.05);
s.rain(sfx, M.doubleSky - 10, DURATION, 0.045);
s.boom(sfx, 6, 0.12); // far thunder
s.shimmer(sfx, M.bowIn + 4, [86, 90, 93, 98], 0.035, 4); // the bow comes out
// the crane up
s.riser(sfx, M.rise, M.riseEnd + 6, 0.11, 5000);
s.whoosh(sfx, M.rise + 60, 0.08, 0, 1.6, 300, 1500);
// title
s.boom(sfx, M.title, 0.32);
s.shimmer(sfx, M.title, [81, 85, 88, 93, 97], 0.045, 3);
// dive into the drop
s.riser(sfx, M.dive, M.dropIn - 2, 0.12, 8000);
s.whoosh(sfx, M.dropIn - 8, 0.12, 0, 0.6, 800, 5000);
s.plip(sfx, M.dropIn, 0.32, 0, 520);
s.ping(sfx, M.dropIn + 2, 86, 0.04);
// one ray: in, reflection, out
s.ping(sfx, M.ray1, 88, 0.06, -0.3);
s.ping(sfx, M.ray1 + 20, 91, 0.06, 0.3);
s.ping(sfx, M.ray1 + 40, 95, 0.06, -0.1);
s.ping(sfx, M.angle1, 93, 0.045);
// 48 rays, a rising plink for each
const scale = [0, 2, 4, 5, 7, 9, 11];
for (let j = 0; j < 48; j++) {
  const deg = Math.floor(j / 3);
  const m = 74 + Math.floor(deg / 7) * 12 + scale[deg % 7];
  s.ping(sfx, Math.round(M.sweep + (j * 66) / 48), m, 0.022, ((j % 6) - 2.5) / 3);
}
// the pile-up at 42°
s.boom(sfx, M.pile, 0.18);
s.shimmer(sfx, M.pile, [86, 90, 93, 98], 0.04, 3);
s.bell(sfx, M.descartes, 81, 1.5, 0.04);
// white light into colours: a harp glissando up
for (let k = 0; k < 22; k++) {
  const m = 62 + Math.floor(k / 7) * 12 + scale[k % 7];
  s.pluck(sfx, M.split + 6 + Math.round(k * 1.4), m, 0.045, -0.6 + (k / 21) * 1.2, 0.997, 2.5);
}
s.ping(sfx, M.labels, 86, 0.04, -0.3);
s.ping(sfx, M.labels + 6, 81, 0.04, 0.3);
s.whoosh(sfx, M.order, 0.1, 0, 0.5);
// the cone
s.whoosh(sfx, M.coneIn, 0.1, 0, 0.6);
s.boom(sfx, M.coneIn, 0.2);
s.whoosh(sfx, M.orbit + 40, 0.09, 0, 2.4, 300, 1800);
s.shimmer(sfx, M.orbitEnd, [81, 86, 90, 93, 98], 0.045, 3);
s.kick(sfx, M.ground, 0.16);
// the sun climbs: a slow rising tone; the arc is gone when it passes 42°
s.voice(sfx, M.sunUp, (M.sunUpEnd - M.sunUp) / FPS, 0.025, 0, ((): ((t: number) => number) => {
  const o = s.sweep((t) => 220 * 2 ** (t / 3));
  const len = (M.sunUpEnd - M.sunUp) / FPS;
  return (t) => o(t) * s.env(t, 0.8, len, 0.6);
})(), 0.4);
const SUN42 = Math.round(M.sunUp + 0.66 * (M.sunUpEnd - M.sunUp));
[93, 90, 86, 81].forEach((m, k) => s.bell(sfx, SUN42 + k * 4, m, 0.5, 0.035, k % 2 ? 0.4 : -0.4, 0.8));
// the second viewer and their own cone; walking
s.pluck(sfx, M.second + 10, 78, 0.05, 0.4);
s.shimmer(sfx, M.second + 12, [86, 90, 93], 0.035, 3);
for (let f = M.walk; f < M.walk + 64; f += 10) s.voice(sfx, f, 0.08, 0.05, 0, ((): ((t: number) => number) => {
  const n = s.lp(s.bandNoise(() => 900, 1.2), 2500);
  return (t) => n(t) * Math.exp(-t * 60);
})());
// two reflections
const f0 = M.twoBounce + 4;
[86, 90, 93, 98].forEach((m, k) => s.ping(sfx, f0 + 14 + k * 12, m, 0.055, -0.4 + k * 0.27));
s.whoosh(sfx, M.doubleSky, 0.1, 0, 0.6);
s.shimmer(sfx, M.doubleSky + 6, [83, 86, 90, 95], 0.04, 4);
s.bell(sfx, M.darkBand, 62, 2, 0.04, 0, 0.6);
// the centre: one ping for each radius drawn out to the bow
[81, 83, 86, 88, 90].forEach((m, k) => s.ping(sfx, M.centre + k * 5, m, 0.04, -0.5 + k * 0.25));
// end title
s.boom(sfx, M.endTitle, 0.24);
s.shimmer(sfx, M.endTitle, [74, 78, 81, 86, 90, 93], 0.045, 4);

const out = s.write("public/audio/rainbow.wav", { fadeOut: 1.2 });
console.log(`public/audio/rainbow.wav  ${out.seconds.toFixed(2)}s  peak-normalised x${out.norm.toFixed(2)}  (${BAR} frames per bar)`);
