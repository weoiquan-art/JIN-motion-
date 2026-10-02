// Synthesises IntroFree's soundtrack and writes public/audio/intro-free.wav.
// No samples: every drum, pad and pluck is built from oscillators and noise.
// All timing comes from src/intro-free/beat.ts + timeline.ts — the same
// constants the picture uses — so every hit lands on the frame of its cue.
//   npm run audio:free

import { mkdirSync, writeFileSync } from "node:fs";
import { CONTENT } from "../src/content.ts";
import { B, DURATION, S, SAMPLE_RATE as SR, sampleAt } from "../src/intro-free/beat.ts";
import { SILENCES, T, TYPE, tokenTimes } from "../src/intro-free/timeline.ts";

const N = sampleAt(DURATION);

// ------------------------------------------------------------------ basics
let seed = 20261002;
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
// Scene cuts where the previous bed stops dead (20 ms fade), so the new
// scene's first sound lands on a clean slate.
const CLEAN_CUTS = [T.nice, T.squeeze];

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
  let len = Math.floor(seconds * SR);
  const cut = CLEAN_CUTS.find((c) => frame < c && start + len > sampleAt(c));
  const cutAt = cut === undefined ? Infinity : sampleAt(cut) - start;
  const fadeLen = Math.floor(SR * 0.02);
  if (cut !== undefined) len = cutAt;
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx >= N) break;
    if (idx < 0) continue;
    const v = fn(i / SR, i);
    const k = i > cutAt - fadeLen ? (cutAt - i) / fadeLen : 1;
    const l = (typeof v === "number" ? v : v[0]) * k;
    const r = (typeof v === "number" ? v : v[1]) * k;
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

// ------------------------------------------------------------------ drums
const kicks: { frame: number; depth: number }[] = [];

const kick = (frame: number, vel: number, depth = 0.85) => {
  kicks.push({ frame, depth });
  const body = glide((t) => 50 + 115 * Math.exp(-t / 0.03));
  const knock = new SVF();
  const click = new SVF();
  put(drums, frame, 0.5, vel, 0, (t) => {
    const b = body(t) * Math.exp(-t / 0.2) * attack(t, 0.0008) * 0.85;
    // a short mid "knock" so the kick still reads on phone speakers
    const k = knock.step(noise(), 1800, 0.9).bp * Math.exp(-t / 0.007) * 1.3;
    return Math.tanh(1.6 * (b + k)) + click.step(noise(), 4200, 0.8).bp * 1.6 * Math.exp(-t / 0.0022);
  });
};

// Soft, low "heartbeat" for the quiet sections: lub (on the grid) + dub (a 16th later).
const heartbeat = (frame: number, vel: number) => {
  for (const [off, g] of [
    [0, 1],
    [S(1), 0.45],
  ] as const) {
    const body = glide((t) => 52 + 46 * Math.exp(-t / 0.045));
    const lp = new SVF();
    const tick = new SVF();
    put(drums, frame + off, 0.35, vel * g, 0, (t) =>
      lp.step(Math.tanh(2.2 * body(t) * Math.exp(-t / 0.14) * attack(t, 0.0015)), 520).lp * 1.1 +
      tick.step(noise(), 1100, 1.4).bp * 0.7 * Math.exp(-t / 0.008),
    );
  }
};

const clap = (frame: number, vel: number) => {
  const fl = new SVF();
  const fr = new SVF();
  put(
    drums,
    frame,
    0.4,
    vel,
    0,
    (t) => {
      let env = 0;
      [0, 0.009, 0.018].forEach((d, i) => {
        if (t >= d) env = Math.max(env, (1 - i * 0.22) * Math.exp(-(t - d) / 0.0035));
      });
      if (t >= 0.027) env = Math.max(env, 0.5 * Math.exp(-(t - 0.027) / 0.11));
      return [fl.step(noise(), 1300, 1.1).bp * env * 2.4, fr.step(noise(), 1450, 1.1).bp * env * 2.4];
    },
    0.22,
  );
};

