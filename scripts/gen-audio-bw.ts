// Synthesises the Butterworth promo soundtrack from the shared timeline and
// writes public/audio/butterworth.wav. No samples: a 100 BPM D-major score
// (marimba, pad, bass, bell lead, light percussion) plus the day's sounds.
//   npm run audio:bw

import { mkdirSync, writeFileSync } from "node:fs";
import { BAR, BEAT, CUES, DISHES, DURATION, FPS, M, PAN_LEAD, SCENES } from "../src/butterworth/timeline.ts";

const SR = 48000;
const N = Math.ceil((DURATION / FPS) * SR);
const at = (frame: number) => Math.round((frame / FPS) * SR);
const beatFrame = (bar: number, beat: number) => bar * BAR + beat * BEAT;

type Bus = Float32Array[];
const bus = (): Bus => [new Float32Array(N), new Float32Array(N)];
const pre = bus(); // map intro: hard-stopped at M.stop
const music = bus();
const sfx = bus();
const send = bus(); // reverb send
const preSend = bus(); // reverb send of the intro bus (cut at the stop too)

let seed = 11;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};
const r01 = () => (rnd() + 1) / 2;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

const voice = (b: Bus, frame: number, seconds: number, gain: number, pan: number, fn: (t: number) => number, rev = 0) => {
  const start = at(frame);
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
      const s = b === pre ? preSend : send;
      s[0][idx] += v * gl * rev;
      s[1][idx] += v * gr * rev;
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
// state-variable band-pass on white noise, centre may move over time
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
const lowNoise = (cut: number) => {
  let y = 0;
  const a = 1 - Math.exp((-2 * Math.PI * cut) / SR);
  return () => (y += a * (rnd() - y));
};
// one-pole low-pass applied to any generator (tames noise hiss)
const lp = (fn: (t: number) => number, cut: number) => {
  let y = 0;
  const a = 1 - Math.exp((-2 * Math.PI * cut) / SR);
  return (t: number) => (y += a * (fn(t) - y));
};
const env = (t: number, a: number, len: number, r: number) => Math.min(1, t / a) * Math.min(1, Math.max(0, (len - t) / r));

// ------------------------------------------------------------------ instruments
const marimba = (b: Bus, frame: number, midi: number, g: number, pan: number) => {
  const f = hz(midi);
  const click = bandNoise(() => 2400, 2);
  voice(b, frame, 0.9, g, pan, (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 5.5) + 0.28 * Math.sin(2 * Math.PI * f * 3.93 * t) * Math.exp(-t * 22) + click(t) * 0.5 * Math.exp(-t * 400), 0.25);
};
// soft FM bell for the lead line
const bell = (b: Bus, frame: number, midi: number, beats: number, g: number, pan = 0.1) => {
  const f = hz(midi);
  const len = (beats * BEAT) / FPS + 0.9;
  voice(b, frame, len, g, pan, (t) => {
    const idx = 1.6 * Math.exp(-t * 3.5);
    const e = Math.min(1, t / 0.006) * Math.exp(-t * 1.1) * Math.min(1, Math.max(0, (len - t) / 0.5));
    return e * (Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * f * 2 * t)) + 0.12 * Math.sin(2 * Math.PI * f * 4.01 * t) * Math.exp(-t * 6));
  }, 0.45);
};
const padChord = (b: Bus, frame: number, notes: number[], beats: number, g: number) => {
  const len = (beats * BEAT) / FPS + 0.8;
  notes.forEach((m, i) => {
    const f = hz(m);
    voice(b, frame, len, g, (i % 2 ? 0.35 : -0.35), (t) => {
      const e = env(t, 0.45, len, 0.8) * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.3 * t + i));
      let s = 0;
      for (const d of [-0.0035, 0.0035]) s += Math.sin(2 * Math.PI * f * (1 + d) * t + i) + 0.22 * Math.sin(4 * Math.PI * f * (1 + d) * t) + 0.08 * Math.sin(6 * Math.PI * f * (1 + d) * t);
      return e * s * 0.5;
    }, 0.5);
  });
};
const bass = (b: Bus, frame: number, midi: number, beats: number, g: number) => {
  const f = hz(midi);
  const len = (beats * BEAT) / FPS;
  voice(b, frame, len + 0.05, g, 0, (t) => {
    const e = Math.min(1, t / 0.008) * (0.55 + 0.45 * Math.exp(-t * 8)) * Math.min(1, Math.max(0, (len + 0.05 - t) / 0.06));
    return e * Math.tanh(1.4 * (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) + 0.5 * Math.sin(Math.PI * f * t)));
  });
};
const kick = (b: Bus, frame: number, g: number) => {
  const osc = sweep((t) => 45 + 80 * Math.exp(-t * 30));
  voice(b, frame, 0.35, g, 0, (t) => osc(t) * Math.exp(-t * 11));
};
const clap = (b: Bus, frame: number, g: number) => {
  const n = bandNoise(() => 1600, 1.4);
  voice(b, frame, 0.18, g, 0.15, (t) => n(t) * (Math.exp(-t * 40) + 0.6 * Math.exp(-Math.max(0, t - 0.012) * 50) * (t > 0.012 ? 1 : 0)), 0.3);
};
const shaker = (b: Bus, frame: number, g: number, pan: number) => {
  const n = bandNoise(() => 7500, 1.2);
  voice(b, frame, 0.07, g, pan, (t) => n(t) * Math.min(1, t / 0.01) * Math.exp(-t * 55));
};

