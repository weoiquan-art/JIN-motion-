// Self-check for the rendered IntroFree (or just its WAV):
//  · every cue in timeline.ts: where the sound actually starts, and where the
//    picture actually changes (frame-difference onset), both vs. the beat
//  · blind onset detection: every audible attack must sit on the note grid
//  · clipping (sample peak, 4× oversampled true peak, samples at full scale)
//  · silences: every stretch below −60 dBFS must be one of the planned ones
//  · loudness per section (the emotional curve)
//   npm run check:intro-free                       → out/intro-free.mp4
//   npm run check:intro-free -- public/audio/intro-free.wav

import { execFileSync } from "node:child_process";
import { DURATION, FPS, SAMPLE_RATE as SR } from "../src/intro-free/beat.ts";
import { CUES, SEC, SILENCES } from "../src/intro-free/timeline.ts";

const file = process.argv[2] ?? "out/intro-free.mp4";
const FRAME_MS = 1000 / FPS;
const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { maxBuffer: 1 << 30 });
const toF32 = (b: Buffer) => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const fmt = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "-inf");
const pad = (s: string | number, n: number) => String(s).padStart(n);
let problems = 0;
const fail = (msg: string) => {
  problems++;
  console.log(`  ✗ ${msg}`);
};

// ------------------------------------------------------------------ streams
const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file]).toString());
const vStream = probe.streams.find((s: { codec_type: string }) => s.codec_type === "video");
const aStream = probe.streams.find((s: { codec_type: string }) => s.codec_type === "audio");
console.log(`\n${file}`);
if (vStream) {
  console.log(`  video: ${vStream.codec_name} ${vStream.width}x${vStream.height} ${vStream.r_frame_rate} fps, ${vStream.nb_frames} frames, ${vStream.pix_fmt}`);
  if (vStream.codec_name !== "h264") fail(`video codec is ${vStream.codec_name}, expected h264`);
  if (Number(vStream.nb_frames) !== DURATION) fail(`${vStream.nb_frames} frames, expected ${DURATION}`);
}
if (!aStream) throw new Error("no audio stream");
console.log(`  audio: ${aStream.codec_name} ${aStream.sample_rate} Hz ${aStream.channels} ch, ${Number(aStream.duration).toFixed(3)} s`);

// ------------------------------------------------------------------ audio
const raw = toF32(run("ffmpeg", ["-v", "error", "-i", file, "-map", "0:a:0", "-f", "f32le", "-acodec", "pcm_f32le", "-ac", "2", "-ar", String(SR), "-"]));
const n = raw.length / 2;
const L = new Float32Array(n);
const R = new Float32Array(n);
const mono = new Float32Array(n);
for (let i = 0; i < n; i++) {
  L[i] = raw[2 * i];
  R[i] = raw[2 * i + 1];
  mono[i] = (L[i] + R[i]) / 2;
}

// --- clipping
console.log("\n[1] 削波 / Clipping");
let samplePeak = 0;
let atFull = 0;
for (const ch of [L, R]) {
  for (let i = 0; i < n; i++) {
    const a = Math.abs(ch[i]);
    if (a > samplePeak) samplePeak = a;
    if (a >= 0.999) atFull++;
  }
}
// 4× oversampled true peak (windowed-sinc interpolation, 32 taps per phase)
const TAPS = 32;
const phases = [0.25, 0.5, 0.75].map((p) => {
  const k = new Float32Array(TAPS);
  for (let j = 0; j < TAPS; j++) {
    const x = j - TAPS / 2 + 1 - p;
    const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * (j + 0.5)) / TAPS);
    k[j] = sinc * w;
  }
  return k;
});
let truePeak = samplePeak;
for (const ch of [L, R]) {
  for (let i = TAPS; i < n - TAPS; i++) {
    for (const k of phases) {
      let s = 0;
      for (let j = 0; j < TAPS; j++) s += ch[i - TAPS / 2 + 1 + j] * k[j];
      if (Math.abs(s) > truePeak) truePeak = Math.abs(s);
    }
  }
}
console.log(`  sample peak ${fmt(db(samplePeak), 2)} dBFS · true peak (4×) ${fmt(db(truePeak), 2)} dBTP · samples at full scale: ${atFull}`);
if (atFull > 0) fail(`${atFull} samples at full scale`);
if (truePeak >= 1) fail("true peak reaches 0 dBTP");

