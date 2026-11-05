// Synthesises SelfBlame's soundtrack and writes public/audio/self-blame.wav.
// The music (felt piano, pads, heartbeat, music box, bells) is built from
// oscillators and noise. A few real recordings from Freesound (all CC0, files
// and sources in public/self-blame/sfx/) are mixed in on their frames: the cup
// breaking, whooshes on the camera moves, pops, a pencil scribble, wind chimes
// and morning birds. They are decoded with ffmpeg (must be on PATH).
// All timing comes from src/self-blame/beat.ts + timeline.ts — the same
// constants the picture uses — so every hit lands on the frame of its cue.
//   npm run audio:self-blame

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { B, DURATION, S, SAMPLE_RATE as SR, sampleAt } from "../src/self-blame/beat.ts";
import { SILENCES, T, TYPE } from "../src/self-blame/timeline.ts";

const N = sampleAt(DURATION);

// ------------------------------------------------------------------ basics
let seed = 20261105;
const rnd = () => {
  // mulberry32, deterministic: the same WAV on every run
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const TAU = Math.PI * 2;

type Bus = [Float32Array, Float32Array];
const bus = (): Bus => [new Float32Array(N), new Float32Array(N)];
const drums = bus();
const bass = bus();
const music = bus();
const fx = bus();
const send = bus(); // → reverb

// Adds a voice that starts exactly on `frame`. fn(t) returns a mono sample
// (equal-power panned) or a stereo pair.
const put = (
  target: Bus,
  frame: number,
  seconds: number,
  gain: number,
  pan: number,
  fn: (t: number, i: number) => number | [number, number],
  reverb = 0,
) => {
  const start = sampleAt(frame);
  const len = Math.floor(seconds * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx >= N) break;
    if (idx < 0) continue;
    const v = fn(i / SR, i);
    const l = typeof v === "number" ? v : v[0];
    const r = typeof v === "number" ? v : v[1];
    target[0][idx] += l * gl;
    target[1][idx] += r * gr;
    if (reverb) {
      send[0][idx] += l * gl * reverb;
      send[1][idx] += r * gr * reverb;
    }
  }
};