// ------------------------------------------------------------------ harmony
type Chord = { bass: number; pad: number[] };
const C: Record<string, Chord> = {
  D: { bass: 50, pad: [62, 66, 69, 76] },
  A6: { bass: 49, pad: [61, 64, 69, 71] }, // A/C#
  Bm: { bass: 47, pad: [59, 62, 66, 69] },
  G: { bass: 43, pad: [59, 62, 67, 69] },
  DF: { bass: 42, pad: [62, 66, 69, 74] }, // D/F#
  Em: { bass: 40, pad: [59, 62, 64, 67] },
  A: { bass: 45, pad: [61, 64, 69, 73] },
};
const CYCLE = ["D", "A6", "Bm", "G"];
// one chord per bar from the first scene on (bar 20 splits Em7 → A)
const chordOf = (bar: number): string[] => {
  if (bar <= 17) return [CYCLE[(bar - 3) % 4]];
  return ({ 18: ["G"], 19: ["DF"], 20: ["Em", "A"], 21: ["D"], 22: ["Bm"], 23: ["G"], 24: ["D"] } as Record<number, string[]>)[bar];
};

// lead melody: [beat, beats, midi] per bar
type Note = [number, number, number];
const P1: Note[][] = [
  [[0, 0.5, 69], [0.5, 0.5, 74], [1, 1, 78], [2, 0.5, 76], [2.5, 1.5, 74]],
  [[0, 1, 76], [1, 0.5, 73], [1.5, 0.5, 69], [2, 2, 71]],
  [[0, 0.5, 74], [0.5, 1, 78], [1.5, 0.5, 81], [2, 1, 78], [3, 1, 76]],
  [[0, 1.5, 74], [1.5, 0.5, 71], [2, 2, 69]],
];
const P2: Note[][] = [
  [[0, 0.5, 78], [0.5, 0.5, 81], [1, 1, 83], [2, 1, 81], [3, 1, 78]],
  [[0, 1.5, 76], [1.5, 0.5, 78], [2, 0.5, 76], [2.5, 1.5, 73]],
  [[0, 0.5, 71], [0.5, 0.5, 74], [1, 1, 78], [2, 1, 76], [3, 1, 74]],
  [[0, 1, 71], [1, 1, 74], [2, 2, 76]],
];
const MELODY: Record<number, Note[]> = {
  7: P1[0], 8: P1[1], 9: P1[2], 10: P1[3],
  11: P2[0], 12: P2[1], 13: P2[2], 14: P2[3],
  15: P1[0], 16: P1[1], 17: P1[2],
  18: [[0, 2, 83], [2, 1, 81], [3, 1, 79]],
  19: [[0, 3, 78], [3, 1, 76]],
  20: [[0, 1.5, 76], [1.5, 0.5, 74], [2, 2, 73]],
  21: P2[0], 22: [[0, 0.5, 71], [0.5, 0.5, 74], [1, 1, 78], [2, 2, 76]],
  23: [[0, 1, 74], [1, 1, 71], [2, 2, 69]],
  24: [[0, 4, 74]],
};

