// SelfBlame 的时间表：每个重点动作落在哪一拍、每条字幕从哪一拍到哪一拍、镜头怎么走。
// 画面组件、scripts/gen-audio-self-blame.ts（配乐）、scripts/check-self-blame.ts（成片自检）
// 共用这一份，所以只用 .ts 后缀的相对 import，不依赖 React。

import { B, DURATION, S } from "./beat.ts";
import { CONTENT, type Line } from "./content.ts";

// Emotional arc (bars of 96 frames = 3.2 s; every section starts on a bar line):
//  0–2   hook: a cup breaks, "wrong again?", two thoughts that sink the heart
//  3–4   the question (title)
//  5–8   two steps: "I did something wrong" (guilt) → "I am bad" (shame)
//  9–11  reason 1: growing up (love that depends on the score)
// 12–14  reason 2: attachment (how we were answered; hearing rejection)
// 15–18  reason 3: automatic thoughts → a deeper belief
// 19–21  practice 1: swap the label for the act; mend the cup
// 22–24  practice 2: say to yourself what you'd say to a friend
// 25–28  dawn: blame is about one thing; talk to a counsellor if it's heavy
export const SEC = {
  hook: [B(0), B(12)],
  title: [B(12), B(20)],
  steps: [B(20), B(36)],
  r1: [B(36), B(48)],
  r2: [B(48), B(60)],
  r3: [B(60), B(76)],
  p1: [B(76), B(88)],
  p2: [B(88), B(100)],
  end: [B(100), DURATION],
} as const;

export const T = {
  // hook
  slip: B(1), // the cup starts to slip…
  shatter: B(2), // …and hits the floor on the beat
  blame: B(3),
  think1: B(5),
  think2: B(7),
  breath: B(11) + S(2), // half a beat of silence before the question
  // title
  title: [B(12), B(13), B(14)],
  titleEn: B(15),
  // steps
  steps: B(20),
  one: B(21),
  two: B(22),
  guiltRing: B(24),
  shameFlood: B(26),
  small: B(30),
  // reason 1
  r1: B(36),
  good: B(38),
  bad: B(40),
  // reason 2
  r2: B(48),
  calls: [B(49), B(51)], // the first call is answered, the second is not
  model: B(52),
  now: B(54),
  vague: B(55),
  radar: B(56),
  heard: B(57),
  // reason 3
  r3: B(60),
  chips: [B(61), B(61) + S(2), B(62), B(62) + S(2)],
  labels: [B(65), B(66)],
  dive: B(71),
  core: B(72),
  // practice 1
  p1: B(76),
  strike: B(77),
  rewrite: B(78),
  lift: B(80),
  mend: B(81),
  // practice 2
  p2: B(88),
  spill: B(89),
  comfort: B(90),
  mirror: B(92),
  warm: B(94),
  // ending
  end: B(100),
  line: B(101),
  help: B(106),
  refs: B(108),
  fade: B(114),
} as const;

// Typing on the music grid: one character per `step` frames (16th = 6).
// A space is not a keystroke: it appears with the character after it.
export const typeTimes = (text: string, start: number, step: number) => {
  const chars = [...text];
  const times = chars.map((_, i) => start + i * step);
  for (let i = chars.length - 2; i >= 0; i--) if (chars[i].trim() === "") times[i] = times[i + 1];
  return times;
};

const H = CONTENT.hook;
const P = CONTENT.practice;
export const TYPE = {
  think1: typeTimes(H.think1.zh, T.think1, S(1)),
  think2: typeTimes(H.think2.zh, T.think2, S(1)),
  heard: typeTimes(CONTENT.reasons.r2.heard.zh, T.heard, S(1)),
  rewrite: typeTimes(P.p1.after.zh, T.rewrite, S(1)),
  comfort: typeTimes(P.p2.comfort.zh, T.comfort, S(1)),
};

// Bottom captions (narration). `to` is exclusive; the next one starts on it.
const R = CONTENT.reasons;
export const CAPTIONS: { from: number; to: number; line: Line }[] = [
  { from: B(22), to: B(29), line: CONTENT.steps.capA },
  { from: B(29), to: B(36), line: CONTENT.steps.capB },
  { from: B(36), to: B(42), line: R.r1.cap1 },
  { from: B(42), to: B(48), line: R.r1.cap2 },
  { from: B(48), to: B(54), line: R.r2.cap1 },
  { from: B(54), to: B(60), line: R.r2.cap2 },
  { from: B(60), to: B(65), line: R.r3.cap1 },
  { from: B(65), to: B(71), line: R.r3.cap2 },
  { from: B(71), to: B(76), line: R.r3.cap3 },
  { from: B(76), to: B(82), line: P.p1.cap1 },
  { from: B(82), to: B(88), line: P.p1.cap2 },
  { from: B(88), to: B(93), line: P.p2.cap1 },
  { from: B(93), to: B(100), line: P.p2.cap2 },
];