// Zavalishin state-variable filter (stable at any cutoff).
class SVF {
  lp = 0;
  bp = 0;
  hp = 0;
  private a = 0;
  private b = 0;
  step(x: number, cutoff: number, q = 0.707) {
    const g = Math.tan((Math.PI * Math.min(cutoff, SR * 0.45)) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - this.b;
    const v1 = a1 * this.a + a2 * v3;
    const v2 = this.b + a2 * this.a + a3 * v3;
    this.a = 2 * v1 - this.a;
    this.b = 2 * v2 - this.b;
    this.lp = v2;
    this.bp = v1;
    this.hp = x - k * v1 - v2;
    return this;
  }
}

const blep = (t: number, dt: number) => {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
};
class Saw {
  ph = rnd();
  next(f: number) {
    const dt = f / SR;
    this.ph += dt;
    if (this.ph >= 1) this.ph -= 1;
    return 2 * this.ph - 1 - blep(this.ph, dt);
  }
}

// Swept sine (phase accumulated so the pitch can glide).
const glide = (f: (t: number) => number) => {
  let ph = 0;
  return (t: number) => {
    ph += (TAU * f(t)) / SR;
    return Math.sin(ph);
  };
};
const attack = (t: number, a: number) => (t < a ? t / a : 1);

// ------------------------------------------------------------------ recordings (Freesound, CC0)
const SFX_DIR = "public/self-blame/sfx";
const FILES = {
  cup: "fs_524999_ceramic-cup-shatters-on-tile-floor.mp3",
  whoosh: "fs_701104_Whoosh-stereo-light-transition.mp3",
  bubble: "fs_411462_Bubble-Pop.mp3",
  pop: "fs_439186_Pop-5-ogg.mp3",
  scribble: "fs_211247_Scribble.mp3",
  chime: "fs_398496_wind-chimes-single-04-wav.mp3",
  birds: "fs_608154_Open-window-and-birds-singing-in-the-mor.mp3",
} as const;
const decoded = new Map<string, Bus>();
const load = (name: keyof typeof FILES): Bus => {
  const hit = decoded.get(name);
  if (hit) return hit;
  const buf = execFileSync("ffmpeg", ["-v", "error", "-i", `${SFX_DIR}/${FILES[name]}`, "-f", "f32le", "-acodec", "pcm_f32le", "-ac", "2", "-ar", String(SR), "-"], { maxBuffer: 1 << 28 });
  const all = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const n = all.length / 2;
  const out: Bus = [new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) {
    out[0][i] = all[2 * i];
    out[1][i] = all[2 * i + 1];
  }
  decoded.set(name, out);
  return out;
};
// Places a recording so that the moment `align` seconds into the file lands on
// `frame`. `from`/`to` trim the file (seconds); fades avoid clicks; optional
// high- / low-pass clean up rumble and hiss (the spectrum check in 动效.md §6).
const sfx = (
  name: keyof typeof FILES,
  frame: number,
  gain: number,
  o: { align?: number; from?: number; to?: number; fadeIn?: number; fadeOut?: number; hp?: number; lp?: number; pan?: number; reverb?: number } = {},
) => {
  const src = load(name);
  const from = Math.round((o.from ?? 0) * SR);
  const to = Math.min(src[0].length, Math.round((o.to ?? src[0].length / SR) * SR));
  const start = sampleAt(frame) - Math.round(((o.align ?? 0) - (o.from ?? 0)) * SR);
  const fi = Math.max(1, Math.round((o.fadeIn ?? 0.004) * SR));
  const fo = Math.max(1, Math.round((o.fadeOut ?? 0.03) * SR));
  const pan = o.pan ?? 0;
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const f = [new SVF(), new SVF(), new SVF(), new SVF()];
  for (let i = from; i < to; i++) {
    const idx = start + (i - from);
    if (idx < 0 || idx >= N) continue;
    const env = Math.min(1, (i - from) / fi, (to - i) / fo);
    let l = src[0][i];
    let r = src[1][i];
    if (o.hp) {
      l = f[0].step(l, o.hp).hp;
      r = f[1].step(r, o.hp).hp;
    }
    if (o.lp) {
      l = f[2].step(l, o.lp).lp;
      r = f[3].step(r, o.lp).lp;
    }
    fx[0][idx] += l * env * gl;
    fx[1][idx] += r * env * gr;
    if (o.reverb) {
      send[0][idx] += l * env * gl * o.reverb;
      send[1][idx] += r * env * gr * o.reverb;
    }
  }
};
// The whoosh is loudest 0.48 s in. The camera moves fastest on the beat; the
// whoosh peaks 2 frames later, so the air "follows" the move and the beat itself
// keeps a clean attack (the chord and the kick).
const whooshAt = (frame: number, gain: number, pan = 0) => sfx("whoosh", frame, gain, { align: 0.48 - 2 / 30, from: 0.2, to: 1.4, fadeIn: 0.05, fadeOut: 0.3, lp: 9000, pan });

// ------------------------------------------------------------------ drums and pulses
const kicks: { frame: number; depth: number }[] = [];
// Soft kick with a short mid "knock" so it still reads on phone speakers.
const kick = (frame: number, vel: number, depth = 0.6) => {
  kicks.push({ frame, depth });
  const body = glide((t) => 48 + 90 * Math.exp(-t / 0.035));
  const knock = new SVF();
  const click = new SVF();
  put(drums, frame, 0.5, vel, 0, (t) => {
    const b = body(t) * Math.exp(-t / 0.22) * attack(t, 0.001) * 0.85;
    const k = knock.step(noise(), 1500, 0.9).bp * Math.exp(-t / 0.008) * 1.0;
    return Math.tanh(1.4 * (b + k)) + click.step(noise(), 3800, 0.8).bp * 0.9 * Math.exp(-t / 0.002);
  });
};

// Heartbeat: lub on the beat, dub a 16th later.
const heartbeat = (frame: number, vel: number) => {
  for (const [off, g] of [
    [0, 1],
    [S(1), 0.5],
  ] as const) {
    const body = glide((t) => 50 + 40 * Math.exp(-t / 0.05));
    const lp = new SVF();
    const tk = new SVF();
    put(drums, frame + off, 0.35, vel * g, 0, (t) =>
      lp.step(Math.tanh(2.2 * body(t) * Math.exp(-t / 0.14) * attack(t, 0.0015)), 480).lp * 1.1 +
      tk.step(noise(), 1100, 1.4).bp * 0.6 * Math.exp(-t / 0.008),
    );
  }
};

const shaker = (frame: number, vel: number, pan = 0) => {
  const f = new SVF();
  put(drums, frame, 0.1, vel, pan, (t) => f.step(noise(), 5500, 1.2).bp * 1.4 * attack(t, 0.004) * Math.exp(-t / 0.03));
};

const tick = (frame: number, vel: number, pan = 0) => {
  const f = new SVF();
  put(drums, frame, 0.04, vel, pan, (t) => f.step(noise(), 2600, 1.6).bp * 3 * Math.exp(-t / 0.003) + Math.sin(TAU * 1250 * t) * 0.4 * Math.exp(-t / 0.012));
};

// A soft wood-block "tock": two damped partials. Marks the quieter key actions
// with a clear start without sounding like a click (动效.md §6: every key action
// needs a clear attack).
const block = (frame: number, vel: number, pan = 0) => {
  put(drums, frame, 0.08, vel, pan, (t) => (Math.sin(TAU * 1720 * t) * 0.8 + Math.sin(TAU * 2930 * t) * 0.45) * Math.exp(-t / 0.011) * attack(t, 0.0006), 0.15);
};

// Typing / pencil: a soft, dry tap per character.
const tap = (frame: number, vel: number) => {
  const f = new SVF();
  const pan = (rnd() - 0.5) * 0.4;
  const c = 2400 + 1200 * rnd();
  put(drums, frame, 0.04, vel, pan, (t) => f.step(noise(), c, 2.2).bp * 2.2 * Math.exp(-t / 0.004) + Math.sin(TAU * (180 + 60 * rnd()) * t) * 0.3 * Math.exp(-t / 0.012));
};

// ------------------------------------------------------------------ tonal voices
// Felt piano: slightly inharmonic partials, a little detune between ears.
const piano = (frame: number, midis: number[], vel: number, decay = 2.4, reverb = 0.35) => {
  // the felt hammer: 2–3 ms of band-passed noise, so every chord has a clear start
  const hf = new SVF();
  put(music, frame, 0.03, vel * 0.9, 0, (t) => hf.step(noise(), 3200, 1.2).bp * 2.2 * Math.exp(-t / 0.0025) * attack(t, 0.0004), reverb * 0.5);
  for (const m of midis) {
    const f0 = hz(m);
    const g = vel / Math.sqrt(midis.length);
    put(
      music,
      frame,
      decay * 2.5,
      g,
      0,
      (t) => {
        let l = 0;
        let r = 0;
        for (let n = 1; n <= 8; n++) {
          const fn = f0 * n * Math.sqrt(1 + 0.0004 * n * n);
          if (fn > 9000) break;
          const a = (1 / n ** 1.25) * Math.exp(-t / (decay / n ** 0.7));
          l += Math.sin(TAU * fn * 0.9997 * t) * a;
          r += Math.sin(TAU * fn * 1.0003 * t + 0.4) * a;
        }
        // a soft hammer: a few ms of filtered noise at the attack
        const env = attack(t, 0.004);
        return [l * env, r * env];
      },
      reverb,
    );
  }
};

// Soft pluck (upper partials die first).
const pluck = (frame: number, midi: number, vel: number, pan = 0, decay = 0.9, reverb = 0.3) => {
  const f0 = hz(midi);
  put(
    music,
    frame,
    decay * 4,
    vel,
    pan,
    (t) => {
      let s = 0;
      for (let n = 1; n <= 6; n++) {
        if (f0 * n > 12000) break;
        s += (Math.sin(TAU * f0 * n * t) / n ** 1.6) * Math.exp(-t / (decay / (1 + 0.7 * (n - 1))));
      }
      return s * attack(t, 0.002);
    },
    reverb,
  );
};

// Music box: bright, short, slightly inharmonic tines.
const musicBox = (frame: number, midi: number, vel: number, pan = 0) => {
  const f0 = hz(midi);
  put(
    music,
    frame,
    2.2,
    vel,
    pan,
    (t) =>
      (Math.sin(TAU * f0 * t) * Math.exp(-t / 0.9) +
        0.35 * Math.sin(TAU * f0 * 3.01 * t) * Math.exp(-t / 0.25) +
        0.12 * Math.sin(TAU * f0 * 5.4 * t) * Math.exp(-t / 0.08)) *
      attack(t, 0.0012),
    0.4,
  );
};

// FM bell.
const bell = (frame: number, midi: number, vel: number, pan = 0, decay = 1.6) => {
  const f0 = hz(midi);
  put(
    music,
    frame,
    decay * 3,
    vel,
    pan,
    (t) => {
      const idx = 2 * Math.exp(-t / 0.35);
      return Math.sin(TAU * f0 * t + idx * Math.sin(TAU * f0 * 3.5 * t)) * Math.exp(-t / decay) * attack(t, 0.0015);
    },
    0.45,
  );
};

// Glassy chime with a hard attack.
const chime = (frame: number, midis: number[], vel: number) => {
  for (const [i, m] of midis.entries()) {
    const f0 = hz(m);
    put(music, frame + i * 3, 2.5, vel / midis.length, i % 2 ? 0.35 : -0.35, (t) => {
      let s = 0;
      for (const [r, a, d] of [
        [1, 1, 1.2],
        [2.76, 0.45, 0.35],
        [5.4, 0.2, 0.1],
      ]) s += Math.sin(TAU * f0 * r * t) * a * Math.exp(-t / d);
      return s * attack(t, 0.0008);
    }, 0.5);
  }
};

// Pad: three detuned band-limited saws per note through a low-pass.
const pad = (from: number, to: number, midis: number[], vel: number, cutoff: number, atk = 0.8, rel = 0.8) => {
  const len = (to - from) / 30 + rel;
  const holdEnd = (to - from) / 30;
  const g = vel / Math.sqrt(midis.length);
  for (const m of midis) {
    const oscL = [new Saw(), new Saw(), new Saw()];
    const oscR = [new Saw(), new Saw(), new Saw()];
    const fl = new SVF();
    const fr = new SVF();
    const f0 = hz(m);
    put(
      music,
      from,
      len,
      g,
      0,
      (t) => {
        const env = Math.min(1, t / atk) * (t > holdEnd ? Math.max(0, 1 - (t - holdEnd) / rel) : 1);
        if (env <= 0) return 0;
        const l = oscL[0].next(f0 * 0.996) + oscL[1].next(f0) + oscL[2].next(f0 * 1.005);
        const r = oscR[0].next(f0 * 0.995) + oscR[1].next(f0 * 1.001) + oscR[2].next(f0 * 1.004);
        return [fl.step(l, cutoff, 0.6).lp * env * 0.33, fr.step(r, cutoff, 0.6).lp * env * 0.33];
      },
      0.4,
    );
  }
};

const bassNote = (frame: number, frames: number, midi: number, vel: number) => {
  const f0 = hz(midi);
  const hold = frames / 30;
  const o = glide(() => f0);
  const lp = new SVF();
  const s = new Saw();
  put(bass, frame, hold + 0.12, vel, 0, (t) => {
    const env = attack(t, 0.006) * (t < hold ? 1 : Math.max(0, 1 - (t - hold) / 0.12));
    // sub sine + a filtered saw an octave up, so it is audible on small speakers
    const x = o(t) * 0.55 + lp.step(s.next(f0 * 2), 900, 0.8).lp * 0.45;
    return Math.tanh(1.3 * x) * env;
  });
};

// Dissonant cluster for the blame: three saws, a closing filter.
const stab = (frame: number, midis: number[], vel: number) => {
  const oscs = midis.map((m) => ({ f: hz(m), a: new Saw(), b: new Saw() }));
  const f = new SVF();
  put(music, frame, 1.1, vel, 0, (t) => {
    let x = 0;
    for (const o of oscs) x += o.a.next(o.f * 0.997) + o.b.next(o.f * 1.004);
    return Math.tanh(1.8 * f.step(x * 0.22, 900 + 2600 * Math.exp(-t / 0.05), 0.9).lp) * Math.exp(-t / 0.35) * attack(t, 0.002);
  }, 0.35);
};

const impact = (frame: number, vel: number, size = 1) => {
  const sub = glide((t) => 60 * Math.exp(-t / (0.4 * size)) + 40);
  const n = new SVF();
  put(fx, frame, 1.2 * size, vel, 0, (t) => Math.tanh(1.6 * (sub(t) * 0.8 * Math.exp(-t / (0.28 * size)) + n.step(noise(), 1800, 0.7).lp * 1.2 * Math.exp(-t / 0.05))), 0.3);
};

const sweepDown = (frame: number, dur: number, from: number, to: number, vel: number) => {
  const o = glide((t) => hz(from + (to - from) * Math.min(1, t / dur)));
  put(music, frame, dur, vel, 0, (t) => o(t) * attack(t, 0.003) * (1 - t / dur) ** 1.5, 0.3);
};

// Sonar ping with two echoes (the alarm ripples).
const sonar = (frame: number, vel: number) => {
  for (const [d, g] of [
    [0, 1],
    [S(2), 0.45],
    [S(4), 0.2],
  ] as const) {
    put(music, frame + d, 0.8, vel * g, d ? 0.3 : -0.1, (t) => (Math.sin(TAU * 1180 * t) + 0.3 * Math.sin(TAU * 2360 * t)) * Math.exp(-t / 0.18) * attack(t, 0.0015), 0.4);
  }
};

// Water spilling: a falling "plop" and a short splash.
const plop = (frame: number, vel: number) => {
  const o = glide((t) => 700 * Math.exp(-t / 0.05) + 180);
  const f = new SVF();
  put(fx, frame, 0.6, vel, -0.3, (t) => o(t) * Math.exp(-t / 0.09) * attack(t, 0.001) + f.step(noise(), 2400, 0.9).bp * 0.8 * Math.exp(-t / 0.12) * attack(t, 0.01), 0.3);
};

// ------------------------------------------------------------------ harmony
// Piano voicings (mid register) and bass roots. D minor while we explain,
// F major once the practices start.
const CH: Record<string, { p: number[]; b: number }> = {
  Dm9: { p: [53, 57, 60, 64], b: 38 },
  Bbmaj7: { p: [50, 53, 57, 60], b: 34 },
  Bbmaj9: { p: [53, 57, 60, 62], b: 34 },
  FA: { p: [53, 57, 60, 65], b: 33 },
  Gm7: { p: [53, 58, 62, 65], b: 31 },
  Asus: { p: [50, 52, 55, 57], b: 33 },
  A: { p: [52, 57, 61, 64], b: 33 },
  Fmaj9: { p: [57, 60, 64, 67], b: 41 },
  CE: { p: [55, 60, 62, 64], b: 40 },
  Dm7: { p: [53, 57, 60, 62], b: 38 },
  Csus: { p: [53, 55, 60, 65], b: 36 },
  C: { p: [52, 55, 60, 64], b: 36 },
  Fadd9: { p: [53, 57, 60, 67], b: 41 },
};
// [beat, chord] — each chord lasts until the next entry.
const PROG: [number, string][] = [
  [12, "Bbmaj9"], [14, "FA"], [16, "Gm7"], [18, "Asus"], [19, "A"],
  [20, "Dm9"], [24, "Bbmaj7"], [28, "FA"], [32, "Gm7"], [34, "Asus"],
  [36, "Dm9"], [40, "Bbmaj7"], [44, "Gm7"], [46, "Asus"],
  [48, "FA"], [52, "Dm9"], [56, "Bbmaj7"], [58, "Gm7"],
  [60, "Dm9"], [64, "Bbmaj7"], [68, "Gm7"], [72, "Asus"],
  [76, "Fmaj9"], [80, "CE"], [84, "Dm7"], [86, "Bbmaj9"],
  [88, "Bbmaj9"], [92, "FA"], [96, "Gm7"], [98, "Csus"], [99, "C"],
  [100, "Fmaj9"], [104, "Bbmaj9"], [108, "Fmaj9"], [112, "Fadd9"],
];
const END_BEAT = DURATION / 24;

// Hook: a low, cold pad and a heartbeat.
pad(B(0), T.breath, [38, 50, 57, 65], 0.1, 520, 1.6, 0.05);
pad(B(5), T.breath, [62, 69], 0.035, 1400, 1.5, 0.05);
for (let b = 0; b < 11; b++) heartbeat(B(b), b < 3 ? 0.36 : 0.48);

// The cup slips (a tiny rising glint), breaks, then the blame lands.
sweepDown(T.slip, 0.6, 86, 91, 0.025);
sfx("cup", T.shatter, 0.42, { align: 0.175, from: 0.15, to: 1.6, fadeOut: 0.4, hp: 120, lp: 11000 });
impact(T.shatter, 0.18, 0.6);
stab(T.blame, [50, 51, 57, 63], 0.34);
impact(T.blame, 0.32, 0.9);
tick(T.blame, 0.25);
// two thoughts: a soft pop, then each character taps in
sfx("bubble", T.think1, 0.16, { align: 0.17, from: 0.12, to: 0.4 });
piano(T.think1, [69], 0.13, 1.8);
TYPE.think1.forEach((f, i) => i && tap(f, 0.05));
sfx("bubble", T.think2, 0.16, { align: 0.17, from: 0.12, to: 0.4, pan: -0.2 });
piano(T.think2, [65], 0.13, 2.2);
piano(T.think2 + B(1), [64], 0.1, 2.2);
piano(T.think2 + B(2), [62], 0.09, 2.6);
TYPE.think2.forEach((f, i) => i && tap(f, 0.05));

// Title: piano chords, a bell per line.
[74, 77, 81].forEach((m, i) => {
  bell(T.title[i], m, 0.11, i === 1 ? 0.2 : -0.2, 2.2);
  tick(T.title[i], 0.11, 0);
});
chime(T.titleEn, [86, 93], 0.1);
tick(T.titleEn, 0.1, 0.2);
pad(T.title[0], B(20), [46, 53, 57, 62], 0.05, 1100, 1.2, 0.5);

// Harmony from the title on: a piano chord on every change, a pad under it,
// and the bass from the steps on.
PROG.forEach(([beat, name], i) => {
  const next = i + 1 < PROG.length ? PROG[i + 1][0] : END_BEAT;
  const c = CH[name];
  const len = B(next - beat);
  piano(B(beat), c.p, beat < 20 ? 0.18 : beat >= 100 ? 0.15 : 0.13, 2.8);
  if (beat >= 20) pad(B(beat), B(next), c.p.map((m) => m + 12), beat >= 76 ? 0.04 : 0.032, beat >= 76 ? 1800 : 1300, 0.6, 0.5);
  if (beat >= 20 && beat < 112) bassNote(B(beat), len - 2, c.b + 12, beat >= 100 ? 0.12 : 0.17);
});

// Gentle 8th-note piano arpeggio in the explaining and practice sections.
const chordAt = (beat: number) => {
  let c = CH[PROG[0][1]];
  for (const [b, name] of PROG) if (b <= beat) c = CH[name];
  return c;
};
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
for (let e = 20 * 2; e < 100 * 2; e++) {
  const beat = e / 2;
  if (beat >= 70 && beat < 76) continue; // the dive: only the low drone
  const c = chordAt(Math.floor(beat));
  const m = c.p[ARP[e % ARP.length] % c.p.length] + 12;
  pluck(B(beat), m, 0.045 + (e % 2 ? 0 : 0.012), e % 4 < 2 ? -0.25 : 0.25, 0.7, 0.35);
}

// Kicks on the first beat of each bar, plus the camera moves.
for (let b = 20; b < 100; b += 4) kick(B(b), b % 16 === 0 ? 0.42 : 0.34, 0.5);
for (let b = 78; b < 100; b += 4) kick(B(b), 0.22, 0.3);
// shaker on 8ths in the practices, 16ths in the "automatic thoughts"
for (let s = 60 * 4; s < 70 * 4; s++) shaker(B(0) + S(s), s % 2 ? 0.05 : 0.09, s % 2 ? 0.3 : -0.3);
for (let e = 76 * 2; e < 100 * 2; e++) shaker(B(e / 2), e % 2 ? 0.05 : 0.08, e % 2 ? 0.3 : -0.3);

// Camera moves: a whoosh peaking on the beat.
for (const f of [T.steps, T.r1, T.r2, T.r3, T.p1, T.p2, T.end]) whooshAt(f, 0.2);
whooshAt(T.now, 0.12, 0.3);
tick(T.now, 0.1, 0.3);

// Steps
pluck(T.one, 72, 0.16, -0.2, 1.2);
tick(T.one, 0.08, -0.2);
piano(T.two, [45], 0.2, 2.4);
pluck(T.two, 69, 0.13, 0.25, 1.2);
tick(T.two, 0.13, 0.25);
bell(T.guiltRing, 81, 0.1, -0.3, 1.6);
piano(T.shameFlood, [38, 45], 0.22, 3);
tick(T.shameFlood, 0.07, 0.3);
sweepDown(T.small, 0.7, 69, 57, 0.06);
tick(T.small, 0.07, 0.3);

// Reason 1: a music-box tune; the heart goes over on the 100 and back on the 60.
[81, 86, 89, 88, 86, 84, 81, 82, 79, 81, 77, 76].forEach((m, i) => musicBox(B(36 + i), m, i === 2 || i === 4 ? 0.07 : 0.05, i % 2 ? 0.3 : -0.3));
musicBox(T.good, 93, 0.09, 0.2);
musicBox(T.good + 3, 96, 0.07, 0.3);
tick(T.good, 0.06, 0.2);
impact(T.bad, 0.14, 0.5);
musicBox(T.bad + 3, 80, 0.07, -0.2);
tick(T.bad, 0.06, -0.2);

// Reason 2: a heartbeat again; one call answered, one not.
for (let b = 48; b < 54; b++) heartbeat(B(b), 0.38);
for (const [i, f] of T.calls.entries()) {
  put(music, f, 0.6, 0.09, -0.1, (t) => Math.sin(TAU * 880 * t) * Math.exp(-t / 0.15) * attack(t, 0.002), 0.4);
  tick(f, 0.06, -0.1);
  if (i === 0) {
    piano(f + S(2), [65, 69, 72], 0.1, 2.4);
    bell(f + S(2), 84, 0.06, 0.2, 1.8);
  }
}
chime(T.model, [81, 88], 0.12);
for (const d of [0, S(1)]) put(music, T.vague + d, 0.2, 0.06, 0.2, (t) => Math.sin(TAU * 520 * t) * Math.exp(-t / 0.05) * attack(t, 0.002), 0.2);
tick(T.vague, 0.05, -0.3);
sonar(T.radar, 0.09);
piano(T.heard, [70], 0.14, 2);
TYPE.heard.forEach((f, i) => i && tap(f, 0.05));

// Reason 3: thoughts pop out on 8ths; two get names; the dive to the core.
T.chips.forEach((f, i) => {
  sfx("pop", f, 0.13, { align: 0.03, from: 0.0, to: 0.14, pan: i % 2 ? 0.4 : -0.4 });
  pluck(f, [76, 79, 81, 84][i], 0.1, i % 2 ? 0.4 : -0.4, 0.8);
});
T.labels.forEach((f, i) => {
  tick(f, 0.07, i ? 0.4 : -0.4);
  bell(f, i ? 88 : 86, 0.07, i ? 0.4 : -0.4, 1.2);
});
pad(T.dive, T.p1, [26, 38, 45], 0.09, 300, 1.0, 0.6);
whooshAt(T.dive, 0.1, -0.2);
tick(T.dive, 0.12);
piano(T.dive, [38], 0.16, 2.6);
sweepDown(T.dive, 0.9, 62, 50, 0.05);
piano(T.core, [33, 45], 0.24, 3.2);
bell(T.core, 57, 0.08, 0, 2.4);

// Practice 1: the scribble, pencil taps, a rising shimmer, the mend.
sfx("scribble", T.strike, 2.4, { align: 0.42, from: 0.42, to: 0.9, fadeIn: 0.003, fadeOut: 0.06, hp: 900, lp: 10000 });
tick(T.strike, 0.07);
TYPE.rewrite.forEach((f) => tap(f, 0.06));
tick(T.rewrite, 0.1, -0.2);
[77, 81, 84, 88].forEach((m, i) => bell(T.lift + S(i), m, 0.06, i % 2 ? 0.3 : -0.3, 0.5));
chime(T.mend, [84, 91, 96], 0.13);
tick(T.mend, 0.12, 0.2);
piano(T.mend, [65, 69, 72, 76], 0.12, 3);

// Practice 2: the spill, the kind sentence, the mirror, warmth.
plop(T.spill, 0.16);
pluck(T.comfort, 72, 0.12, 0.2, 1.4);
TYPE.comfort.forEach((f, i) => i && tap(f, 0.045));
bell(T.mirror, 84, 0.08, 0.1, 2);
[79, 84, 88].forEach((m, i) => bell(T.mirror + S(i + 1), m, 0.04, i % 2 ? 0.3 : -0.3, 1.4));
sfx("chime", T.warm, 3.2, { align: 0.02, from: 0.0, to: 3.2, fadeOut: 0.8, hp: 400, lp: 12000, reverb: 0.2 });
piano(T.warm, [65, 69, 72, 77], 0.12, 3.4);
// a small melody over the practice-2 chords
[[89, 72], [90, 74], [91, 77], [92, 76], [94, 74], [95, 72], [96, 70], [97, 69], [98, 67], [99, 72]].forEach(([b, m]) => piano(B(b), [m + 12], 0.07, 1.8, 0.4));

// Wood-block accents on the quieter key actions.
for (const [f, pan] of [
  [T.titleEn, 0.2], [T.one, -0.2], [T.two, 0.25], [T.small, 0.3], [T.now, 0.3], [T.r3, 0], [T.vague, -0.3],
  ...T.chips.map((f, i) => [f, i % 2 ? 0.4 : -0.4]), [T.mend, 0.2], [T.p2, 0], [T.mirror, 0.1], [T.warm, -0.1],
  [T.end, 0], [T.line, 0.2], [T.help, -0.1],
] as [number, number][]) block(f, f === T.titleEn || f === T.mend ? 0.2 : 0.12, pan);

// Ending: chimes, a last bell, birds at dawn.
sfx("chime", T.line, 3.6, { align: 0.02, from: 0.0, to: 4.0, fadeOut: 1.2, hp: 400, lp: 12000, reverb: 0.25, pan: -0.2 });
bell(T.line, 84, 0.07, 0.2, 2.6);
tick(T.end, 0.1);
tick(T.line, 0.1, 0.2);
bell(T.help, 81, 0.06, -0.1, 2.6);
pad(T.end, DURATION, [65, 72, 76, 79], 0.035, 2200, 2, 0.1);
sfx("birds", T.end, 1.6, { align: 5.0, from: 5.0, to: 5.0 + (DURATION - T.end) / 30, fadeIn: 2.0, fadeOut: 0.5, hp: 350, lp: 9000 });
[[100, 77], [102, 76], [104, 74], [106, 72], [108, 69], [110, 72]].forEach(([b, m]) => piano(B(b), [m + 12], 0.06, 2.4, 0.45));

// ------------------------------------------------------------------ mix
// Sidechain: bass (deep) and music (light) duck under every kick.
const duck = (depth: number) => {
  const env = new Float32Array(N).fill(1);
  for (const k of kicks) {
    const s0 = sampleAt(k.frame);
    const d = depth * k.depth;
    for (let i = 0; i < SR * 0.4 && s0 + i < N; i++) {
      const shape = Math.min(1, i / (SR * 0.004)) * Math.exp(-i / (SR * 0.12));
      env[s0 + i] *= 1 - d * shape;
    }
  }
  return env;
};
const duckBass = duck(0.7);
const duckMusic = duck(0.25);

// Freeverb-style room on the send bus.
const reverb = (input: Bus) => {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const allp = [556, 441, 341, 225];
  const out = bus();
  for (let c = 0; c < 2; c++) {
    const spread = c ? 23 : 0;
    const x = input[c];
    const y = out[c];
    for (const len0 of combs) {
      const len = Math.round((len0 + spread) * scale);
      const buf = new Float32Array(len);
      let p = 0;
      let store = 0;
      for (let i = 0; i < N; i++) {
        const o = buf[p];
        store = o * 0.7 + store * 0.3; // damping
        buf[p] = x[i] * 0.03 + store * 0.88; // room size
        y[i] += o;
        p = (p + 1) % len;
      }
    }
    for (const len0 of allp) {
      const len = Math.round((len0 + spread) * scale);
      const buf = new Float32Array(len);
      let p = 0;
      for (let i = 0; i < N; i++) {
        const b = buf[p];
        const v = y[i];
        buf[p] = v + b * 0.5;
        y[i] = b - v;
        p = (p + 1) % len;
      }
    }
  }
  return out;
};
const wet = reverb(send);

const mix = bus();
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    mix[c][i] = drums[c][i] + bass[c][i] * duckBass[i] + music[c][i] * duckMusic[i] + fx[c][i] + wet[c][i] * 0.85;
  }
}

