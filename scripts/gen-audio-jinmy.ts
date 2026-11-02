// Synthesises the jinmyaigc promo soundtrack from src/jinmy/timeline.ts and
// writes public/audio/jinmy.wav. No samples: a 120 BPM F-major pop groove
// (pad, marimba, bell lead, bass, kick, clap, shaker) and the sound effects
// of the picture (camera shutter on the freeze, the photo landing, progress
// ticks, swipes, the final sparkle). The music is ducked under the clips'
// own sound (see DUCK); the clips themselves are mixed in by Remotion.
//   npm run audio:jinmy

import { mkdirSync, writeFileSync } from "node:fs";
import { at as barAt, BEAT, DUCK, DURATION, FPS, M, S } from "../src/jinmy/timeline.ts";

const SR = 48000;
const N = Math.ceil((DURATION / FPS) * SR);
const smp = (frame: number) => Math.round((frame / FPS) * SR);

type Bus = Float32Array[];
const bus = (): Bus => [new Float32Array(N), new Float32Array(N)];
const music = bus();
const sfx = bus();
const send = bus(); // reverb send

let seed = 7;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

const voice = (b: Bus, frame: number, seconds: number, gain: number, pan: number, fn: (t: number) => number, rev = 0) => {
  const start = smp(frame);
  const len = Math.floor(seconds * SR);
  const gl = gain * Math.sqrt((1 - pan) / 2);
  const gr = gain * Math.sqrt((1 + pan) / 2);
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx < 0 || idx >= N) continue;
    const v = fn(i / SR);
    b[0][idx] += v * gl;
    b[1][idx] += v * gr;
    if (rev) {
      send[0][idx] += v * gl * rev;
      send[1][idx] += v * gr * rev;
    }
  }
};
const sweep = (f: (t: number) => number) => {
  let ph = 0;
  let last = 0;
  return (t: number) => {
    ph += 2 * Math.PI * f(t) * (t - last);
    last = t;
    return Math.sin(ph);
  };
};
// state-variable band-pass on white noise; the centre may move over time
const bandNoise = (center: (t: number) => number, q = 2) => {
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
const lp = (fn: (t: number) => number, cut: number) => {
  let y = 0;
  const a = 1 - Math.exp((-2 * Math.PI * cut) / SR);
  return (t: number) => (y += a * (fn(t) - y));
};
const env = (t: number, a: number, len: number, r: number) => Math.min(1, t / a) * Math.min(1, Math.max(0, (len - t) / r));

// ------------------------------------------------------------------ instruments
const marimba = (frame: number, midi: number, g: number, pan: number) => {
  const f = hz(midi);
  const click = bandNoise(() => 2600, 2);
  voice(music, frame, 0.8, g, pan, (t) =>
    Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 6) + 0.25 * Math.sin(2 * Math.PI * f * 3.93 * t) * Math.exp(-t * 24) + click(t) * 0.4 * Math.exp(-t * 400), 0.2);
};
const bell = (b: Bus, frame: number, midi: number, beats: number, g: number, pan = 0.1) => {
  const f = hz(midi);
  const len = (beats * BEAT) / FPS + 0.8;
  voice(b, frame, len, g, pan, (t) => {
    const idx = 1.5 * Math.exp(-t * 3.5);
    const e = Math.min(1, t / 0.005) * Math.exp(-t * 1.3) * Math.min(1, Math.max(0, (len - t) / 0.4));
    return e * (Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * f * 2 * t)) + 0.1 * Math.sin(2 * Math.PI * f * 4.01 * t) * Math.exp(-t * 6));
  }, 0.4);
};
const pad = (frame: number, notes: number[], beats: number, g: number) => {
  const len = (beats * BEAT) / FPS + 0.6;
  notes.forEach((m, i) => {
    const f = hz(m);
    voice(music, frame, len, g, i % 2 ? 0.35 : -0.35, (t) => {
      const e = env(t, 0.35, len, 0.6) * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.4 * t + i));
      let s = 0;
      for (const d of [-0.004, 0.004]) s += Math.sin(2 * Math.PI * f * (1 + d) * t + i) + 0.25 * Math.sin(4 * Math.PI * f * (1 + d) * t) + 0.08 * Math.sin(6 * Math.PI * f * (1 + d) * t);
      return e * s * 0.5;
    }, 0.45);
  });
};
const bass = (frame: number, midi: number, beats: number, g: number) => {
  const f = hz(midi);
  const len = (beats * BEAT) / FPS;
  voice(music, frame, len + 0.04, g, 0, (t) => {
    const e = Math.min(1, t / 0.006) * (0.6 + 0.4 * Math.exp(-t * 9)) * Math.min(1, Math.max(0, (len + 0.04 - t) / 0.05));
    return e * Math.tanh(1.5 * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)));
  });
};
const kick = (frame: number, g: number) => {
  const osc = sweep((t) => 48 + 95 * Math.exp(-t * 32));
  voice(music, frame, 0.32, g, 0, (t) => osc(t) * Math.exp(-t * 10) + 0.15 * (t < 0.004 ? rnd() : 0));
};
const clap = (frame: number, g: number) => {
  const n = bandNoise(() => 1500, 1.3);
  voice(music, frame, 0.2, g, 0.1, (t) => n(t) * (Math.exp(-t * 38) + 0.7 * (t > 0.011 ? Math.exp(-(t - 0.011) * 45) : 0) + 0.5 * (t > 0.022 ? Math.exp(-(t - 0.022) * 30) : 0)), 0.3);
};
const shaker = (frame: number, g: number, pan: number) => {
  const n = bandNoise(() => 8000, 1.2);
  voice(music, frame, 0.06, g, pan, (t) => n(t) * Math.min(1, t / 0.008) * Math.exp(-t * 60));
};

