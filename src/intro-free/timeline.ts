// IntroFree 的时间表：每个重点动作落在哪一拍。
// 画面组件和 scripts/gen-audio-free.ts（配乐）、scripts/check-intro-free.ts（成片自检）
// 共用这一份，所以只用 .ts 后缀的相对 import，不依赖 React。

import { CONTENT } from "../content.ts";
import { B, bar, DURATION, FRAMES_PER_STEP, S } from "./beat.ts";

// Emotional arc (bars of 64 frames):
//  0–1  quiet: a cursor types who I am
//  2–4  three windows, one per bar
//  5    "working with AI" sounds nice
//  6    squeezed — then everything stops
//  7    silence, running dry
//  8    the question
//  9–10 one 「我」 travels through two models (build)
// 11–12 full frame: the question, every beat
// 13–15 landing: still learning, thanks
export const SEC = {
  opening: [bar(0), bar(2)],
  daily: [bar(2), bar(5)],
  nice: [bar(5), bar(6)],
  squeeze: [bar(6), bar(7)],
  quiet: [bar(7), bar(8)],
  question: [bar(8), bar(9)],
  chain: [bar(9), bar(11)],
  full: [bar(11), bar(13)],
  ending: [bar(13), DURATION],
} as const;

export const T = {
  // opening
  cursor: B(0),
  nameType: B(0) + S(2),
  nameAccent: B(3),
  jobType: B(4),
  jobHighlight: B(7),
  // daily: whip into window 1/2/3, then one event per beat inside it
  windows: [B(8), B(12), B(16)],
  windowBeats: [
    [B(9), B(10), B(11)],
    [B(13), B(14), B(15)],
    [B(17), B(18), B(19)],
  ],
  // turn
  nice: B(20),
  niceSub: B(22),
  squeeze: B(24),
  slams: [B(25), B(26)],
  pour: B(27),
  tapeStop: B(27) + S(2), // music and picture slow down to a halt…
  stop: B(28), // …and cut to black + silence on the downbeat
  // quiet
  dry: B(30),
  want: B(32),
  unclear: B(34),
  // chain
  chainIn: B(36),
  toLlm: B(37),
  tokens: B(38),
  rewrite: B(39),
  toVideo: B(40),
  noise: B(41),
  denoise: B(42),
  reveal: B(43),
  breath: B(43) + S(2), // half a beat of held breath before the drop
  // full
  drop: B(44),
  accents: [B(45), B(47)],
  q1b: B(46),
  q2: [B(48), B(49), B(50)],
  q2Last: B(51),
  // ending
  land: B(52),
  learnType: B(53),
  learnHighlight: B(56),
  thanks: B(57),
  credit: B(59),
  fill: [B(60), B(61), B(62), B(63)],
} as const;

// Typing on the music grid: one character per `step` frames (8th = 8, 16th = 4).
// If the text would run past `last`, the step halves (still on the grid).
export const typeTimes = (text: string, start: number, step: number, last: number) => {
  const n = [...text].length;
  let st = step;
  while (st > 2 && start + (n - 1) * st > last) st /= 2;
  const chars = [...text];
  const times = chars.map((_, i) => start + i * st);
  // a space is not a keystroke: it appears with the character after it
  for (let i = chars.length - 2; i >= 0; i--) if (chars[i].trim() === "") times[i] = times[i + 1];
  return times;
};

export const TYPE = {
  name: typeTimes(CONTENT.opening.name, T.nameType, S(2), T.nameAccent),
  job: typeTimes(CONTENT.opening.job, T.jobType, S(1), T.jobHighlight - FRAMES_PER_STEP),
  learning: typeTimes(CONTENT.ending.learning, T.learnType, S(1), T.learnHighlight - FRAMES_PER_STEP),
};

// Chain: token chips spray out of the language model on 32nd notes.
export const tokenTimes = CONTENT.chain.tokens.map((_, i) => T.tokens + i * 2);

// Planned silences (checked against the rendered audio).
export const SILENCES = [
  { from: T.stop, to: T.dry, why: "灵感枯竭：所有声音切断两拍" },
  { from: T.breath, to: T.drop, why: "满格前屏住呼吸的半拍" },
  { from: T.land - S(1), to: T.land, why: "满格戛然而止，落地前空一个 16 分音符" },
];