// High-pass (32 Hz) and a gentle low-pass (16 kHz) before the silences, so they stay exact.
for (let c = 0; c < 2; c++) {
  const h = new SVF();
  const l = new SVF();
  for (let i = 0; i < N; i++) mix[c][i] = l.step(h.step(mix[c][i], 32, 0.707).hp, 16000, 0.707).lp;
}

// Planned silences are true digital silence (with a 3 ms fade into each).
for (const { from, to } of SILENCES) {
  const a = sampleAt(from);
  const b = sampleAt(to);
  const fade = Math.floor(SR * 0.003);
  for (let c = 0; c < 2; c++) {
    for (let i = Math.max(0, a - fade); i < a; i++) mix[c][i] *= (a - i) / fade;
    for (let i = a; i < b; i++) mix[c][i] = 0;
  }
}

// Ending: the picture fades to black over [fade, end); the sound follows.
{
  const a = sampleAt(T.fade);
  for (let c = 0; c < 2; c++) {
    for (let i = a; i < N; i++) {
      const u = (i - a) / (N - a);
      mix[c][i] *= Math.cos((Math.PI / 2) * u) ** 1.5;
    }
  }
}

// Master: soft knee above 0.6 of the peak target (tames the cup and the blame
// stab, lifts the quiet piano), then normalise to −1 dBFS.
let raw = 0;
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) raw = Math.max(raw, Math.abs(mix[c][i]));
const pre = 1 / raw;
const knee = 0.6;
const soft = (x: number) => {
  const a = Math.abs(x);
  if (a <= knee) return x;
  return Math.sign(x) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)));
};
let peak = 0;
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    mix[c][i] = soft(mix[c][i] * pre * 1.35);
    peak = Math.max(peak, Math.abs(mix[c][i]));
  }
}
// −1 dBFS peak would put the film near −13.5 LUFS; a gentle explainer sits better around −15.
const TARGET = 10 ** (-1.5 / 20);
const gain = TARGET / peak;

const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(mix[0][i] * gain * 32767), i * 4);
  data.writeInt16LE(Math.round(mix[1][i] * gain * 32767), i * 4 + 2);
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
writeFileSync("public/audio/self-blame.wav", Buffer.concat([header, data]));
console.log(`public/audio/self-blame.wav  ${(N / SR).toFixed(3)}s  ${kicks.length} kicks  peak -1.5 dBFS`);