// ------------------------------------------------------------------ harmony
// intro IV–V lifts into I on the drop (bar 2), then I–V–vi–IV; the ending is
// IV–V–I again. Pad voicings around middle C, bass an octave and a half down.
type Chord = { bass: number; pad: number[]; arp: number[] };
const CH: Record<string, Chord> = {
  F: { bass: 41, pad: [60, 65, 69, 72], arp: [65, 69, 72, 77, 72, 69, 72, 76] },
  C: { bass: 36, pad: [60, 64, 67, 72], arp: [64, 67, 72, 76, 72, 67, 72, 74] },
  Dm: { bass: 38, pad: [62, 65, 69, 74], arp: [65, 69, 74, 77, 74, 69, 74, 76] },
  Bb: { bass: 34, pad: [58, 62, 65, 70], arp: [62, 65, 70, 74, 70, 65, 70, 72] },
};
const CHORDS = ["Bb", "C", "F", "C", "Dm", "Bb", "F", "C", "Dm", "Bb", "Bb", "C", "F"]; // one per bar

// lead: [beat, beats, midi]
type Note = [number, number, number];
const MOTIF_A: Note[] = [[0, 0.5, 72], [0.5, 0.5, 74], [1, 1, 77], [2, 0.5, 76], [2.5, 0.5, 74], [3, 1, 72]];
const MOTIF_B: Note[] = [[0, 1, 76], [1, 0.5, 74], [1.5, 0.5, 72], [2, 2, 69]];
const MOTIF_C: Note[] = [[0, 0.5, 74], [0.5, 0.5, 77], [1, 1, 81], [2, 1, 79], [3, 1, 77]];
const MOTIF_D: Note[] = [[0, 1.5, 76], [1.5, 0.5, 74], [2, 2, 72]];
const LEAD: Record<number, Note[]> = {
  0: [[0, 1, 65], [1, 1, 69], [2, 2, 72]],
  1: [[0, 1, 67], [1, 1, 72], [2, 1, 76], [3, 1, 74]],
  2: [[0, 3, 77], [3, 1, 76]], // one long bell on the freeze, then into the tune
  3: MOTIF_A, 4: MOTIF_B, 5: MOTIF_C, 6: MOTIF_D,
  8: MOTIF_A, 9: MOTIF_B,
  10: MOTIF_C, 11: [[0, 1, 79], [1, 1, 77], [2, 1, 76], [3, 1, 79]],
  12: [[0, 4, 77]],
};