// Section chips (top-left).
export const CHIPS: { from: number; to: number; index: string; line: { zh: string; en: string } }[] = [
  { from: B(36), to: B(48), index: "1/3", line: R.r1.chip },
  { from: B(48), to: B(60), index: "2/3", line: R.r2.chip },
  { from: B(60), to: B(76), index: "3/3", line: R.r3.chip },
  { from: B(76), to: B(88), index: "1/2", line: P.p1.chip },
  { from: B(88), to: B(100), index: "2/2", line: P.p2.chip },
];

// World layout: one station per section along x; the camera glides between them.
export const ST = {
  hook: 0,
  steps: 2400,
  r1: 4800,
  r2: 7200,
  r2now: 8600, // reason 2, grown up: far enough that the two halves never share the frame
  r3: 10800,
  p1: 13200,
  p2: 15600,
  end: 18400, // a wider gap: the dawn sky must not show while we are still in practice 2
} as const;
export const CAM_Y = 60; // camera looks a little below the station centre: captions live at the bottom
export const DIVE_Y = 600; // reason 3 tilts down to the core belief

// Camera moves: "whip" starts on its beat with full speed and eases out (no overshoot);
// a number glides there with an ease-in-out over that many frames.
export type CamMove = { f: number; to: { x?: number; y?: number; z?: number }; ease?: "whip" | number; dur?: number; bounce?: number };
const PAN = 24; // frames for a station-to-station move: exactly one beat, so the next beat's action lands on a still frame
export const CAMERA: CamMove[] = [
  { f: B(0), to: { z: 1.07 }, ease: B(11) }, // slow push-in on the hook
  { f: T.title[0], to: { y: -150, z: 0.9 }, dur: 26, bounce: 0 },
  { f: T.steps, to: { x: ST.steps, y: CAM_Y, z: 1 }, dur: PAN, bounce: 0 },
  { f: T.r1, to: { x: ST.r1 }, dur: PAN, bounce: 0 },
  { f: T.r2, to: { x: ST.r2 }, dur: PAN, bounce: 0 },
  { f: T.now, to: { x: ST.r2now }, dur: 24, bounce: 0 },
  { f: T.r3, to: { x: ST.r3 }, dur: PAN, bounce: 0 },
  { f: T.dive, to: { y: DIVE_Y }, dur: 24, bounce: 0 },
  { f: T.p1, to: { x: ST.p1, y: CAM_Y }, dur: PAN, bounce: 0 },
  { f: T.p2, to: { x: ST.p2 }, dur: PAN, bounce: 0 },
  { f: T.end, to: { x: ST.end, z: 1 }, dur: PAN, bounce: 0 },
  { f: T.end + B(1), to: { z: 1.06 }, ease: B(13) }, // slow push-in on the dawn
];
export const CAM_START = { x: ST.hook, y: CAM_Y, z: 1 };

// Frames that get motion blur (camera moves and the shatter).
export const BLUR_HITS = [T.steps, T.r1, T.r2, T.now, T.r3, T.dive, T.p1, T.p2, T.end];

// Planned silences (checked against the rendered audio).
export const SILENCES = [{ from: T.breath, to: T.title[0], why: "片名前屏住呼吸的半拍" }];

// Where real recordings (Freesound, CC0) play: their first hit is placed on the
// cue frame, but they keep their own inner hits (shards, pencil strokes, birds),
// which the self-check does not hold to the note grid.
export const RECORDED = [
  { from: T.shatter, to: T.shatter + 45, what: "杯子摔碎" },
  { from: T.strike, to: T.strike + 15, what: "铅笔划线" },
  { from: T.warm, to: T.warm + 96, what: "风铃" },
  { from: T.line, to: T.line + 120, what: "风铃" },
  { from: T.end, to: DURATION, what: "清晨鸟叫" },
];