// --- energy envelopes
const envelope = (x: Float32Array, hop: number, win: number) => {
  const out = new Float32Array(Math.floor((n - win) / hop));
  for (let k = 0; k < out.length; k++) {
    let s = 0;
    const o = k * hop;
    for (let j = 0; j < win; j++) s += x[o + j] * x[o + j];
    out[k] = 10 * Math.log10(s / win + 1e-14);
  }
  return out;
};
// Attacks are measured on a 2nd-order high-pass (700 Hz) copy: with 2 ms
// windows, bass waveforms would otherwise ripple like onsets.
const hp = new Float32Array(n);
{
  const g = Math.tan((Math.PI * 700) / SR);
  const k = Math.SQRT2;
  let ic1 = 0;
  let ic2 = 0;
  for (let i = 0; i < n; i++) {
    const a1 = 1 / (1 + g * (g + k));
    const v3 = mono[i] - ic2;
    const v1 = a1 * ic1 + g * a1 * v3;
    const v2 = ic2 + g * a1 * ic1 + g * g * a1 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    hp[i] = mono[i] - k * v1 - v2;
  }
}
const FINE_HOP = 24; // 0.5 ms
const fine = envelope(hp, FINE_HOP, 96); // 2 ms windows
const fineAt = (sec: number) => Math.round((sec * SR) / FINE_HOP);
const fineSec = (k: number) => (k * FINE_HOP) / SR;

// --- silences
console.log("\n[2] 静音段 / Silences (RMS < −60 dBFS, ≥ 30 ms)");
const SIL_HOP = 240; // 5 ms
const silEnv = envelope(mono, SIL_HOP, 480);
const silences: { a: number; b: number }[] = [];
let startK = -1;
for (let k = 0; k <= silEnv.length; k++) {
  const quiet = k < silEnv.length && silEnv[k] < -60;
  if (quiet && startK < 0) startK = k;
  if (!quiet && startK >= 0) {
    const a = (startK * SIL_HOP) / SR;
    const b = ((k - 1) * SIL_HOP + 480) / SR;
    if (b - a >= 0.03) silences.push({ a, b });
    startK = -1;
  }
}
for (const s of silences) {
  const plan = SILENCES.find((p) => s.a < p.to / FPS + 0.05 && s.b > p.from / FPS - 0.05);
  const tag = plan ? `计划内：${plan.why}（帧 ${plan.from}–${plan.to}）` : "计划外！";
  console.log(`  ${fmt(s.a, 3)}–${fmt(s.b, 3)} s  (帧 ${fmt(s.a * FPS, 1)}–${fmt(s.b * FPS, 1)})  ${tag}`);
  if (!plan) fail(`unplanned silence at ${fmt(s.a, 3)} s`);
  else {
    const ea = (s.a - plan.from / FPS) * 1000;
    const eb = (s.b - plan.to / FPS) * 1000;
    if (Math.abs(ea) > FRAME_MS || Math.abs(eb) > FRAME_MS + 10) fail(`silence edges off by ${fmt(ea)} / ${fmt(eb)} ms`);
  }
}
for (const p of SILENCES) {
  if (!silences.some((s) => s.a < p.to / FPS && s.b > p.from / FPS)) fail(`planned silence ${p.from}–${p.to} not found`);
}

// --- loudness per section: ITU-R BS.1770 K-weighting (48 kHz coefficients), ungated
console.log("\n[3] 每段响度 / Loudness per section (K-weighted, LUFS-style, ungated)");
const kWeight = (x: Float32Array) => {
  const y = new Float32Array(x.length);
  const st = [
    [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
    [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621],
  ];
  let src = x;
  for (const [b0, b1, b2, a1, a2] of st) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < src.length; i++) {
      const v = b0 * src[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = src[i]; y2 = y1; y1 = v;
      y[i] = v;
    }
    src = y.slice();
  }
  return src;
};
const kL = kWeight(L);
const kR = kWeight(R);
for (const [name, [a, b]] of Object.entries(SEC)) {
  let s = 0;
  let pk = 0;
  const i0 = Math.round((a / FPS) * SR);
  const i1 = Math.min(n, Math.round((b / FPS) * SR));
  for (let i = i0; i < i1; i++) {
    s += kL[i] * kL[i] + kR[i] * kR[i];
    pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  }
  const lufs = -0.691 + 10 * Math.log10(s / (i1 - i0) + 1e-14);
  const bar = "█".repeat(Math.max(0, Math.round((lufs + 45) / 1.5)));
  console.log(`  ${name.padEnd(9)} 帧 ${pad(a, 4)}–${pad(b, 4)}  ${pad(fmt(lufs), 6)} LUFS  peak ${pad(fmt(db(pk)), 6)} dBFS  ${bar}`);
}