for (let bar = 0; bar < 13; bar++) {
  const ch = CH[CHORDS[bar]];
  const b0 = barAt(bar);
  const last = bar === 12;
  const intro = bar < 2;
  pad(b0, ch.pad, last ? 8 : 4, intro ? 0.03 : last ? 0.045 : 0.026);
  if (!intro) {
    // marimba 8ths; the last bar only rings the chord once
    for (let k = 0; k < 8; k++) {
      if (last && k > 0) break;
      marimba(b0 + (k * BEAT) / 2, ch.arp[k], k % 2 ? 0.05 : 0.065, k % 2 ? 0.4 : -0.4);
    }
    // bass: root, octave bounce, root, fifth
    if (last) bass(b0, ch.bass, 8, 0.2);
    else {
      bass(b0, ch.bass, 1.2, 0.2);
      bass(b0 + BEAT * 1.5, ch.bass + 12, 0.4, 0.13);
      bass(b0 + BEAT * 2, ch.bass, 0.9, 0.18);
      bass(b0 + BEAT * 3, ch.bass + 7, 0.9, 0.15);
    }
    // drums
    if (!last) {
      kick(b0, 0.42);
      kick(b0 + BEAT * 2, 0.36);
      if (bar % 2) kick(b0 + BEAT * 2.5, 0.2);
      clap(b0 + BEAT, 0.24);
      clap(b0 + BEAT * 3, 0.24);
      for (let s = 0; s < 16; s++) shaker(b0 + (s * BEAT) / 4, s % 4 === 2 ? 0.06 : 0.03, s % 2 ? 0.45 : -0.45);
    } else kick(b0, 0.45);
  } else if (bar === 1) {
    for (let s = 8; s < 16; s++) shaker(b0 + (s * BEAT) / 4, 0.025 + s * 0.002, s % 2 ? 0.45 : -0.45);
  }
  for (const [beat, beats, m] of LEAD[bar] ?? []) bell(music, b0 + beat * BEAT, m, beats, intro ? 0.06 : bar >= 10 ? 0.09 : 0.07);
}

// ------------------------------------------------------------------ effects
const riser = (from: number, to: number, g: number) => {
  const len = (to - from) / FPS;
  const r = bandNoise((t) => 400 + 6000 * (t / len) ** 2, 1.3);
  voice(sfx, from, len, g, 0, (t) => r(t) * (t / len) ** 2.4, 0.3);
};
const whoosh = (center: number, g: number, pan = 0, len = 0.5) => {
  const n = lp(bandNoise((t) => 500 + 3800 * Math.sin(Math.PI * Math.min(1, t / len)), 1.1), 6000);
  voice(sfx, center - Math.round((len / 2) * FPS), len, g, pan, (t) => n(t) * Math.sin(Math.PI * Math.min(1, t / len)) ** 2, 0.2);
};
// a camera shutter: two mechanical clicks and a short whirr
const shutter = (frame: number, g: number) => {
  const a = bandNoise(() => 3200, 1.6);
  const b = bandNoise(() => 2200, 1.4);
  voice(sfx, frame, 0.03, g, 0, (t) => a(t) * Math.exp(-t * 180));
  voice(sfx, frame + 2, 0.05, g * 0.8, 0, (t) => b(t) * Math.exp(-t * 120), 0.2);
  const w = bandNoise(() => 900, 3);
  voice(sfx, frame + 1, 0.09, g * 0.25, 0, (t) => w(t) * Math.sin(Math.PI * t / 0.09));
};
const impact = (frame: number, g: number) => {
  const o = sweep((t) => 38 + 60 * Math.exp(-t * 14));
  voice(sfx, frame, 0.9, g, 0, (t) => o(t) * Math.exp(-t * 5));
  const n = lp(bandNoise(() => 700, 0.9), 2500);
  voice(sfx, frame, 0.5, g * 0.4, 0, (t) => n(t) * Math.exp(-t * 9), 0.5);
};
// the photo lands on its slot: a soft thud and a paper flap
const land = (frame: number, g: number) => {
  const o = sweep((t) => 90 + 60 * Math.exp(-t * 40));
  voice(sfx, frame, 0.25, g, 0, (t) => o(t) * Math.exp(-t * 18));
  const n = bandNoise(() => 1800, 1.2);
  voice(sfx, frame, 0.08, g * 0.5, 0.1, (t) => n(t) * Math.exp(-t * 60));
};
const tick = (frame: number, g: number, pan = 0) => {
  const n = bandNoise(() => 4200, 2.5);
  voice(sfx, frame, 0.03, g, pan, (t) => n(t) * Math.exp(-t * 220));
};
const ding = (frame: number, g: number) => {
  for (const [r, a] of [[1, 1], [2.0, 0.35], [3.01, 0.15]] as const)
    voice(sfx, frame, 1.6, g * a, 0.05, (t) => Math.sin(2 * Math.PI * hz(84) * r * t) * Math.exp(-t * (2.2 + r)) * Math.min(1, t / 0.003), 0.5);
};
const sparkle = (frame: number, notes: number[], g: number) => notes.forEach((m, i) => bell(sfx, frame + i * 2, m, 0.5, g, i % 2 ? 0.5 : -0.5));