const snare = (frame: number, vel: number) => {
  const f = new SVF();
  const tone = glide((t) => 210 - 30 * t);
  put(
    drums,
    frame,
    0.22,
    vel,
    0,
    (t) => f.step(noise(), 3200, 0.6).bp * 2 * Math.exp(-t / 0.055) + tone(t) * 0.5 * Math.exp(-t / 0.035),
    0.15,
  );
};

const hat = (frame: number, vel: number, open = false, pan = 0) => {
  const f = new SVF();
  put(drums, frame, open ? 0.45 : 0.08, vel, pan, (t) => f.step(noise(), 7600, 0.8).hp * Math.exp(-t / (open ? 0.12 : 0.018)));
};

const shaker = (frame: number, vel: number, pan = 0) => {
  const f = new SVF();
  put(drums, frame, 0.12, vel, pan, (t) => f.step(noise(), 6000, 1.2).bp * 1.6 * attack(t, 0.004) * Math.exp(-t / 0.035));
};

const tick = (frame: number, vel: number, pan = 0) => {
  const f = new SVF();
  put(drums, frame, 0.04, vel, pan, (t) => f.step(noise(), 2600, 1.6).bp * 3 * Math.exp(-t / 0.003) + Math.sin(TAU * 1250 * t) * 0.4 * Math.exp(-t / 0.012));
};

// ------------------------------------------------------------------ tonal voices
// Soft electric-piano-ish pluck: additive, upper partials die first.
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

// Felt piano: slightly inharmonic partials, a little detune between ears.
const piano = (frame: number, midis: number[], vel: number, decay = 2.4, reverb = 0.35) => {
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
        const env = attack(t, 0.004);
        return [l * env, r * env];
      },
      reverb,
    );
  }
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
      const idx = 2.2 * Math.exp(-t / 0.35);
      return Math.sin(TAU * f0 * t + idx * Math.sin(TAU * f0 * 3.5 * t)) * Math.exp(-t / decay) * attack(t, 0.0015);
    },
    0.45,
  );
};

