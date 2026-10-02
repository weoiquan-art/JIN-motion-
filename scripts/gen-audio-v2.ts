// Synthesises the IntroV2 soundtrack from the shared timeline and the
// template edit history, and writes public/audio/intro-v2.wav. No samples.
//   npm run audio:v2

import { mkdirSync, writeFileSync } from "node:fs";
import { BUILT } from "../src/intro-v2/doc.ts";
import {
  DOC,
  DURATION,
  FPS,
  GLITCH_CARDS,
  INTRO_A,
  INTRO_B,
  LOGO_BURST,
  logoDock,
  S,
  SLAMS,
  VERSIONS,
} from "../src/intro-v2/timeline.ts";

const SR = 48000;
const N = Math.ceil((DURATION / FPS) * SR);
const at = (frame: number) => Math.round((frame / FPS) * SR);

// main: everything up to the stop (hard-gated at S.stop); post: press + chord
const main = [new Float32Array(N), new Float32Array(N)];
const post = [new Float32Array(N), new Float32Array(N)];

let seed = 7;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};
const r01 = () => (rnd() + 1) / 2;

type Bus = Float32Array[];
const voice = (bus: Bus, frame: number, seconds: number, gain: number, pan: number, fn: (t: number) => number) => {
  const start = at(frame);
  const len = Math.floor(seconds * SR);
  const gl = gain * Math.sqrt((1 - pan) / 2);
  const gr = gain * Math.sqrt((1 + pan) / 2);
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx < 0 || idx >= N) continue;
    const v = fn(i / SR);
    bus[0][idx] += v * gl;
    bus[1][idx] += v * gr;
  }
};
const sweep = (hz: (t: number) => number) => {
  let ph = 0;
  let last = 0;
  return (t: number) => {
    ph += 2 * Math.PI * hz(t) * (t - last);
    last = t;
    return Math.sin(ph);
  };
};
// 2-pole resonant band-pass on white noise (state-variable filter)
const bandNoise = (center: number, q = 2) => {
  let low = 0;
  let band = 0;
  const fq = 2 * Math.sin((Math.PI * Math.min(center, SR / 6)) / SR);
  return () => {
    const high = rnd() - low - band / q;
    band += fq * high;
    low += fq * band;
    return band;
  };
};
// band-pass whose centre moves over time (filter state kept across samples)
const sweepNoise = (center: (t: number) => number, q = 2) => {
  let low = 0;
  let band = 0;
  return (t: number) => {
    const fq = 2 * Math.sin((Math.PI * Math.min(center(t), SR / 6)) / SR);
    const high = rnd() - low - band / q;
    band += fq * high;
    low += fq * band;
    return band;
  };
};
const lowNoise = (cut: number) => {
  let y = 0;
  const a = 1 - Math.exp((-2 * Math.PI * cut) / SR);
  return () => (y += a * (rnd() - y));
};

// ------------------------------------------------------------------ sounds
// mechanical key: band-limited click + small low "thock", a bit different each time
const keyDown = (frame: number, g: number) => {
  const bp = bandNoise(2600 + 1600 * r01(), 3);
  const thock = 135 + 60 * r01();
  const pan = rnd() * 0.35;
  voice(main, frame, 0.05, g, pan, (t) => bp() * 2.2 * Math.exp(-t * 420) + Math.sin(2 * Math.PI * thock * t) * 0.55 * Math.exp(-t * 90));
  voice(main, frame + 0.0015 * FPS, 0.004, g * 0.6, pan, () => rnd() * (1 - 0)); // tiny top click
};
const backspace = (frame: number, g: number) => {
  const bp = bandNoise(4300 + 900 * r01(), 4);
  voice(main, frame, 0.03, g, 0.25, (t) => bp() * 2 * Math.exp(-t * 600) + Math.sin(2 * Math.PI * 230 * t) * 0.25 * Math.exp(-t * 140));
};
const swish = (frame: number, g: number) => {
  const n = sweepNoise((t) => 2000 + 3000 * (t / 0.09));
  voice(main, frame, 0.09, g, -0.2, (t) => n(t) * Math.sin((Math.PI * t) / 0.09));
};
const blip = (frame: number, hz: number, g: number, pan = 0, len = 0.035) =>
  voice(main, frame, len, g, pan, (t) => Math.sin(2 * Math.PI * hz * t) * Math.exp(-t * 60));