// --- onset strength: energy of the next 2 ms vs. the previous 15 ms (high-passed),
// evaluated every 0.25 ms. An attack peaks it exactly where the sound starts.
const cum = new Float64Array(n + 1);
for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + hp[i] * hp[i];
const AFTER = 96; // 2 ms
const BEFORE = 720; // 15 ms
const ratioAt = (i: number) => {
  if (i < 1 || i + AFTER > n) return -Infinity;
  const a = (cum[i + AFTER] - cum[i]) / AFTER;
  const b0 = Math.max(0, i - BEFORE);
  const b = (cum[i] - cum[b0]) / (i - b0);
  return 10 * Math.log10((a + 1e-12) / (b + 1e-12));
};
const STEP = 12; // 0.25 ms

const cueOnset = (f: number, kind: string) => {
  const t0 = f / FPS;
  const k0 = fineAt(t0);
  if (kind === "stop") {
    // the moment the sound is gone: first 2 ms window of digital silence
    lastStrength = NaN;
    for (let k = k0 - 80; k < k0 + 80; k++) if (fine[k] < -100) return fineSec(k) + 96 / SR - 0.0005;
    return NaN;
  }
  if (f === 0) {
    lastStrength = NaN;
    // nothing precedes the first frame: the onset is the first audible sample
    for (let i = 0; i < n; i++) if (Math.abs(hp[i]) > 1e-4) return i / SR;
    return NaN;
  }
  const c = Math.round(t0 * SR);
  let best = -Infinity;
  let bestI = -1;
  for (let i = c - 0.04 * SR; i <= c + 0.04 * SR; i += STEP) {
    const r = ratioAt(i);
    if (r > best) {
      best = r;
      bestI = i;
    }
  }
  lastStrength = best;
  return best >= 6 ? bestI / SR : NaN;
};
let lastStrength = NaN;

// ------------------------------------------------------------------ video
let diff: Float32Array | null = null;
if (vStream) {
  const W = 160;
  const H = 90;
  const frames = run("ffmpeg", ["-v", "error", "-i", file, "-map", "0:v:0", "-vf", `scale=${W}:${H}:flags=area,format=gray`, "-f", "rawvideo", "-"]);
  const count = Math.floor(frames.length / (W * H));
  diff = new Float32Array(count);
  for (let f = 1; f < count; f++) {
    let s = 0;
    const a = (f - 1) * W * H;
    const b = f * W * H;
    for (let j = 0; j < W * H; j++) s += Math.abs(frames[b + j] - frames[a + j]);
    diff[f] = s / (W * H);
  }
}
// first frame around the cue where the picture jumps (≥ half of the local max and ≥ 2× the frame before)
const visualOnset = (f: number) => {
  if (!diff) return NaN;
  if (f === 0) return 0;
  let mx = 0;
  for (let k = f - 3; k <= f + 3; k++) if (k > 0 && k < diff.length) mx = Math.max(mx, diff[k]);
  for (let k = Math.max(1, f - 3); k <= f + 3 && k < diff.length; k++) {
    if (diff[k] >= Math.max(0.25, mx * 0.5) && diff[k] >= 2 * diff[k - 1]) return k;
  }
  return NaN;
};

