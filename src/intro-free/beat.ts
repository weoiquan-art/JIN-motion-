// IntroFree 的节拍常量。画面（src/intro-free/*）和配乐（scripts/gen-audio-free.ts）
// 都只从这里取时间，所以两边永远落在同一个网格上。
// 这个文件没有 import：Node 直接运行的脚本也会读取它。

export const FPS = 30;
export const BPM = 112.5;
export const BEATS_PER_BAR = 4;

// 112.5 BPM × 30fps → 一拍正好 16 帧，16 分音符 = 4 帧，32 分音符 = 2 帧。
export const FRAMES_PER_BEAT = (FPS * 60) / BPM;
export const FRAMES_PER_STEP = FRAMES_PER_BEAT / 4; // one 16th note
export const FRAMES_PER_BAR = FRAMES_PER_BEAT * BEATS_PER_BAR;

if (!Number.isInteger(FRAMES_PER_STEP)) {
  throw new Error(`BPM ${BPM} at ${FPS}fps puts 16th notes between frames`);
}

export const BARS = 16;
export const DURATION = BARS * FRAMES_PER_BAR; // 1024 frames = 34.13 s
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const SAMPLE_RATE = 48000;

// Frame of beat n (counted from 0), of step n (16ths), of bar n (+ beat).
export const B = (beat: number) => beat * FRAMES_PER_BEAT;
export const S = (step: number) => step * FRAMES_PER_STEP;
export const bar = (n: number, beat = 0) => (n * BEATS_PER_BAR + beat) * FRAMES_PER_BEAT;

export const seconds = (frame: number) => frame / FPS;
export const sampleAt = (frame: number) => Math.round((frame / FPS) * SAMPLE_RATE);