const thud = (frame: number, g: number) => {
  const osc = sweep((t) => 48 + 36 * Math.exp(-t * 14));
  const lp = lowNoise(500);
  voice(main, frame, 0.42, g, 0, (t) => Math.tanh(1.6 * (osc(t) * Math.exp(-t * 9) + lp() * 1.2 * Math.exp(-t * 22))));
};
const crackle = (frame: number, g: number) => {
  let hold = 0;
  voice(main, frame, 0.06, g, 0.4, (t) => {
    if (Math.floor(t * SR) % 9 === 0) hold = Math.round(rnd() * 3) / 3;
    return hold * (1 - t / 0.06);
  });
};
const kick = (frame: number, g: number) => {
  const osc = sweep((t) => 44 + 110 * Math.exp(-t * 32));
  voice(main, frame, 0.38, g, 0, (t) => osc(t) * Math.exp(-t * 10));
};
const hat = (frame: number, g: number, pan: number) => {
  const bp = bandNoise(8000, 1.2);
  voice(main, frame, 0.04, g, pan, (t) => bp() * Math.exp(-t * 110));
};
const slamHit = (frame: number, g: number) => {
  const sub = sweep((t) => 32 + 60 * Math.exp(-t * 7));
  const lp = lowNoise(1100);
  voice(main, frame, 1.2, g, 0, (t) => Math.tanh(2 * (sub(t) * Math.exp(-t * 3) + lp() * Math.exp(-t * 10))));
  const bp = bandNoise(1800, 1.5);
  voice(main, frame, 0.25, g * 0.5, 0, (t) => bp() * 2 * Math.exp(-t * 18));
};
const softImpact = (frame: number, g: number) => {
  const osc = sweep((t) => 40 + 50 * Math.exp(-t * 18));
  const lp = lowNoise(1500);
  voice(main, frame, 0.35, g, 0, (t) => osc(t) * Math.exp(-t * 10) + lp() * 0.5 * Math.exp(-t * 30));
};

// ------------------------------------------------------------------ score
// 0–4s: a very light bed, then almost nothing through the confession
voice(main, 0, 4.9, 0.05, 0, (t) => {
  const env = Math.min(1, t / 1.5) * Math.min(1, Math.max(0, (4.9 - t) / 1.2));
  return env * (Math.sin(2 * Math.PI * 98 * t) * 0.8 + Math.sin(2 * Math.PI * 147 * t) * 0.5 * (0.7 + 0.3 * Math.sin(t * 0.9)));
});
blip(INTRO_A.in, 1250, 0.05);
blip(INTRO_B.in, 1250, 0.04);
softImpact(LOGO_BURST, 0.5);
for (let i = 0; i < 4; i++) blip(logoDock(i) + 9, 2600, 0.03, 0.6, 0.012);

// template appears: a breath of air, then skeleton rows tick in
{
  const air = lowNoise(900);
  voice(main, DOC.appear, 0.5, 0.05, 0, (t) => air() * Math.sin((Math.PI * t) / 0.5));
}
for (let i = 0; i < 6; i++) blip(DOC.rowsIn + i * 4, 1900, 0.02, -0.2, 0.012);

// keystrokes / backspaces / strikes straight from the edit history
for (const b of BUILT) {
  const loud = b.start < S.loop2 ? 0.36 : b.start < S.loop3 ? 0.28 : 0.22;
  if (b.op.kind === "type") for (const r of b.recs) keyDown(r.born, loud);
  if (b.op.kind === "erase") for (const r of b.recs) backspace(r.gone, loud * 0.75);
  if (b.op.kind === "strike") swish(b.start, loud * 0.5);
}
for (const v of VERSIONS) if (v.f < S.stop) {
  blip(v.f, 1320, 0.05, 0.3);
  blip(v.f + 1.2, 1760, 0.04, 0.3);
}

// failed results: a digital crackle as they pop, a dull thud on the ✕
for (const g of GLITCH_CARDS) {
  crackle(g.pop, 0.05);
  thud(g.mark, g.mark < S.loop2 ? 0.6 : 0.45);
}

// second loop: a quiet pulse starts underneath
for (let f = S.loop2 + 4; f < S.loop3; f += 15) kick(f, 0.12);
voice(main, S.loop2, (S.loop3 - S.loop2) / FPS + 0.3, 0.025, 0, (t) => {
  const env = Math.min(1, t / 2);
  return env * (Math.sin(2 * Math.PI * 110 * t) + 0.5 * Math.sin(2 * Math.PI * 164.8 * t));
});

