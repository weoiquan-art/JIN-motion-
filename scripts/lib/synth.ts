// A small synthesizer for film soundtracks made in code (no samples).
// Instruments and effects write into stereo buses at frame positions; a
// Freeverb-style reverb, peak normalisation and a 16-bit WAV writer finish
// the mix. Deterministic: the only randomness is a seeded LCG.
//   const s = synth({ fps: 30, frames: 2400 });
//   s.bell(s.music, frame, 76, 1.5, 0.08); … s.write("public/audio/x.wav");

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type Bus = [Float32Array, Float32Array];

export const synth = ({ fps, frames, sr = 48000, seed = 7 }: { fps: number; frames: number; sr?: number; seed?: number }) => {
  const SR = sr;
  const N = Math.ceil((frames / fps) * SR);
  const smp = (frame: number) => Math.round((frame / fps) * SR);
  const bus = (): Bus => [new Float32Array(N), new Float32Array(N)];
  const music = bus();
  const sfx = bus();
  const send = bus();
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 4294967296) * 2 - 1;
  };
  const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

  /** add fn(t) (t in seconds from the start) at a frame; pan −1…1; rev = reverb send */
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
  const beats = (n: number, bpm: number) => (n * 60) / bpm;

  // ---------------------------------------------------------------- instruments
  /** FM bell / celesta */
  const bell = (b: Bus, frame: number, midi: number, seconds: number, g: number, pan = 0.1, bright = 1.5) => {
    const f = hz(midi);
    const len = seconds + 0.8;
    voice(b, frame, len, g, pan, (t) => {
      const idx = bright * Math.exp(-t * 3.5);
      const e = Math.min(1, t / 0.004) * Math.exp(-t * 1.4) * Math.min(1, Math.max(0, (len - t) / 0.4));
      return e * (Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * f * 2 * t)) + 0.12 * Math.sin(2 * Math.PI * f * 4.01 * t) * Math.exp(-t * 6));
    }, 0.45);
  };
  /** plucked string (Karplus–Strong), harp-like */
  const pluck = (b: Bus, frame: number, midi: number, g: number, pan = 0, decay = 0.996, seconds = 2.2) => {
    const f = hz(midi);
    const L = Math.max(2, Math.round(SR / f));
    const buf = new Float32Array(L);
    for (let i = 0; i < L; i++) buf[i] = rnd() * 0.5 + 0.5 * Math.sin((2 * Math.PI * i) / L);
    let i = 0;
    let prev = 0;
    const len = seconds;
    voice(b, frame, len, g, pan, (t) => {
      const v = buf[i];
      const nxt = buf[(i + 1) % L];
      const y = decay * 0.5 * (v + nxt);
      buf[i] = y;
      i = (i + 1) % L;
      prev = 0.7 * prev + 0.3 * v;
      return prev * Math.min(1, Math.max(0, (len - t) / 0.3));
    }, 0.35);
  };
  /** warm pad: detuned sines with soft harmonics */
  const pad = (b: Bus, frame: number, notes: number[], seconds: number, g: number, attack = 0.6) => {
    const len = seconds + 0.8;
    notes.forEach((m, k) => {
      const f = hz(m);
      voice(b, frame, len, g, k % 2 ? 0.4 : -0.4, (t) => {
        const e = env(t, attack, len, 0.9) * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.3 * t + k));
        let v = 0;
        for (const d of [-0.003, 0.003]) v += Math.sin(2 * Math.PI * f * (1 + d) * t + k) + 0.22 * Math.sin(4 * Math.PI * f * (1 + d) * t) + 0.07 * Math.sin(6 * Math.PI * f * (1 + d) * t);
        return e * v * 0.5;
      }, 0.5);
    });
  };
  const bass = (b: Bus, frame: number, midi: number, seconds: number, g: number) => {
    const f = hz(midi);
    voice(b, frame, seconds + 0.06, g, 0, (t) => {
      const e = Math.min(1, t / 0.01) * (0.65 + 0.35 * Math.exp(-t * 5)) * Math.min(1, Math.max(0, (seconds + 0.06 - t) / 0.08));
      return e * Math.tanh(1.3 * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)));
    });
  };
  const kick = (b: Bus, frame: number, g: number) => {
    const o = sweep((t) => 46 + 80 * Math.exp(-t * 30));
    voice(b, frame, 0.4, g, 0, (t) => o(t) * Math.exp(-t * 8));
  };
  const snap = (b: Bus, frame: number, g: number) => {
    const n = bandNoise(() => 1900, 1.4);
    voice(b, frame, 0.18, g, 0.15, (t) => n(t) * (Math.exp(-t * 40) + 0.5 * (t > 0.012 ? Math.exp(-(t - 0.012) * 50) : 0)), 0.35);
  };
  const shaker = (b: Bus, frame: number, g: number, pan: number) => {
    const n = bandNoise(() => 8500, 1.2);
    voice(b, frame, 0.06, g, pan, (t) => n(t) * Math.min(1, t / 0.006) * Math.exp(-t * 70));
  };

  // ---------------------------------------------------------------- effects
  const riser = (b: Bus, from: number, to: number, g: number, top = 6000) => {
    const len = (to - from) / fps;
    const r = bandNoise((t) => 300 + top * (t / len) ** 2, 1.3);
    voice(b, from, len, g, 0, (t) => r(t) * (t / len) ** 2.2, 0.35);
  };
  const whoosh = (b: Bus, center: number, g: number, pan = 0, len = 0.6, lo = 400, hi = 3600) => {
    const n = lp(bandNoise((t) => lo + hi * Math.sin(Math.PI * Math.min(1, t / len)), 1.1), 6000);
    voice(b, center - Math.round((len / 2) * fps), len, g, pan, (t) => n(t) * Math.sin(Math.PI * Math.min(1, t / len)) ** 2, 0.25);
  };
  const boom = (b: Bus, frame: number, g: number) => {
    const o = sweep((t) => 36 + 40 * Math.exp(-t * 9));
    voice(b, frame, 1.6, g, 0, (t) => o(t) * Math.exp(-t * 2.6) * Math.min(1, t / 0.01), 0.3);
    const n = lp(bandNoise(() => 500, 0.8), 1500);
    voice(b, frame, 0.8, g * 0.35, 0, (t) => n(t) * Math.exp(-t * 6), 0.5);
  };
  /** a glassy ping: two sines a twelfth apart */
  const ping = (b: Bus, frame: number, midi: number, g: number, pan = 0) => {
    const f = hz(midi);
    voice(b, frame, 1.4, g, pan, (t) => (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 3 * t) * Math.exp(-t * 6)) * Math.exp(-t * 3.2) * Math.min(1, t / 0.002), 0.55);
  };
  /** water drop: a sine that jumps up in pitch */
  const plip = (b: Bus, frame: number, g: number, pan = 0, f0 = 700) => {
    const o = sweep((t) => f0 * (1 + 1.6 * Math.min(1, t / 0.05)));
    voice(b, frame, 0.22, g, pan, (t) => o(t) * Math.min(1, t / 0.002) * Math.exp(-t * 22), 0.4);
  };
  /** a cluster of quiet high bells */
  const shimmer = (b: Bus, frame: number, notes: number[], g: number, spread = 2) => notes.forEach((m, k) => bell(b, frame + k * spread, m, 0.6, g, k % 2 ? 0.55 : -0.55, 0.8));
  /** rain: band-limited noise with random drop clicks */
  const rain = (b: Bus, from: number, to: number, g: number) => {
    const len = (to - from) / fps;
    // two low-passes keep the hiss out (nothing much above ~8 kHz)
    const n1 = lp(lp(bandNoise(() => 4200, 0.7), 6500), 6500);
    const n2 = lp(bandNoise(() => 1400, 0.6), 5000);
    voice(b, from, len, g, -0.2, (t) => (n1(t) * 0.8 + n2(t) * 0.3) * env(t, 1.2, len, 1.5));
    voice(b, from, len, g, 0.2, (t) => (n1(t) * 0.8 + n2(t) * 0.3) * env(t, 1.2, len, 1.5));
    for (let f = from; f < to; f += 2) if (rnd() > 0.55) plip(b, f + Math.floor((rnd() + 1) * 1.5), g * 0.18 * (0.4 + 0.6 * Math.abs(rnd())), rnd() * 0.8, 1800 + 1600 * Math.abs(rnd()));
  };

  // ---------------------------------------------------------------- mix
  const reverb = (input: Float32Array, spread: number) => {
    const out = new Float32Array(N);
    const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({ buf: new Float32Array(d + spread), i: 0, store: 0 }));
    const aps = [556, 441, 341].map((d) => ({ buf: new Float32Array(d + spread), i: 0 }));
    for (let n = 0; n < N; n++) {
      let v = 0;
      for (const c of combs) {
        const y = c.buf[c.i];
        c.store = y * 0.75 + c.store * 0.25;
        c.buf[c.i] = input[n] + c.store * 0.86;
        c.i = (c.i + 1) % c.buf.length;
        v += y;
      }
      for (const a of aps) {
        const y = a.buf[a.i];
        a.buf[a.i] = v + y * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        v = y - v;
      }
      out[n] = v * 0.18;
    }
    return out;
  };

  /** mix, soft-clip, fade the end, normalise the peak and write a 16-bit WAV */
  const write = (path: string, opts: { musicGain?: number; sfxGain?: number; wet?: number; fadeOut?: number; peak?: number; duck?: (i: number) => number } = {}) => {
    const { musicGain = 1, sfxGain = 1, wet = 0.8, fadeOut = 1, peak = 0.89, duck = () => 1 } = opts;
    const w = [reverb(send[0], 0), reverb(send[1], 23)];
    const out = [new Float32Array(N), new Float32Array(N)];
    const fadeFrom = N - Math.round(fadeOut * SR);
    let pk = 0;
    for (let c = 0; c < 2; c++) {
      for (let i = 0; i < N; i++) {
        let v = Math.tanh((music[c][i] * musicGain * duck(i) + sfx[c][i] * sfxGain + w[c][i] * wet) * 1.05);
        if (i >= fadeFrom) v *= Math.max(0, 1 - (i - fadeFrom) / (N - fadeFrom));
        out[c][i] = v;
        pk = Math.max(pk, Math.abs(v));
      }
    }
    const norm = peak / Math.max(1e-6, pk);
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
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, Buffer.concat([header, data]));
    return { seconds: N / SR, norm };
  };

  return { SR, N, smp, music, sfx, rnd, hz, beats, voice, sweep, bandNoise, lp, env, bell, pluck, pad, bass, kick, snap, shaker, riser, whoosh, boom, ping, plip, shimmer, rain, write };
};
