// Synthesises the Intro soundtrack (BGM + SFX) from the shared timeline and
// writes public/audio/intro.wav. No samples: every sound is generated here.
//   npm run audio

import { mkdirSync, writeFileSync } from "node:fs";
import { AUDIO, DURATION, FPS, T } from "../src/intro/timeline.ts";

const SR = 48000;
const N = Math.ceil((DURATION / FPS) * SR);
const at = (frame: number) => Math.round((frame / FPS) * SR);

// Two buses: the drum/FX bus is cut dead at the brake; the tone bus carries
// the calm intro pad, the long tone after the brake and the final bell.
const drums = [new Float32Array(N), new Float32Array(N)];
const tones = [new Float32Array(N), new Float32Array(N)];

let seed = 1;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};

type Bus = Float32Array[];
// Render a mono voice into a bus with a pan (-1..1).
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

// Phase-accumulating oscillator for pitch sweeps.
const sweepSine = (f0: (t: number) => number) => {
  let phase = 0;
  let last = 0;
  return (t: number) => {
    phase += 2 * Math.PI * f0(t) * (t - last);
    last = t;
    return Math.sin(phase);
  };
};

// One-pole filters on a noise source.
const noiseLP = (cut: number) => {
  let y = 0;
  const a = 1 - Math.exp((-2 * Math.PI * cut) / SR);
  return () => (y += a * (rnd() - y));
};
const noiseHP = (cut: number) => {
  const lp = noiseLP(cut);
  return () => rnd() - lp();
};

// ---------------------------------------------------------------- instruments
const kick = (frame: number, g: number) => {
  const osc = sweepSine((t) => 46 + 120 * Math.exp(-t * 30));
  voice(drums, frame, 0.5, g, 0, (t) => osc(t) * Math.exp(-t * 8) + (t < 0.004 ? rnd() * 0.6 : 0));
};

const snare = (frame: number, g: number, pan = 0) => {
  const hp = noiseHP(1400);
  voice(drums, frame, 0.28, g, pan, (t) => hp() * Math.exp(-t * 20) * 0.9 + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 32) * 0.6);
};

const hat = (frame: number, g: number, pan: number) => {
  const hp = noiseHP(7000);
  voice(drums, frame, 0.07, g, pan, (t) => hp() * Math.exp(-t * 75));
};

const bass = (frame: number, hz: number, g: number) => {
  let y = 0;
  voice(drums, frame, 0.3, g, 0, (t) => {
    const saw = 2 * ((hz * t) % 1) - 1;
    const cut = 200 + 1600 * Math.exp(-t * 18);
    y += (1 - Math.exp((-2 * Math.PI * cut) / SR)) * (saw - y);
    return y * Math.exp(-t * 7);
  });
};

const whoosh = (frame: number, seconds: number, g: number, pan = 0) => {
  let y = 0;
  voice(drums, frame, seconds, g, pan, (t) => {
    const u = t / seconds;
    const cut = 300 + 4500 * Math.sin(Math.PI * u);
    y += (1 - Math.exp((-2 * Math.PI * cut) / SR)) * (rnd() - y);
    return y * Math.sin(Math.PI * u) ** 2 * 1.6;
  });
};

// Impact when the logos burst out: sub drop + crunchy noise + tail.
const boom = (frame: number, g: number) => {
  const sub = sweepSine((t) => 30 + 70 * Math.exp(-t * 6));
  const lp = noiseLP(900);
  voice(drums, frame, 1.8, g, 0, (t) => Math.tanh(2.2 * (sub(t) * Math.exp(-t * 2.4) + lp() * 1.4 * Math.exp(-t * 7))));
  snare(frame, g * 0.7);
};

const crackle = (frame: number, g: number) => {
  for (let k = 0; k < 9; k++) {
    const hp = noiseHP(3000);
    const off = (k * 0.013 + Math.abs(rnd()) * 0.01) * FPS;
    voice(drums, frame + off, 0.012, g * (1 - k / 12), rnd() * 0.6, (t) => hp() * Math.exp(-t * 300));
  }
};

// Short "wrong" buzz for a failed generation.
const errorSound = (frame: number, g: number) => {
  const sq = (hz: number, t: number) => (Math.sin(2 * Math.PI * hz * t) > 0 ? 1 : -1);
  voice(drums, frame, 0.06, g, 0.2, (t) => sq(880, t) * (1 - t / 0.06));
  voice(drums, frame + 0.065 * FPS, 0.1, g, 0.2, (t) => sq(415, t) * (1 - t / 0.1));
};

const blip = (frame: number, hz: number, g: number, pan = 0) =>
  voice(drums, frame, 0.05, g, pan, (t) => Math.sin(2 * Math.PI * hz * t) * Math.exp(-t * 70));

// Tape-stop brake: everything slides down in pitch and dies.
const brake = (frame: number, g: number) => {
  let y = 0;
  const osc = sweepSine((t) => 260 * Math.exp(-t * 9) + 30);
  voice(drums, frame, 0.32, g, 0, (t) => {
    const s = osc(t);
    y += 0.08 * (s - y);
    return Math.tanh(3 * (s * 0.5 + y)) * (1 - t / 0.32);
  });
  kick(frame, g * 0.9);
};