// third loop: dense, everything stacks up to the peak
for (const b of BUILT) if (b.start >= S.loop3 && b.start < S.stop) kick(b.start, 0.3);
for (let f = S.loop3; f < S.stop; f += 7.5) kick(f, 0.18);
for (let f = S.loop3, k = 0; f < S.stop; f += f < 540 ? 3 : 2, k++) hat(f, 0.05 + 0.05 * ((f - S.loop3) / 150), k % 2 ? 0.4 : -0.4);
for (const s of SLAMS) slamHit(s.f, 0.85);
{
  const len = (S.stop - 540) / FPS;
  const riser = sweepNoise((t) => 400 + 5000 * (t / len), 1.5);
  voice(main, 540, len, 0.12, 0, (t) => riser(t) * (t / len) ** 2 * 2);
}
voice(main, S.loop3, (S.stop - S.loop3) / FPS, 0.04, 0, (t) => {
  const u = t / ((S.stop - S.loop3) / FPS);
  const hz = 55 * (1 + u * 0.5);
  return Math.sin(2 * Math.PI * hz * t) * (0.3 + 0.7 * u);
});

// 20s: hard stop — nothing at all until the button
const stop = at(S.stop);
for (let c = 0; c < 2; c++) for (let i = stop; i < N; i++) main[c][i] = 0;

// generate: one clean key
{
  const bp = bandNoise(3200, 3);
  voice(post, S.press, 0.06, 0.45, 0, (t) => bp() * 2 * Math.exp(-t * 300) + Math.sin(2 * Math.PI * 170 * t) * 0.6 * Math.exp(-t * 70));
  const tick = bandNoise(2600, 3);
  voice(post, S.press + 6, 0.03, 0.18, 0, (t) => tick() * 2 * Math.exp(-t * 400));
}

// success: a warm chord that rings out to the end
const CHORD = [130.81, 196.0, 329.63, 493.88, 587.33]; // Cmaj9
const chordLen = (DURATION - S.success) / FPS;
voice(post, S.success, chordLen, 0.075, 0, (t) => {
  const env = Math.min(1, t / 0.35) * Math.exp(-t / 3.2) * Math.min(1, Math.max(0, (chordLen - t) / 1.5));
  let s = 0;
  CHORD.forEach((hz, i) => {
    for (const det of [-0.0009, 0.0009]) s += Math.sin(2 * Math.PI * hz * (1 + det) * t + i) * (1 - i * 0.12);
    s += 0.18 * Math.sin(4 * Math.PI * hz * t);
  });
  return env * s;
});
// end text: one soft bell, then the tail is let go
voice(post, S.endText, 3, 0.06, 0, (t) =>
  [1, 2.01, 3.02].reduce((s, r, i) => s + Math.sin(2 * Math.PI * 784 * r * t) * Math.exp(-t / (1.4 - i * 0.4)) * (1 - i * 0.35), 0) * Math.min(1, t / 0.004),
);

// ------------------------------------------------------------------ mix
const echo = (bus: Bus, a: number, b: number, fb: number) => {
  const dl = Math.floor(a * SR);
  const dr = Math.floor(b * SR);
  for (let i = 0; i < N; i++) {
    if (i >= dl) bus[0][i] += bus[1][i - dl] * fb;
    if (i >= dr) bus[1][i] += bus[0][i - dr] * fb;
  }
};
echo(post, 0.19, 0.23, 0.32);
// keep the stop silent even for echo tails
for (let c = 0; c < 2; c++) for (let i = stop; i < N; i++) main[c][i] = 0;

const out = [new Float32Array(N), new Float32Array(N)];
const fadeFrom = at(S.fadeOut);
let peak = 0;
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    let v = Math.tanh((main[c][i] + post[c][i]) * 1.1);
    if (i >= fadeFrom) v *= Math.max(0, 1 - (i - fadeFrom) / (N - fadeFrom));
    out[c][i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
}
const norm = 0.89 / peak;

const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(out[0][i] * norm * 32767), i * 4);
  data.writeInt16LE(Math.round(out[1][i] * norm * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);
mkdirSync("public/audio", { recursive: true });
writeFileSync("public/audio/intro-v2.wav", Buffer.concat([header, data]));
console.log(`public/audio/intro-v2.wav  ${(N / SR).toFixed(2)}s  peak-normalised x${norm.toFixed(2)}`);
