// SelfBlame 的节拍常量。画面（src/self-blame/*）、配乐（scripts/gen-audio-self-blame.ts）
// 和自检（scripts/check-self-blame.ts）都只从这里取时间，所以三边落在同一个网格上。
// 这个文件没有 import：Node 直接运行的脚本也会读取它。

export const FPS = 30;
// 75 BPM：一拍正好 24 帧（0.8 秒），也是安静时的心跳速度。
// 8 分音符 12 帧、16 分音符 6 帧、32 分音符 3 帧，都是整数帧。
export const BPM = 75;
export const BEATS_PER_BAR = 4;

export const FRAMES_PER_BEAT = (FPS * 60) / BPM;
export const FRAMES_PER_STEP = FRAMES_PER_BEAT / 4; // one 16th note
export const FRAMES_PER_BAR = FRAMES_PER_BEAT * BEATS_PER_BAR;

if (!Number.isInteger(FRAMES_PER_STEP) || !Number.isInteger(FRAMES_PER_BEAT / 8)) {
  throw new Error(`BPM ${BPM} at ${FPS}fps puts 16th or 32nd notes between frames`);
}

export const BARS = 29;
export const DURATION = BARS * FRAMES_PER_BAR; // 2784 frames = 92.8 s
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const SAMPLE_RATE = 48000;

// Frame of beat n (counted from 0) and of n 16th notes.
export const B = (beat: number) => beat * FRAMES_PER_BEAT;
export const S = (step: number) => step * FRAMES_PER_STEP;

export const seconds = (frame: number) => frame / FPS;
export const sampleAt = (frame: number) => Math.round((frame / FPS) * SAMPLE_RATE);