// ------------------------------------------------------------------ map intro
// a soft D pad and rail-joint clicks: the traffic passing through
padChord(pre, 0, [50, 57, 62, 66, 69], 10, 0.032);
for (let f = M.routesIn + 6, k = 0; f < M.stop + 4; f += BEAT / 2, k++) {
  const n = bandNoise(() => 1800 + 600 * (k % 2), 3);
  voice(pre, f, 0.05, k % 4 === 0 ? 0.16 : 0.09, k % 2 ? 0.3 : -0.3, (t) => n(t) * Math.exp(-t * 120));
  if (k % 4 === 2) voice(pre, f, 0.12, 0.08, 0, (t) => Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 30));
}
for (const [i, m] of [62, 66, 69, 74, 69, 66].entries()) marimba(pre, M.routesIn + 20 + i * BEAT, m, 0.07, i % 2 ? 0.4 : -0.4);
for (const [i, m] of [64, 69, 73, 76, 73, 69].entries()) marimba(pre, M.routesIn + 20 + (6 + i) * BEAT, m, 0.07, i % 2 ? 0.4 : -0.4);
// distant train horn as the railway draws on
voice(pre, 34, 1.5, 0.08, -0.5, (t) => {
  const e = env(t, 0.08, 1.5, 0.4);
  return e * Math.tanh(1.5 * ([311.1, 370, 466.2].reduce((s, f) => s + Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t), 0) / 3));
}, 0.6);

// the stop: a low thump, then only the D drone and a slow swell into the iris
voice(music, M.stop, 0.5, 0.35, 0, (() => {
  const o = sweep((t) => 40 + 40 * Math.exp(-t * 16));
  return (t: number) => o(t) * Math.exp(-t * 8);
})());
voice(music, M.stop + 4, (M.irisFull - M.stop) / FPS + 0.5, 0.06, 0, (t) => {
  const e = env(t, 1.2, (M.irisFull - M.stop) / FPS + 0.5, 0.4);
  return e * (Math.sin(2 * Math.PI * 73.42 * t) + 0.4 * Math.sin(2 * Math.PI * 110 * t));
});
{
  const len = (M.irisFull - M.irisIn + 4) / FPS;
  const r = bandNoise((t) => 500 + 5000 * (t / len) ** 2, 1.4);
  voice(music, M.irisIn, len, 0.22, 0, (t) => r(t) * (t / len) ** 2.2, 0.4);
  padChord(music, M.irisIn - 10, [62, 66, 69, 74, 78], 4, 0.02);
}
// the dot opens: a quick sparkle
for (const [i, m] of [74, 78, 81, 86].entries()) bell(music, M.irisFull - 10 + i * 2.5, m, 0.5, 0.05, i % 2 ? 0.5 : -0.5);

// ------------------------------------------------------------------ score
const SUNSET = [18, 19, 20];
for (let bar = 3; bar <= 24; bar++) {
  const chords = chordOf(bar);
  const half = chords.length === 2;
  chords.forEach((name, ci) => {
    const ch = C[name];
    const b0 = beatFrame(bar, half ? ci * 2 : 0);
    const beats = half ? 2 : 4;
    const last = bar === 24;
    padChord(music, b0, ch.pad, last ? 10 : beats, last ? 0.05 : SUNSET.includes(bar) ? 0.05 : 0.032);
    // marimba arpeggio in 8ths (sparser at sunset and at the end)
    const tones = [...ch.pad, ch.pad[0] + 12];
    const pattern = [0, 2, 1, 3, 4, 3, 2, 1];
    for (let k = 0; k < beats * 2; k++) {
      if ((SUNSET.includes(bar) || last) && k % 2) continue;
      if (last && k > 0) continue;
      marimba(music, b0 + (k * BEAT) / 2, tones[pattern[k % 8]], bar < 6 ? 0.075 : 0.065, k % 2 ? 0.35 : -0.35);
    }
    // bass from breakfast on
    if (bar >= 6) {
      if (SUNSET.includes(bar)) bass(music, b0, ch.bass - 12, beats, 0.16);
      else if (last) bass(music, b0, ch.bass - 12, 8, 0.16);
      else {
        bass(music, b0, ch.bass - 12, 1.4, 0.17);
        bass(music, b0 + BEAT * 1.5, ch.bass - 12, 0.4, 0.12);
        if (!half) {
          bass(music, b0 + BEAT * 2, ch.bass, 0.9, 0.12);
          bass(music, b0 + BEAT * 3, ch.bass - 12, 0.9, 0.14);
        }
      }
    }
  });
  // drums: kick from breakfast, clap from the art walk, shaker throughout the
  // daytime; the sunset drops to half time, the night comes back fuller
  const b0 = beatFrame(bar, 0);
  if (bar >= 6 && bar <= 23 && !SUNSET.includes(bar)) {
    kick(music, b0, 0.32);
    kick(music, b0 + BEAT * 2, 0.26);
    if (bar >= 21) kick(music, b0 + BEAT * 2.5, 0.16);
    for (let s = 0; s < 16; s++) shaker(music, b0 + (s * BEAT) / 4, s % 4 === 2 ? 0.07 : 0.035, s % 2 ? 0.45 : -0.45);
  }
  if (bar >= 9 && bar <= 22 && !SUNSET.includes(bar)) {
    clap(music, b0 + BEAT, 0.2);
    clap(music, b0 + BEAT * 3, 0.2);
  }
  if (SUNSET.includes(bar)) {
    kick(music, b0, 0.22);
    clap(music, b0 + BEAT * 2, 0.12);
  }
  for (const [beat, beats, m] of MELODY[bar] ?? []) bell(music, beatFrame(bar, beat), m, beats, bar >= 18 && bar <= 20 ? 0.11 : 0.085);
}