// Pad: three detuned band-limited saws per note through a low-pass.
const pad = (from: number, to: number, midis: number[], vel: number, cutoff: number, atk = 0.6, rel = 0.6) => {
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

// Supersaw chord for the full section (pumped by the sidechain later).
const supersaw = (from: number, to: number, midis: number[], vel: number) => {
  const len = (to - from) / 30 + 0.08;
  const holdEnd = (to - from) / 30;
  const g = vel / Math.sqrt(midis.length);
  const detune = [-0.011, -0.005, 0, 0.005, 0.011];
  for (const m of midis) {
    const f0 = hz(m);
    const oscL = detune.map(() => new Saw());
    const oscR = detune.map(() => new Saw());
    const fl = new SVF();
    const fr = new SVF();
    put(
      music,
      from,
      len,
      g,
      0,
      (t) => {
        const env = attack(t, 0.006) * (t > holdEnd ? Math.max(0, 1 - (t - holdEnd) / 0.08) : 1);
        let l = 0;
        let r = 0;
        detune.forEach((d, i) => {
          l += oscL[i].next(f0 * (1 + d));
          r += oscR[i].next(f0 * (1 - d * 0.9));
        });
        const cut = 3600 + 2800 * Math.exp(-t / 0.12);
        return [fl.step(l, cut, 0.7).lp * env * 0.2, fr.step(r, cut, 0.7).lp * env * 0.2];
      },
      0.18,
    );
  }
};

// Pluck lead: saw through a closing filter.
const lead = (frame: number, frames: number, midi: number, vel: number) => {
  const f0 = hz(midi);
  const a = new Saw();
  const b = new Saw();
  const f = new SVF();
  const hold = frames / 30;
  put(
    music,
    frame,
    hold + 0.25,
    vel,
    0,
    (t) => {
      const env = attack(t, 0.003) * (t < hold ? 0.55 + 0.45 * Math.exp(-t / 0.09) : 0.55 * Math.exp(-(t - hold) / 0.05));
      const vib = 1 + 0.003 * Math.sin(TAU * 5.2 * t) * Math.min(1, t / 0.2);
      const x = a.next(f0 * vib) * 0.6 + b.next(f0 * 2.002 * vib) * 0.25;
      return [f.step(x, 1500 + 4200 * Math.exp(-t / 0.08), 1.2).lp * env, f.lp * env];
    },
    0.25,
  );
};

const bassNote = (frame: number, frames: number, midi: number, vel: number) => {
  const f0 = hz(midi);
  const hold = frames / 30;
  const o = glide(() => f0);
  const lp = new SVF();
  const s = new Saw();
  put(bass, frame, hold + 0.06, vel, 0, (t) => {
    const env = attack(t, 0.004) * (t < hold ? 1 : Math.max(0, 1 - (t - hold) / 0.06));
    // sub sine + filtered saw an octave up so it is audible on small speakers
    const x = o(t) * 0.55 + lp.step(s.next(f0 * 2), 1000, 0.8).lp * 0.55;
    return Math.tanh(1.4 * x) * env;
  });
};

// ------------------------------------------------------------------ fx
const typeClick = (frame: number, vel: number) => {
  const f = new SVF();
  const pan = (rnd() - 0.5) * 0.5;
  const thock = 150 + 70 * rnd();
  put(drums, frame, 0.05, vel, pan, (t) => f.step(noise(), 3300 + 900 * rnd(), 2.5).bp * 2.4 * Math.exp(-t / 0.0045) + Math.sin(TAU * thock * t) * 0.5 * Math.exp(-t / 0.018));
};

const blip = (frame: number, midi: number, vel: number, pan = 0, len = 0.06) => {
  const f0 = hz(midi);
  const f = new SVF();
  put(
    music,
    frame,
    len * 3,
    vel,
    pan,
    (t) => f.step(Math.sign(Math.sin(TAU * f0 * t)), 3000, 0.7).lp * Math.exp(-t / len) * attack(t, 0.001) * 0.6,
    0.2,
  );
};

const whoosh = (frame: number, vel: number, dur = 0.32, up = true) => {
  const f = new SVF();
  put(
    fx,
    frame,
    dur,
    vel,
    0,
    (t) => {
      const u = t / dur;
      const c = up ? 500 * 9 ** u : 4500 / 9 ** u;
      return f.step(noise(), c, 1.4).bp * 2.2 * attack(t, 0.006) * (1 - u) ** 1.5;
    },
    0.2,
  );
};

const impact = (frame: number, vel: number, size = 1) => {
  const sub = glide((t) => 64 * Math.exp(-t / (0.45 * size)) + 42);
  const n = new SVF();
  put(
    fx,
    frame,
    1.4 * size,
    vel,
    0,
    (t) => Math.tanh(1.8 * (sub(t) * 0.8 * Math.exp(-t / (0.32 * size)) + n.step(noise(), 2200, 0.7).lp * 1.5 * Math.exp(-t / 0.07))),
    0.35,
  );
};

const crash = (frame: number, vel: number) => {
  const fl = new SVF();
  const fr = new SVF();
  put(fx, frame, 2.2, vel, 0, (t) => {
    const env = attack(t, 0.002) * Math.exp(-t / 0.75);
    return [fl.step(noise(), 5200, 0.5).hp * env, fr.step(noise(), 5600, 0.5).hp * env];
  }, 0.3);
};

// Distorted power chord for the squeeze hits.
const powerHit = (frame: number, root: number, vel: number) => {
  const oscs = [root, root + 7, root + 12].map((m) => ({ f: hz(m), a: new Saw(), b: new Saw() }));
  const f = new SVF();
  put(
    music,
    frame,
    0.5,
    vel,
    0,
    (t) => {
      let x = 0;
      for (const o of oscs) x += o.a.next(o.f * 0.997) + o.b.next(o.f * 1.004);
      return Math.tanh(2.6 * f.step(x * 0.25, 1600 + 2400 * Math.exp(-t / 0.06), 0.9).lp) * Math.exp(-t / 0.16) * attack(t, 0.002);
    },
    0.2,
  );
};

const crunch = (frame: number, vel: number) => {
  let hold = 0;
  const f = new SVF();
  put(fx, frame, 0.16, vel, 0, (t, i) => {
    if (i % 24 === 0) hold = noise();
    return f.step(hold, 2400, 0.8).bp * 2 * Math.exp(-t / 0.05);
  });
};

// Data glitch: random square tones re-picked every 32nd note.
const glitch = (frame: number, frames: number, vel: number) => {
  let note = 84;
  const f = new SVF();
  const dur = frames / 30;
  put(
    music,
    frame,
    dur,
    vel,
    0,
    (t, i) => {
      if (i % sampleAt(2) === 0) note = 72 + Math.floor(rnd() * 24);
      const sq = Math.sign(Math.sin(TAU * hz(note) * t));
      const crushed = Math.round(sq * 3) / 3;
      return f.step(crushed, 4200, 0.7).lp * 0.45 * (1 - t / dur) * attack(t, 0.001);
    },
    0.1,
  );
};

const noiseBurst = (frame: number, vel: number) => {
  let hold = 0;
  put(fx, frame, 0.5, vel, 0, (t, i) => {
    if (i % 6 === 0) hold = noise();
    return [hold * Math.exp(-t / 0.12) * attack(t, 0.001), noise() * Math.exp(-t / 0.12) * attack(t, 0.001)];
  }, 0.2);
};

// Rising filtered noise + rising tone, ends where `to` begins.
// `dip`: frames where a hit should punch through (the riser ducks around it).
const riser = (from: number, to: number, vel: number, dip: number[] = []) => {
  const dur = (to - from) / 30;
  const f = new SVF();
  const tone = glide((t) => 180 * 4 ** (t / dur));
  put(fx, from, dur, vel, 0, (t) => {
    const u = t / dur;
    let g = 1;
    for (const d of dip) {
      const dt = t - (d - from) / 30;
      if (dt > -0.07 && dt < 0) g *= Math.max(0, -dt - 0.02) < 0.05 ? Math.max(0, (-dt - 0.02) / 0.05) : 1; // a hole before the hit
      if (dt >= 0) g *= 1 - 0.85 * Math.exp(-dt / 0.06);
    }
    return (f.step(noise(), 300 * 25 ** u, 2).bp * 2 + tone(t) * 0.25) * u * u * g;
  }, 0.2);
};

// Reverse swell into a downbeat: rises and stops dead on `to`.
const swell = (from: number, to: number, vel: number) => {
  const dur = (to - from) / 30;
  const f = new SVF();
  put(fx, from, dur, vel, 0, (t) => {
    const gap = Math.min(1, Math.max(0, (dur - 0.04 - t) / 0.03));
    return f.step(noise(), 2500 + 5000 * (t / dur), 0.7).bp * (t / dur) ** 3 * 2 * gap;
  });
};

// Glassy chime with a hard attack (cuts into something pretty).
const chime = (frame: number, midis: number[], vel: number) => {
  for (const [i, m] of midis.entries()) {
    const f0 = hz(m);
    put(music, frame, 2.5, vel / midis.length, i % 2 ? 0.35 : -0.35, (t) => {
      let s = 0;
      for (const [r, a, d] of [
        [1, 1, 1.2],
        [2.76, 0.5, 0.35],
        [5.4, 0.3, 0.12],
      ]) s += Math.sin(TAU * f0 * r * t) * a * Math.exp(-t / d);
      return s * attack(t, 0.0008);
    }, 0.5);
  }
};

const sweepDown = (frame: number, dur: number, from: number, to: number, vel: number) => {
  const o = glide((t) => hz(from + (to - from) * Math.min(1, t / dur)));
  const s = new Saw();
  const f = new SVF();
  put(music, frame, dur, vel, 0, (t) => {
    const x = o(t) * 0.6 + f.step(s.next(hz(from + (to - from) * Math.min(1, t / dur))), 1800, 0.8).lp * 0.4;
    return x * attack(t, 0.003) * (1 - t / dur);
  }, 0.25);
};

// ------------------------------------------------------------------ score
const CH = {
  Am9: [57, 60, 64, 67, 71],
  Fmaj9: [53, 57, 60, 64, 67],
  Cmaj9: [48, 55, 59, 62, 64],
  G6: [55, 59, 62, 64],
  Esus: [52, 57, 59, 64],
  Am: [57, 60, 64, 69],
  F: [53, 57, 60, 65],
  C: [55, 60, 64, 67],
  G: [55, 59, 62, 67],
};
const ROOT = { A: 33, F: 29, C: 36, G: 31, E: 28 };
const visible = (text: string) => [...text].map((ch) => ch.trim() !== "");

// --- opening (bars 0–1): heartbeat, a pad, the keyboard
pad(0, B(4), CH.Am9, 0.09, 900, 1.4, 0.9);
pad(B(4), B(8), CH.Fmaj9, 0.09, 1100, 0.9, 0.5);
for (const f of [B(0), B(2), B(4), B(6)]) heartbeat(f, 0.32);
TYPE.name.forEach((f, i) => visible(CONTENT.opening.name)[i] && typeClick(f, 0.2));
TYPE.job.forEach((f, i) => visible(CONTENT.opening.job)[i] && typeClick(f, 0.18));
tick(T.jobType, 0.24);
bell(T.nameAccent, 76, 0.13, -0.2);
pluck(T.nameAccent, 64, 0.14, 0.2);
bell(T.jobHighlight, 81, 0.11, 0.25);
pluck(T.jobHighlight, 69, 0.14, -0.2);
swell(T.jobHighlight + S(2), T.windows[0], 0.12);

// --- daily (bars 2–4): the groove arrives
const dailyChords = [
  { ch: CH.Am9, root: ROOT.A },
  { ch: CH.Fmaj9, root: ROOT.F },
  { ch: CH.G6, root: ROOT.G },
];
const arp = [0, 2, 1, 3, 2, 4, 3, 1];
dailyChords.forEach(({ ch, root }, w) => {
  const start = T.windows[w];
  const lift = 1 + w * 0.06;
  pad(start, start + B(4), ch, 0.06, 950, 0.15, 0.2);
  whoosh(start, 0.32);
  impact(start, 0.38, 0.6);
  tick(start, 0.22);
  for (let b = 0; b < 4; b++) {
    const f = start + B(b);
    kick(f, 0.78 * lift);
    if (b % 2 === 1) clap(f, 0.42 * lift);
    hat(f + S(2), 0.22 * lift, false, 0.2);
    if (w > 0) {
      hat(f + S(1), 0.07, false, -0.3);
      hat(f + S(3), 0.07, false, -0.3);
    }
    bassNote(f + S(2), 6, root + 12, 0.42);
  }
  for (let e = 0; e < 8; e++) pluck(start + S(2 * e), ch[arp[e] % ch.length] + 12, 0.07, e % 2 ? 0.35 : -0.35, 0.5, 0.25);
});
// one event per beat inside each window
blip(T.windowBeats[0][0], 79, 0.16, 0.2, 0.05);
blip(T.windowBeats[0][0] + 2, 72, 0.13, 0.2, 0.05);
blip(T.windowBeats[0][1], 76, 0.16, -0.2);
pluck(T.windowBeats[0][1], 76, 0.16);
bell(T.windowBeats[0][2], 81, 0.14, 0.1, 0.5);
bell(T.windowBeats[0][2] + S(1), 88, 0.07, 0.1, 0.4);
[72, 76, 79].forEach((m, i) => {
  pluck(T.windowBeats[1][i], m, 0.2, i - 1);
  whoosh(T.windowBeats[1][i], 0.12, 0.14);
  tick(T.windowBeats[1][i], 0.14, i - 1);
});
[74, 79].forEach((m, i) => {
  pluck(T.windowBeats[2][i], m, 0.2, 0.3 - i * 0.6);
  blip(T.windowBeats[2][i], m + 12, 0.1);
});
bell(T.windowBeats[2][2], 83, 0.18, 0, 0.6);
pluck(T.windowBeats[2][2], 71, 0.2);

// --- "working with AI" (bar 5): pretty, a little hollow
pad(T.nice, T.squeeze, CH.Cmaj9.map((m) => m + 12), 0.08, 2200, 0.2, 0.1);
chime(T.nice, [84, 91, 88], 0.5);
bell(T.nice, 79, 0.12, 0.2);
kick(T.nice, 0.5, 0.4);
kick(T.nice + B(2), 0.42, 0.4);
for (let e = 0; e < 8; e++) {
  shaker(T.nice + S(2 * e), e % 2 ? 0.16 : 0.1, e % 2 ? 0.4 : -0.4);
  const notes = [76, 79, 83, 86, 88, 86, 83, 79];
  bell(T.nice + S(2 * e), notes[e], 0.03, e % 2 ? 0.5 : -0.5, 0.4);
}
chime(T.niceSub, [86, 91], 0.3);
pluck(T.niceSub, 72, 0.15);

// --- squeeze (bar 6): three hits, the ideas burst out, the tape stops
const hits = [
  { f: T.squeeze, root: 40 },
  { f: T.slams[0], root: 41 },
  { f: T.slams[1], root: 42 },
];
hits.forEach(({ f, root }, i) => {
  kick(f, 0.95, 0.9);
  impact(f, 0.5 + i * 0.08, 0.7);
  powerHit(f, root, 0.32 + i * 0.04);
  crunch(f, 0.18 + i * 0.05);
  bassNote(f, 10, root - 12, 0.5);
});
for (let s = 0; s < 12; s++) hat(T.squeeze + S(s), 0.05 + 0.012 * s, false, s % 2 ? 0.3 : -0.3);
kick(T.pour, 0.9, 0.9);
noiseBurst(T.pour, 0.16);
sweepDown(T.pour, 0.6, 67, 43, 0.3);
whoosh(T.pour, 0.25, 0.4, false);
for (let s = 1; s < 4; s++) blip(T.pour + S(s), 79 - s * 5, 0.12, s % 2 ? 0.4 : -0.4, 0.04);

// --- quiet (bar 7): silence, then one low note
piano(T.dry, [33, 45, 52], 0.2, 3.4, 0.45);

// --- the question (bar 8): the heartbeat comes back
pad(T.want, T.chainIn, [57, 64, 71, 72], 0.05, 900, 0.8, 0.4);
heartbeat(T.want, 0.3);
heartbeat(T.unclear, 0.34);
piano(T.want, [57, 64], 0.08, 2.0);
pluck(T.unclear, 76, 0.1, 0.2, 1.2);

// --- the chain (bars 9–10): build
pad(T.chainIn, T.toVideo, CH.Fmaj9, 0.07, 1000, 0.1, 0.2);
pad(T.toVideo, T.denoise, CH.G6, 0.07, 1300, 0.05, 0.1);
pad(T.denoise, T.breath, CH.Esus, 0.08, 1700, 0.05, 0.02);
for (let b = 0; b < 8; b++) {
  const f = T.chainIn + B(b);
  if (f >= T.breath) break;
  kick(f, 0.62 + 0.04 * b);
  hat(f + S(2), 0.16 + 0.015 * b, false, 0.25);
  const root = b < 4 ? ROOT.F : b < 6 ? ROOT.G : ROOT.E;
  bassNote(f + S(2), 6, root + 12, 0.36);
}
// snare roll: 8ths → 16ths → 32nds, getting louder, up to the held breath
for (let f = T.chainIn; f < T.reveal - S(2); ) {
  const u = (f - T.chainIn) / (T.reveal - T.chainIn);
  snare(f, 0.06 + 0.28 * u * u);
  f += f < T.toVideo ? S(2) : f < T.denoise ? S(1) : 2;
}
// arpeggio: 8ths through bar 9, 16ths through bar 10
const arpUp = [0, 1, 2, 3, 2, 1, 3, 2];
for (let f = T.chainIn, s = 0; f < T.breath; f += f < T.toVideo ? S(2) : S(1), s++) {
  const ch = f < T.toVideo ? CH.Fmaj9 : f < T.denoise ? CH.G6 : CH.Esus;
  pluck(f, ch[arpUp[s % 8] % ch.length] + 12, 0.06, s % 2 ? 0.4 : -0.4, 0.35, 0.2);
}
riser(T.toVideo, T.breath, 0.2, [T.reveal]);
whoosh(T.chainIn, 0.28, 0.3);
glitch(T.toLlm, 10, 0.12);
whoosh(T.toLlm, 0.22, 0.25);
tokenTimes.forEach((f, i) => blip(f, 72 + [0, 2, 4, 7, 9, 12, 14, 16][i % 8], 0.1, (i / tokenTimes.length) * 1.4 - 0.7, 0.035));
glitch(T.rewrite, 6, 0.14);
bell(T.rewrite, 81, 0.12, 0.3);
whoosh(T.toVideo, 0.26, 0.3);
noiseBurst(T.noise, 0.2);
bell(T.denoise, 83, 0.14, -0.2);
pluck(T.denoise, 71, 0.18);
impact(T.reveal, 0.5, 0.6);
crash(T.reveal, 0.16);
clap(T.reveal, 0.55);
whoosh(T.reveal, 0.22, 0.3, false);

// --- full (bars 11–12): everything, on every beat
crash(T.drop, 0.28);
impact(T.drop, 0.7, 1.2);
const dropChords = [
  { ch: CH.Am, root: ROOT.A },
  { ch: CH.F, root: ROOT.F },
  { ch: CH.C, root: ROOT.C },
  { ch: CH.G, root: ROOT.G },
];
dropChords.forEach(({ ch, root }, c) => {
  const from = T.drop + B(c * 2);
  supersaw(from, from + B(2), ch, 0.24);
  pad(from, from + B(2), ch.map((m) => m - 12), 0.05, 900, 0.01, 0.05);
  for (let e = 0; e < 4; e++) {
    const f = from + S(2 * e);
    bassNote(f, 6, root + (e % 2 ? 24 : 12), 0.5);
  }
});
for (let b = 0; b < 8; b++) {
  const f = T.drop + B(b);
  kick(f, 1, 0.9);
  if (b % 2 === 1) clap(f, 0.62);
  hat(f + S(2), 0.2, true, 0.15);
  for (let s = 0; s < 4; s++) hat(f + S(s), s === 0 ? 0.12 : s === 2 ? 0.05 : 0.09, false, s % 2 ? 0.35 : -0.35);
}
const hook = [69, 72, 76, 81, 79, 77, 76, 72, 76, 79, 79, 76, 74, 79, 83, 83];
hook.forEach((m, i) => {
  if (i === 15) return; // the last note is held from 14
  lead(T.drop + S(2 * i), i === 14 ? 16 : 7, m, 0.11);
});
for (const f of [T.q1b, ...T.q2, T.q2Last]) impact(f, 0.34, 0.5);
for (const f of T.accents) {
  crash(f, 0.1);
  swell(f - S(2), f, 0.08);
}
impact(T.q2Last, 0.3, 0.8);

// --- landing (bars 13–15): quiet again, still typing
piano(T.land, [41, 48, 57, 64, 67], 0.2, 3.2, 0.5);
pad(T.land, T.thanks, [53, 60, 64, 67], 0.05, 800, 1.2, 0.3);
pad(T.thanks, T.fill[0], [48, 55, 59, 64], 0.05, 800, 0.4, 0.3);
pad(T.fill[0], DURATION, [53, 60, 64, 67], 0.05, 800, 0.4, 0.01);
for (const f of [T.land, T.land + B(2), B(56), B(58), B(60), B(62)]) heartbeat(f, 0.26);
TYPE.learning.forEach((f, i) => visible(CONTENT.ending.learning)[i] && typeClick(f, 0.2));
bell(T.learnHighlight, 76, 0.1, 0.2);
pluck(T.learnHighlight, 69, 0.1, -0.2);
piano(T.thanks, [36, 43, 59, 62, 64], 0.2, 3.4, 0.5);
bell(T.thanks, 81, 0.12, -0.15, 2.2);
chime(T.thanks, [88, 93, 81], 0.28);
// credit + four pixels: a small bright "ping" each, on the beat
const ping = (frame: number, midi: number, vel: number, pan: number) => {
  tick(frame, vel * 1.6, pan);
  blip(frame, midi + 24, vel * 0.8, pan, 0.03);
  pluck(frame, midi, vel, pan, 1.0, 0.35);
};
ping(T.credit, 79, 0.18, 0.25);
[76, 74, 72, 69].forEach((m, i) => ping(T.fill[i], m, 0.16, i % 2 ? 0.3 : -0.3));
piano(T.fill[0], [41, 48, 57, 64, 67], 0.1, 2.2, 0.4);

// ------------------------------------------------------------------ mix
// Sidechain: bass (deep) and music (light) duck under every kick.
const duck = (depth: number) => {
  const env = new Float32Array(N).fill(1);
  for (const k of kicks) {
    const s0 = sampleAt(k.frame);
    const d = depth * k.depth;
    for (let i = 0; i < SR * 0.4 && s0 + i < N; i++) {
      const shape = Math.min(1, i / (SR * 0.004)) * Math.exp(-i / (SR * 0.11));
      env[s0 + i] *= 1 - d * shape;
    }
  }
  return env;
};
const duckBass = duck(0.85);
const duckMusic = duck(0.4);

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
        store = o * 0.75 + store * 0.25; // damping
        buf[p] = x[i] * 0.03 + store * 0.86; // room size
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
    mix[c][i] = drums[c][i] + bass[c][i] * duckBass[i] + music[c][i] * duckMusic[i] + fx[c][i] + wet[c][i] * 0.9;
  }
}