// Every key visual action with the sound that marks it. Used by scripts/check-self-blame.ts.
export type CueKind = "cut" | "move" | "appear" | "hit" | "accent";
export const CUES: { f: number; kind: CueKind; what: string }[] = [
  { f: T.shatter, kind: "hit", what: "杯子落地摔碎" },
  { f: T.blame, kind: "hit", what: "「怎么又出错了？」砸进来" },
  { f: T.think1, kind: "appear", what: "念头一「是我不好……」" },
  { f: T.think2, kind: "appear", what: "念头二「我是不是不值得被爱？」" },
  ...T.title.map((f, i) => ({ f, kind: "appear" as const, what: `片名第 ${i + 1} 行` })),
  { f: T.titleEn, kind: "appear", what: "片名英文" },
  { f: T.steps, kind: "move", what: "镜头移到「两步」" },
  { f: T.one, kind: "appear", what: "① 我做错了一件事" },
  { f: T.two, kind: "appear", what: "② 我是个不好的人" },
  { f: T.guiltRing, kind: "accent", what: "内疚：只圈住那只杯子" },
  { f: T.shameFlood, kind: "accent", what: "羞耻：灰色淹没整个人" },
  { f: T.small, kind: "accent", what: "觉得自己变小" },
  { f: T.r1, kind: "move", what: "镜头移到原因一" },
  { f: T.good, kind: "accent", what: "100 分：爱心飞过来" },
  { f: T.bad, kind: "accent", what: "60 分：爱心飞回去" },
  { f: T.r2, kind: "move", what: "镜头移到原因二" },
  ...T.calls.map((f, i) => ({ f, kind: "accent" as const, what: i ? "第二次呼唤：没有回应" : "第一次呼唤：有回应" })),
  { f: T.model, kind: "appear", what: "「我值得被爱吗？」" },
  { f: T.now, kind: "move", what: "镜头移到长大以后" },
  { f: T.vague, kind: "appear", what: "模糊的「……」" },
  { f: T.radar, kind: "accent", what: "警觉的波纹" },
  { f: T.heard, kind: "appear", what: "听成「你不要我了？」" },
  { f: T.r3, kind: "move", what: "镜头移到原因三" },
  ...T.chips.map((f, i) => ({ f, kind: "appear" as const, what: `念头弹出 ${i + 1}` })),
  ...T.labels.map((f, i) => ({ f, kind: "appear" as const, what: i ? "标签：贴标签" : "标签：个人化" })),
  { f: T.dive, kind: "move", what: "镜头往下沉到核心信念" },
  { f: T.core, kind: "accent", what: "「我不可爱」亮起" },
  { f: T.p1, kind: "move", what: "镜头移到小练习一" },
  { f: T.strike, kind: "hit", what: "划掉「我真差劲」" },
  { f: T.rewrite, kind: "appear", what: "写下「这件事我没做好」" },
  { f: T.lift, kind: "accent", what: "灰色从身上退到杯子上" },
  { f: T.mend, kind: "accent", what: "杯子用金线补好" },
  { f: T.p2, kind: "move", what: "镜头移到小练习二" },
  { f: T.spill, kind: "hit", what: "朋友打翻杯子" },
  { f: T.comfort, kind: "appear", what: "「没关系，收拾一下就好。」" },
  { f: T.mirror, kind: "accent", what: "朋友变成镜子里的自己" },
  { f: T.warm, kind: "accent", what: "心亮起来" },
  { f: T.end, kind: "move", what: "镜头移到天亮" },
  { f: T.line, kind: "appear", what: "「被责怪，说的是一件事，不是你整个人。」" },
  { f: T.help, kind: "appear", what: "「可以找心理咨询师聊聊」" },
];

// Every character drawn on screen, for the font downloader and the font loader.
const lines = (l: { zh: string; en: string; cite?: string }) => l.zh + l.en + (l.cite ?? "");
const E = CONTENT.ending;
export const ALL_TEXT_SB = [
  lines(H.blame), lines(H.think1), lines(H.think2),
  ...CONTENT.title.zh, CONTENT.title.en,
  ...Object.values(CONTENT.steps).map(lines),
  lines(R.note),
  lines(R.r1.chip), lines(R.r1.cap1), lines(R.r1.cap2), R.r1.good, R.r1.bad,
  lines(R.r2.chip), lines(R.r2.cap1), lines(R.r2.model), lines(R.r2.cap2), R.r2.vague, lines(R.r2.heard),
  lines(R.r3.chip), lines(R.r3.cap1), ...R.r3.thoughts.map(lines), lines(R.r3.cap2),
  lines(R.r3.personal), lines(R.r3.label), lines(R.r3.cap3), lines(R.r3.core), lines(R.r3.coreTag),
  lines(P.p1.chip), lines(P.p1.before), lines(P.p1.after), lines(P.p1.cap1), lines(P.p1.cap2),
  lines(P.p2.chip), lines(P.p2.cap1), lines(P.p2.comfort), lines(P.p2.cap2),
  lines(E.line), lines(E.help), lines(E.refsTitle), ...E.refs, E.sfx, lines(E.disclaimer),
  "0123456789/·—–，。、：；？！“”‘’…()&",
].join("");

// The serif face is only used for the question, the cards and the closing line.
export const ALL_TEXT_SB_SERIF = [
  ...CONTENT.title.zh,
  P.p1.before.zh, P.p1.after.zh,
  R.r3.core.zh,
  E.line.zh,
  "，。？：“”",
].join("");