// ------------------------------------------------------------------ the day's sounds
// whip pans
for (let i = 0; i < SCENES.length - 1; i++) {
  const mid = SCENES[i].to - PAN_LEAD + 8;
  const n = lp(lp(bandNoise((t) => 500 + 4200 * Math.sin(Math.PI * Math.min(1, t / 0.55)), 1.1), 5000), 7000);
  voice(sfx, mid - 9, 0.6, 0.2, 0, (t) => n(t) * Math.sin(Math.PI * Math.min(1, t / 0.6)) ** 2, 0.2);
}
// sea: slow swells under the waterside scenes
const waves = (from: number, to: number, g: number) => {
  const len = (to - from) / FPS;
  const body = lp(lowNoise(600), 600);
  const wash = lp(lp(bandNoise(() => 900, 0.8), 2200), 2200);
  voice(sfx, from, len, g, 0, (t) => {
    const swell = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.16 * t) ** 2;
    return env(t, 0.6, len, 0.6) * swell * (body(t) * 3 + wash(t) * 0.6 * swell);
  });
};
waves(M.irisIn, SCENES[0].to + 6, 0.16);
waves(SCENES[4].from - 10, SCENES[5].to + 6, 0.13);
waves(SCENES[6].from - 6, M.irisGone, 0.09);
// gulls
const gull = (frame: number, g: number, pan: number) => {
  const o = sweep((t) => 1650 - 500 * (t / 0.32) + 60 * Math.sin(2 * Math.PI * 22 * t));
  voice(sfx, frame, 0.32, g, pan, (t) => o(t) * Math.sin(Math.PI * (t / 0.32)) ** 0.6 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 30 * t)), 0.4);
};
gull(CUES.gulls, 0.05, -0.4);
gull(CUES.gulls + 9, 0.04, -0.3);
gull(CUES.gulls + 60, 0.035, 0.5);
gull(SCENES[4].from + 30, 0.04, 0.4);
gull(SCENES[4].from + 40, 0.03, 0.5);
// boat engine putter at dawn
{
  const len = (SCENES[0].to - SCENES[0].from) / FPS;
  voice(sfx, SCENES[0].from, len, 0.05, 0.4, (t) => {
    const pulse = Math.max(0, Math.sin(2 * Math.PI * 7 * t)) ** 4;
    return env(t, 1, len, 0.6) * pulse * Math.sin(2 * Math.PI * 70 * t);
  });
}
// breakfast: a little pop for each dish, a wok sizzle
for (const [i, d] of DISHES.entries()) {
  const o = sweep((t) => 500 + 900 * Math.min(1, t / 0.06) + i * 80);
  voice(sfx, d.f, 0.12, 0.09, -0.2 + i * 0.15, (t) => o(t) * Math.exp(-t * 30), 0.2);
}
{
  const n = lp(bandNoise(() => 6000, 0.8), 9000);
  const len = 1.8;
  voice(sfx, SCENES[1].from + 30, len, 0.05, 0.3, (t) => n(t) * env(t, 0.05, len, 0.8) * (0.7 + 0.3 * r01()));
}
// art walk: a bicycle bell
for (const k of [0, 5]) {
  voice(sfx, SCENES[2].from + 40 + k, 0.8, 0.05, 0.3, (t) =>
    [1, 2.76].reduce((s, r, i) => s + Math.sin(2 * Math.PI * 2000 * r * t) * Math.exp(-t * (5 + i * 6)) * (1 - i * 0.4), 0), 0.3);
}
// temple bell
voice(sfx, CUES.bell, 4, 0.16, 0, (t) =>
  [[1, 1, 0.9], [2.0, 0.6, 1.4], [2.76, 0.45, 2.2], [5.4, 0.25, 4], [0.5, 0.5, 0.6]].reduce(
    (s, [r, a, d]) => s + a * Math.sin(2 * Math.PI * 196 * r * t) * Math.exp(-t * d),
    0,
  ) * Math.min(1, t / 0.004), 0.6);