riser(barAt(1, 1), M.shutter, 0.22); // into the drop
shutter(M.shutter, 0.55);
impact(M.shutter, 0.5);
whoosh(M.lift + 6, 0.16, -0.2, 0.4); // the photo is lifted...
land(M.land, 0.42); // ...and lands
M.progress.forEach((f, i) => tick(f, 0.12 + i * 0.02, i % 2 ? 0.3 : -0.3));
ding(M.done, 0.12);
sparkle(M.done + 2, [84, 88, 91], 0.025);
whoosh(M.swipeToPick, 0.2, 0, 0.45);
M.hops.forEach((f, i) => tick(f, 0.14, i % 2 ? 0.4 : -0.4));
tick(M.chosen, 0.2, 0.4);
sparkle(M.chosen + 1, [86, 89, 93], 0.03);
whoosh(M.expand + 2, 0.2, 0, 0.5);
whoosh(M.second + 2, 0.16, 0.2, 0.45);
riser(barAt(9, 2), S.cta.from, 0.16);
whoosh(S.cta.from + 3, 0.18, 0, 0.55);
for (let i = 0; i < 3; i++) whoosh(S.cta.from + 10 + i * 5, 0.07, i === 1 ? 0 : i ? 0.5 : -0.5, 0.3);
ding(M.url, 0.1);
impact(M.final, 0.32);
sparkle(M.final, [77, 81, 84, 89, 93], 0.05);

// ------------------------------------------------------------------ mix
const reverb = (input: Float32Array, spread: number) => {
  const out = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(d + spread), i: 0, store: 0 }));
  const aps = [556, 441].map((d) => ({ buf: new Float32Array(d + spread), i: 0 }));
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.store = y * 0.7 + c.store * 0.3;
      c.buf[c.i] = input[n] + c.store * 0.84;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    for (const a of aps) {
      const y = a.buf[a.i];
      a.buf[a.i] = s + y * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      s = y - s;
    }
    out[n] = s * 0.25;
  }
  return out;
};
const wet = [reverb(send[0], 0), reverb(send[1], 23)];

// duck the music (and its reverb) under the clips' own sound, 0.25 s ramps
const ramp = Math.round(0.25 * SR);
const duck = new Float32Array(N).fill(1);
for (const d of DUCK) {
  const a = smp(d.from);
  const b = smp(d.to);
  for (let i = Math.max(0, a - ramp); i < Math.min(N, b + ramp); i++) {
    const k = i < a ? (i - (a - ramp)) / ramp : i > b ? 1 - (i - b) / ramp : 1;
    duck[i] = Math.min(duck[i], 1 - (1 - d.gain) * Math.max(0, Math.min(1, k)));
  }
}

const out = [new Float32Array(N), new Float32Array(N)];
const fadeFrom = N - Math.round(0.6 * SR);
let peak = 0;
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    let v = Math.tanh(((music[c][i] + wet[c][i] * 0.8) * duck[i] + sfx[c][i]) * 1.1);
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
writeFileSync("public/audio/jinmy.wav", Buffer.concat([header, data]));
console.log(`public/audio/jinmy.wav  ${(N / SR).toFixed(2)}s  peak-normalised x${norm.toFixed(2)}`);