// Soft long tone after the brake: one note with gentle harmonics.
const longTone = (from: number, to: number, g: number) => {
  const seconds = (to - from) / FPS + 0.8;
  voice(tones, from, seconds, g, 0, (t) => {
    const env = Math.min(1, t / 0.45) * Math.min(1, Math.max(0, (seconds - t) / 0.8));
    const vib = 1 + 0.003 * Math.sin(2 * Math.PI * 4.5 * t);
    const hz = 220 * vib;
    return env * (Math.sin(2 * Math.PI * hz * t) + 0.22 * Math.sin(4 * Math.PI * hz * t) + 0.06 * Math.sin(6 * Math.PI * hz * t));
  });
};

// Clean bell for the landing.
const bell = (frame: number, g: number) => {
  const partials: [number, number, number][] = [
    [1, 1, 2.2],
    [2, 0.35, 1.2],
    [3.01, 0.16, 0.7],
    [4.2, 0.08, 0.4],
  ];
  voice(tones, frame, 3, g, 0, (t) =>
    partials.reduce((s, [r, a, d]) => s + a * Math.sin(2 * Math.PI * 440 * r * t) * Math.exp(-t / d), 0) * Math.min(1, t / 0.003),
  );
  voice(tones, frame, 1.2, g * 0.4, 0, (t) => Math.sin(2 * Math.PI * 110 * t) * Math.exp(-t * 4));
};

// ---------------------------------------------------------------- score
// 0–3s: almost nothing — a quiet pad and two soft ticks as the lines appear.
voice(tones, 0, T.slam / FPS, 0.05, 0, (t) => {
  const env = Math.min(1, t / 1.2) * Math.min(1, (T.slam / FPS - t) / 0.05);
  return env * (Math.sin(2 * Math.PI * 220 * t) + 0.6 * Math.sin(2 * Math.PI * 329.63 * t) * (0.6 + 0.4 * Math.sin(t * 1.3)));
});
for (const f of AUDIO.ticks) blip(f, 1800, 0.07);

// 3s: the slam, the crack, the logo impact.
kick(AUDIO.slam, 0.9);
snare(AUDIO.slam, 0.55);
whoosh(AUDIO.slam - 4, 0.16, 0.35);
crackle(AUDIO.crack, 0.4);
boom(AUDIO.burst, 0.95);

// From here on: drums follow the camera cuts.
const BASS = [55, 55, 65.41, 73.42, 55, 82.41, 73.42, 98];
AUDIO.hits
  .filter((h) => h.f !== AUDIO.brake)
  .forEach((h, i) => {
    if (h.f === T.fling) {
      whoosh(h.f - 2, 0.35, 0.45);
      return;
    }
    kick(h.f, 0.45 + 0.5 * h.s);
    bass(h.f, BASS[i % BASS.length], 0.32);
    if (h.s >= 0.7) snare(h.f, 0.35 + 0.25 * h.s, i % 2 ? 0.25 : -0.25);
    if (h.s >= 0.8) whoosh(h.f - 3, 0.22, 0.28, i % 2 ? 0.4 : -0.4);
  });
for (const f of AUDIO.slams) snare(f, 0.55);
// a logo smashed out of the way: crunchy low thud
for (const f of AUDIO.logoHits) {
  const lp = noiseLP(1200);
  voice(drums, f, 0.22, 0.4, f % 2 ? 0.5 : -0.5, (t) => Math.tanh(3 * lp() * Math.exp(-t * 18)));
}

// Hi-hats: steady, sparse during the real-footage holds, frantic before the brake.
const holds: [number, number][] = [
  [192, 213],
  [274, 301],
];
for (let f = T.chaos; f < AUDIO.brake; ) {
  const inHold = holds.some(([a, b]) => f >= a && f < b);
  const step = f >= 301 ? 2 : inHold ? 8 : 4;
  hat(f, f >= 301 ? 0.16 : 0.11, Math.sin(f * 0.7) * 0.5);
  f += step;
}
// riser into the brake
whoosh(288, (AUDIO.brake - 288) / FPS, 0.3);

for (const f of AUDIO.lands) blip(f, 2400, 0.05, rnd() * 0.5);
for (const f of AUDIO.fails) errorSound(f, 0.13);

// 10.5s: brake, then only the long tone; 12.67s: the bell.
brake(AUDIO.brake, 0.7);
longTone(AUDIO.tone[0], AUDIO.tone[1], 0.12);
bell(AUDIO.bell, 0.28);

// ---------------------------------------------------------------- mix
// light stereo echo on the drum bus, then cut it dead after the brake
const echo = (bus: Bus) => {
  const dl = Math.floor(0.11 * SR);
  const dr = Math.floor(0.137 * SR);
  for (let i = 0; i < N; i++) {
    if (i >= dl) bus[0][i] += bus[1][i - dl] * 0.22;
    if (i >= dr) bus[1][i] += bus[0][i - dr] * 0.22;
  }
};
echo(drums);
const cut = at(AUDIO.brake + 9);
for (let i = 0; i < N; i++) {
  const g = i < cut ? 1 : Math.max(0, 1 - (i - cut) / (0.02 * SR));
  drums[0][i] *= g;
  drums[1][i] *= g;
}

const out = [new Float32Array(N), new Float32Array(N)];
const fadeFrom = at(AUDIO.fadeOut);
let peak = 0;
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    let v = Math.tanh((drums[c][i] + tones[c][i]) * 1.15);
    if (i >= fadeFrom) v *= Math.max(0, 1 - (i - fadeFrom) / (N - fadeFrom));
    out[c][i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
}
const norm = 0.89 / peak;

// 16-bit PCM WAV
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
writeFileSync("public/audio/intro.wav", Buffer.concat([header, data]));
console.log(`public/audio/intro.wav  ${(N / SR).toFixed(2)}s  peak-normalised x${norm.toFixed(2)}`);