// ferry horn
voice(sfx, CUES.horn, 2.2, 0.11, 0.3, (t) => {
  const e = env(t, 0.12, 2.2, 0.5);
  let s = 0;
  for (const f of [110, 138.6]) for (let h = 1; h <= 6; h++) s += Math.sin(2 * Math.PI * f * h * t) / h;
  return e * Math.tanh(s * 0.6);
}, 0.7);
// sunset: lights come on with a soft sparkle
for (const [i, m] of [86, 90, 93, 98].entries()) bell(sfx, CUES.lightsOn + i * 4, m, 0.5, 0.025, i % 2 ? 0.6 : -0.6);
// night: crickets, murmur of diners, satay smoke sizzle
{
  const from = SCENES[6].from - 10;
  const len = (M.irisGone + 10 - from) / FPS;
  voice(sfx, from, len, 0.02, 0.5, (t) => env(t, 0.5, len, 1) * Math.sin(2 * Math.PI * 4600 * t) * (Math.sin(2 * Math.PI * 28 * t) > 0.3 ? 1 : 0) * (Math.sin(2 * Math.PI * 1.3 * t) > 0 ? 1 : 0));
  voice(sfx, from + 7, len, 0.016, -0.5, (t) => env(t, 0.5, len, 1) * Math.sin(2 * Math.PI * 5200 * t) * (Math.sin(2 * Math.PI * 31 * t) > 0.3 ? 1 : 0) * (Math.sin(2 * Math.PI * 1.1 * t + 1) > 0 ? 1 : 0));
  const m = lp(lp(bandNoise((t) => 700 + 300 * Math.sin(t * 3.1) + 200 * Math.sin(t * 7.7), 1.2), 1800), 1800);
  voice(sfx, from, len, 0.07, 0, (t) => env(t, 0.6, len, 1) * m(t) * (0.6 + 0.4 * Math.sin(t * 2.3) * Math.sin(t * 5.1)));
  const s = lp(bandNoise(() => 5200, 0.9), 9000);
  voice(sfx, CUES.stallsOn, len - 0.5, 0.025, -0.3, (t) => env(t, 0.4, len - 0.5, 1) * s(t));
}
// ending: a bell over the last chord as the map settles
voice(sfx, M.endA, 4, 0.06, 0, (t) =>
  [1, 2.01, 3.02].reduce((s, r, i) => s + Math.sin(2 * Math.PI * 587.33 * r * t) * Math.exp(-t / (1.6 - i * 0.4)) * (1 - i * 0.35), 0) * Math.min(1, t / 0.004), 0.6);

// ------------------------------------------------------------------ mix
// the stop: the intro bus and its send are cut dead; only the room rings on
const stop = at(M.stop);
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    const g = i < stop ? 1 : Math.max(0, 1 - (i - stop) / (0.01 * SR));
    pre[c][i] *= g;
    send[c][i] += preSend[c][i] * g;
  }
}

// small Freeverb-style room on the send bus
const reverb = (input: Float32Array, spread: number) => {
  const out = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(d + spread), i: 0, store: 0 }));
  const aps = [556, 441].map((d) => ({ buf: new Float32Array(d + spread), i: 0 }));
  const fb = 0.86;
  const damp = 0.3;
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.store = y * (1 - damp) + c.store * damp;
      c.buf[c.i] = input[n] + c.store * fb;
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

const out = [new Float32Array(N), new Float32Array(N)];
const fadeFrom = at(M.fadeOut);
let peak = 0;
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    let v = Math.tanh((pre[c][i] + music[c][i] + sfx[c][i] + wet[c][i] * 0.9) * 1.15);
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
writeFileSync("public/audio/butterworth.wav", Buffer.concat([header, data]));
console.log(`public/audio/butterworth.wav  ${(N / SR).toFixed(2)}s  peak-normalised x${norm.toFixed(2)}`);