// High-pass (32 Hz), before the stops and silences so they stay exact: nothing below is audible, it only eats headroom.
for (let c = 0; c < 2; c++) {
  const f = new SVF();
  for (let i = 0; i < N; i++) mix[c][i] = f.step(mix[c][i], 32, 0.707).hp;
}

// Tape stop into the silence: the playhead slows from 1× to 0 over [tapeStop, stop).
{
  const s0 = sampleAt(T.tapeStop);
  const s1 = sampleAt(T.stop);
  const L = s1 - s0;
  for (let c = 0; c < 2; c++) {
    const src = mix[c].slice(s0, s1);
    for (let i = 0; i < L; i++) {
      const pos = i - (i * i) / (2 * L); // ∫ rate, rate = 1 − i/L
      const k = Math.floor(pos);
      const frac = pos - k;
      const v = src[k] * (1 - frac) + (src[k + 1] ?? 0) * frac;
      const fade = Math.min(1, (L - i) / (SR * 0.006));
      mix[c][s0 + i] = v * (1 - i / L) ** 0.5 * fade;
    }
  }
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

// Gentle ending: hold, then ease out over the last bar.
{
  const a = sampleAt(B(60));
  for (let c = 0; c < 2; c++) {
    for (let i = a; i < N; i++) {
      const u = (i - a) / (N - a);
      mix[c][i] *= Math.cos((Math.PI / 2) * u * u);
    }
  }
}

// Master: soft knee above 0.8 of the peak target, then normalise to −1 dBFS.
let raw = 0;
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) raw = Math.max(raw, Math.abs(mix[c][i]));
const pre = 1 / raw;
const knee = 0.8;
const soft = (x: number) => {
  const a = Math.abs(x);
  if (a <= knee) return x;
  return Math.sign(x) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)));
};
let peak = 0;
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    mix[c][i] = soft(mix[c][i] * pre * 1.15);
    peak = Math.max(peak, Math.abs(mix[c][i]));
  }
}
const TARGET = 10 ** (-1 / 20);
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
writeFileSync("public/audio/intro-free.wav", Buffer.concat([header, data]));
console.log(`public/audio/intro-free.wav  ${(N / SR).toFixed(3)}s  ${kicks.length} kicks  peak -1.0 dBFS`);