// Every key visual action — cut, whip, slam, appearance, disappearance —
// with the sound that marks it. Used by scripts/check-intro-free.ts.
export type CueKind = "cut" | "whip" | "appear" | "slam" | "accent" | "stop";
export const CUES: { f: number; kind: CueKind; what: string }[] = [
  { f: T.cursor, kind: "appear", what: "光标出现" },
  { f: T.nameAccent, kind: "accent", what: "「JIN」打完，点亮" },
  { f: T.jobType, kind: "appear", what: "第二行开始打字" },
  { f: T.jobHighlight, kind: "accent", what: "高亮「AI 视频生成」" },
  { f: T.windows[0], kind: "whip", what: "甩进窗口 1：skill" },
  { f: T.windowBeats[0][0], kind: "accent", what: "删掉旧的一行" },
  { f: T.windowBeats[0][1], kind: "appear", what: "新的一行插入" },
  { f: T.windowBeats[0][2], kind: "appear", what: "测试结果 7/10" },
  { f: T.windows[1], kind: "whip", what: "甩进窗口 2：拆解" },
  { f: T.windowBeats[1][0], kind: "appear", what: "拆出图层：光线" },
  { f: T.windowBeats[1][1], kind: "appear", what: "拆出图层：运镜" },
  { f: T.windowBeats[1][2], kind: "appear", what: "拆出图层：提示词" },
  { f: T.windows[2], kind: "whip", what: "甩进窗口 3：app" },
  { f: T.windowBeats[2][0], kind: "appear", what: "app 标题栏" },
  { f: T.windowBeats[2][1], kind: "appear", what: "app 卡片" },
  { f: T.windowBeats[2][2], kind: "accent", what: "按下「生成」" },
  { f: T.nice, kind: "cut", what: "切到「和 AI 协同工作」" },
  { f: T.niceSub, kind: "appear", what: "「说起来，很好听」" },
  { f: T.squeeze, kind: "cut", what: "切到「挤破脑袋」" },
  { f: T.slams[0], kind: "slam", what: "墙第一次夹" },
  { f: T.slams[1], kind: "slam", what: "墙第二次夹" },
  { f: T.pour, kind: "slam", what: "想法被挤出来" },
  { f: T.stop, kind: "stop", what: "全部停下：黑场 + 静音" },
  { f: T.dry, kind: "appear", what: "「有点灵感枯竭了」" },
  { f: T.want, kind: "appear", what: "「我真正想弄懂的是」" },
  { f: T.unclear, kind: "appear", what: "「一个我自己也说不清的问题」" },
  { f: T.chainIn, kind: "whip", what: "推进到「我」" },
  { f: T.toLlm, kind: "whip", what: "「我」飞进语言模型" },
  { f: T.tokens, kind: "appear", what: "吐出 token" },
  { f: T.rewrite, kind: "accent", what: "「我 → a person」" },
  { f: T.toVideo, kind: "whip", what: "送进视频模型" },
  { f: T.noise, kind: "appear", what: "噪声炸开" },
  { f: T.denoise, kind: "accent", what: "去噪成一个「人」" },
  { f: T.reveal, kind: "whip", what: "拉远：整条链 + 问号" },
  { f: T.drop, kind: "slam", what: "满格：「AI 怎么理解」" },
  { f: T.accents[0], kind: "accent", what: "重拍冲击" },
  { f: T.q1b, kind: "slam", what: "「我的语言？」" },
  { f: T.accents[1], kind: "accent", what: "反色" },
  { f: T.q2[0], kind: "slam", what: "「视频模型，」" },
  { f: T.q2[1], kind: "slam", what: "「又怎么理解」" },
  { f: T.q2[2], kind: "slam", what: "「被过滤后的」" },
  { f: T.q2Last, kind: "slam", what: "「我？」" },
  { f: T.land, kind: "cut", what: "切回安静：「我是 JIN，」" },
  { f: T.learnType, kind: "appear", what: "打字「一个还在学习 AI 的人」" },
  { f: T.learnHighlight, kind: "accent", what: "点亮「还在学习」" },
  { f: T.thanks, kind: "appear", what: "片尾「感谢你了解了部分的我」" },
  { f: T.credit, kind: "appear", what: "小字 Made with Claude Opus 5.5" },
  ...T.fill.map((f, i) => ({ f, kind: "accent" as const, what: `像素「我」补上一块 ${i + 1}/4` })),
];