console.log("\n[4] 重点动作 vs 节拍 / Key actions vs. beat (误差：+ = 晚于节拍)");
console.log("   帧   拍     声音起点   起音强度   画面变化          动作");
let worstA = 0;
let worstV = 0;
for (const c of CUES) {
  const ta = cueOnset(c.f, c.kind);
  const errA = (ta * FPS - c.f) * 1; // frames
  const vf = visualOnset(c.f);
  const errV = vf - c.f;
  worstA = Math.max(worstA, Math.abs(errA));
  if (Number.isFinite(errV)) worstV = Math.max(worstV, Math.abs(errV));
  const beat = c.f / 16;
  const a = Number.isFinite(errA) ? `${errA >= 0 ? "+" : ""}${fmt(errA, 2)} 帧` : `未检出(${fmt(lastStrength)}dB)`;
  const v = !diff ? "-" : Number.isFinite(errV) ? `${errV >= 0 ? "+" : ""}${errV} 帧 (Δ${fmt(diff[vf], 1)})` : "未检出";
  const st = c.kind === "stop" || c.f === 0 ? "   " : pad(fmt(lastStrength, 0), 3);
  console.log(`  ${pad(c.f, 4)}  ${pad(fmt(beat, 2), 5)}  ${pad(a, 11)} ${st}dB  ${pad(v, 16)}   ${c.what}`);
  if (!Number.isFinite(errA) || Math.abs(errA) > 1) fail(`audio onset for "${c.what}" (frame ${c.f}): ${a}`);
  if (diff && (!Number.isFinite(errV) || Math.abs(errV) > 1)) fail(`picture change for "${c.what}" (frame ${c.f}): ${v}`);
  if (diff && Number.isFinite(errV) && Number.isFinite(errA) && Math.abs(errV - errA) > 1) fail(`sound vs picture for "${c.what}" differ by ${fmt(errV - errA, 2)} frames`);
}
console.log(`  最大误差：声音 ${fmt(worstA, 2)} 帧 (${fmt(worstA * FRAME_MS, 1)} ms)` + (diff ? `，画面 ${fmt(worstV, 0)} 帧` : ""));

// --- blind onsets: every attack in the track, measured against the 32nd-note grid
console.log("\n[5] 盲测起音点 / All detected attacks vs. the note grid (32nd = 2 frames)");
const onsets: number[] = [];
{
  const strength: number[] = [];
  for (let i = 0; i < n; i += STEP) strength.push(ratioAt(i));
  const fineDb = (i: number) => fine[Math.min(fine.length - 1, Math.floor(i / FINE_HOP))];
  const near = Math.round((0.03 * SR) / STEP); // peaks closer than 30 ms are one attack
  for (let k = 1; k < strength.length - 1; k++) {
    const v = strength[k];
    if (v < 10 || fineDb(k * STEP + AFTER) < -50) continue;
    let isMax = true;
    for (let j = Math.max(0, k - near); j <= Math.min(strength.length - 1, k + near); j++) {
      if (strength[j] > v || (strength[j] === v && j < k)) isMax = false;
    }
    if (isMax) onsets.push((k * STEP) / SR);
  }
}
let offGrid = 0;
let worstGrid = 0;
for (const t of onsets) {
  const gridFrames = Math.round((t * FPS) / 2) * 2;
  const err = (t - gridFrames / FPS) * 1000;
  worstGrid = Math.max(worstGrid, Math.abs(err));
  if (Math.abs(err) > FRAME_MS) {
    offGrid++;
    console.log(`  off grid: ${fmt(t, 3)} s (帧 ${fmt(t * FPS, 2)})  ${fmt(err)} ms`);
  }
}
console.log(`  ${onsets.length} 个起音点，最大偏离网格 ${fmt(worstGrid, 1)} ms，超过 1 帧的：${offGrid}`);
if (offGrid) fail(`${offGrid} attacks off the grid`);

// --- blind picture jumps: each one should have a sound within 1 frame
if (diff) {
  console.log("\n[6] 盲测画面跳变 / Picture jumps (Δ ≥ 6 and ≥ 2.5× the frame before) vs. nearest attack");
  let lonely = 0;
  let jumps = 0;
  for (let f = 1; f < diff.length; f++) {
    if (diff[f] < 6 || diff[f] < 2.5 * diff[f - 1]) continue;
    jumps++;
    const t = f / FPS;
    let best = Infinity;
    for (const o of onsets) best = Math.min(best, Math.abs(o - t));
    // also accept a softer attack (≥ 6 dB) measured right at this frame
    const near = cueOnset(f, "appear");
    if (Number.isFinite(near)) best = Math.min(best, Math.abs(near - t));
    // a cut to silence has no attack; it is matched by the planned silence instead
    const silentCut = SILENCES.some((s) => s.from === f);
    const ok = best * FPS <= 1 || silentCut;
    if (!ok) lonely++;
    console.log(`  帧 ${pad(f, 4)}  Δ${pad(fmt(diff[f], 1), 5)}  最近起音 ${silentCut ? "（静音切点）" : `${fmt(best * FPS, 2)} 帧`} ${ok ? "" : "✗"}`);
  }
  console.log(`  ${jumps} 次跳变，没有声音对应的：${lonely}`);
  if (lonely) fail(`${lonely} picture jumps without a sound`);
}

console.log(problems ? `\n${problems} 个问题。` : "\n全部通过。");
process.exitCode = problems ? 1 : 0;
