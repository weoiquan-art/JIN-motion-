// Single source of truth for the Intro: layout, timing and audio cues.
// Imported by the composition AND by scripts/gen-audio.ts (run directly by
// Node), so this file must stay free of imports.

export const FPS = 30;
export const DURATION = 450;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const T = {
  slam: 90, // 3.0s camera slams into 协同
  crack: 93,
  split: 98,
  fling: 112,
  chaos: 126, // 4.2s
  brake: 315, // 10.5s
  sweepStart: 322,
  sweepEnd: 372,
  end: 375, // 12.5s
  fadeOut: 435,
} as const;

// Frames rendered with multi-sample motion blur.
export const BLUR_RANGE: [number, number] = [86, 336];
export const BLUR_SAMPLES = 7;

// ---------------------------------------------------------------- text
export const LINE_A = { text: "我是 JIN。", en: "I'm JIN.", x: 0, y: 0, fs: 150 };
export const LINE_B = {
  left: "我和 AI ",
  c1: "协",
  c2: "同",
  right: "工作。",
  en: "I work with AI.",
  y: 300,
  fs: 120,
};
// The seam between 协 and 同.
export const CRACK = { x: 35, y: LINE_B.y };

export type WordStyle = "slam" | "squeeze" | "pour";
export type WordDef = {
  zh: string;
  en: string;
  x: number;
  y: number;
  fs: number;
  slam: number;
  peel: number;
  peelGap: number;
  style: WordStyle;
};

export const WORDS: WordDef[] = [
  { zh: "每天", en: "EVERY DAY", x: 1500, y: -420, fs: 230, slam: 127, peel: 139, peelGap: 3, style: "slam" },
  { zh: "挤破脑袋", en: "SQUEEZE MY BRAIN", x: 2400, y: 880, fs: 210, slam: 161, peel: 176, peelGap: 2, style: "squeeze" },
  { zh: "把想法", en: "DUMP THE IDEAS", x: 3900, y: -420, fs: 230, slam: 215, peel: 227, peelGap: 2, style: "slam" },
  { zh: "倒出来", en: "OUT", x: 4300, y: 880, fs: 230, slam: 249, peel: 259, peelGap: 2, style: "pour" },
];

export const FLIGHT = 8; // frames a peeled character flies before landing as a card

export const charPos = (word: WordDef, i: number) => {
  const n = [...word.zh].length;
  return { x: word.x + (i - (n - 1) / 2) * word.fs, y: word.y };
};

// ---------------------------------------------------------------- cards
export type CardKind = "ph" | "portrait" | "wide";
export type CardDef = {
  shot: number;
  kind: CardKind;
  w: number;
  aspect: number; // width / height
  x: number;
  y: number; // centre line of its row
  word: number;
  char: number;
  hue: number;
};

const ROW_A = 250;
const ROW_B = 1500;
const A16_9 = 16 / 9;
export const PORTRAIT_ASPECT = 720 / 1280;
export const WIDE_ASPECT = 720 / 368;

export const CARDS: CardDef[] = [
  { shot: 1, kind: "ph", w: 520, aspect: A16_9, x: 1250, y: ROW_A, word: 0, char: 0, hue: 265 },
  { shot: 2, kind: "ph", w: 340, aspect: 1, x: 1730, y: ROW_A, word: 0, char: 1, hue: 190 },
  { shot: 3, kind: "ph", w: 300, aspect: 4 / 5, x: 2160, y: ROW_A, word: 1, char: 0, hue: 330 },
  { shot: 4, kind: "ph", w: 480, aspect: A16_9, x: 1500, y: ROW_B, word: 1, char: 1, hue: 25 },
  { shot: 5, kind: "ph", w: 300, aspect: 1, x: 1930, y: ROW_B, word: 1, char: 2, hue: 160 },
  { shot: 6, kind: "portrait", w: 405, aspect: PORTRAIT_ASPECT, x: 2460, y: ROW_B, word: 1, char: 3, hue: 0 },
  { shot: 7, kind: "ph", w: 600, aspect: A16_9, x: 3400, y: ROW_A, word: 2, char: 0, hue: 215 },
  { shot: 8, kind: "ph", w: 220, aspect: 9 / 16, x: 3860, y: ROW_A, word: 2, char: 1, hue: 290 },
  { shot: 9, kind: "ph", w: 460, aspect: A16_9, x: 4320, y: ROW_A, word: 2, char: 2, hue: 45 },
  { shot: 10, kind: "ph", w: 520, aspect: A16_9, x: 3700, y: ROW_B, word: 3, char: 0, hue: 140 },
  { shot: 11, kind: "ph", w: 320, aspect: 1, x: 4160, y: ROW_B, word: 3, char: 1, hue: 345 },
  { shot: 12, kind: "wide", w: 880, aspect: WIDE_ASPECT, x: 4800, y: ROW_B, word: 3, char: 2, hue: 0 },
];

export const cardH = (c: CardDef) => c.w / c.aspect;
export const cardPeel = (c: CardDef) => {
  const w = WORDS[c.word];
  return w.peel + c.char * w.peelGap;
};
export const cardLand = (c: CardDef) => cardPeel(c) + FLIGHT;
export const card = (shot: number) => CARDS[shot - 1];

// Generations that fail. Global order gives the REROLL ×n count.
export const FAILS: { shot: number; f: number }[] = [
  { shot: 1, f: 152 },
  { shot: 5, f: 206 },
  { shot: 7, f: 239 },
  { shot: 8, f: 243 },
  { shot: 11, f: 285 },
  { shot: 9, f: 305 },
  { shot: 7, f: 311 },
];
export const REROLL_HOLD = 9; // frames a failed card stays struck before regenerating

// ---------------------------------------------------------------- timeline (整理)
export const TL = { y: 880, cx: 3000, h: 260, gap: 40 };
const slotWidths = CARDS.map((c) => TL.h * c.aspect);
export const TL_WIDTH =
  slotWidths.reduce((a, b) => a + b, 0) + TL.gap * (CARDS.length - 1);
export const TL_LEFT = TL.cx - TL_WIDTH / 2;
export const TL_RIGHT = TL.cx + TL_WIDTH / 2;
export const SLOTS = CARDS.map((_, i) => {
  const before = slotWidths.slice(0, i).reduce((a, b) => a + b, 0) + TL.gap * i;
  return { x: TL_LEFT + before + slotWidths[i] / 2, y: TL.y, scale: TL.h / cardH(CARDS[i]) };
});
export const FIT_Z = (WIDTH * 0.86) / (TL_WIDTH + 160);

// ---------------------------------------------------------------- logos
export type LogoDef = {
  file: string;
  pixelated?: boolean;
  burst: [number, number]; // offset from CRACK while bursting
  anchor: [number, number]; // world position as background debris
  hit: number; // frame it gets knocked away
  v: [number, number]; // knock-away velocity (world px / frame)
  spin: number;
};

export const LOGO_BOX = 64;
export const LOGOS: LogoDef[] = [
  { file: "gpt-white.png", burst: [-140, -70], anchor: [WORDS[0].x + 420, WORDS[0].y - 40], hit: 129, v: [62, -18], spin: 21 },
  { file: "claude.png", pixelated: true, burst: [140, -72], anchor: [WORDS[1].x - 560, WORDS[1].y - 60], hit: 163, v: [-58, -26], spin: -18 },
  { file: "gemini.png", burst: [-128, 76], anchor: [WORDS[2].x - 400, WORDS[2].y + 60], hit: 217, v: [-55, 30], spin: 24 },
  { file: "deepseek.png", burst: [150, 74], anchor: [WORDS[3].x + 440, WORDS[3].y - 70], hit: 251, v: [60, 22], spin: -22 },
];
export const logoEmerge = (i: number) => T.split + i * 3;
export const logoFling = (i: number) => T.fling + i;

// ---------------------------------------------------------------- camera
export type Ease =
  | { kind: "ease"; dur: number }
  | { kind: "linear"; dur: number }
  | { kind: "spring"; k: number; d: number; m: number };

export type CamMove = {
  f: number;
  x?: number;
  y?: number;
  z?: number;
  r?: number;
  ease: Ease;
  hit?: number; // drum + shake strength
};

const SLAM: Ease = { kind: "spring", k: 420, d: 18, m: 0.6 };
const WHIP: Ease = { kind: "spring", k: 260, d: 17, m: 0.7 };
const FOLLOW: Ease = { kind: "spring", k: 150, d: 16, m: 0.8 };
const RAPID: Ease = { kind: "spring", k: 520, d: 24, m: 0.5 };
const BRAKE: Ease = { kind: "spring", k: 420, d: 26, m: 0.8 };

export const CAM_START = { x: 0, y: 20, z: 0.9, r: 0 };
const W = WORDS;
export const CAM_MOVES: CamMove[] = [
  { f: 0, x: 0, y: 0, z: 1.0, ease: { kind: "ease", dur: 70 } },
  { f: 44, y: LINE_B.y, z: 1.06, ease: { kind: "ease", dur: 38 } },
  { f: 76, x: CRACK.x, z: 1.14, ease: { kind: "ease", dur: 14 } },
  { f: T.slam, x: CRACK.x, y: CRACK.y, z: 4.2, r: -3, ease: SLAM, hit: 1 },
  { f: T.fling, x: CRACK.x + 120, y: CRACK.y - 80, z: 1.0, r: 5, ease: { kind: "spring", k: 200, d: 16, m: 0.8 }, hit: 0.6 },
  { f: 124, x: W[0].x, y: W[0].y + 40, z: 1.35, r: -5, ease: WHIP, hit: 0.8 },
  { f: 143, x: 1490, y: 230, z: 1.12, r: 2, ease: FOLLOW, hit: 0.4 },
  { f: 159, x: W[1].x, y: W[1].y + 30, z: 1.3, r: 7, ease: WHIP, hit: 0.8 },
  { f: 179, x: 2380, y: 1480, z: 1.2, r: -2, ease: FOLLOW, hit: 0.4 },
  { f: 192, z: 1.3, ease: { kind: "ease", dur: 26 } },
  { f: 213, x: W[2].x, y: W[2].y + 40, z: 1.35, r: -8, ease: WHIP, hit: 0.8 },
  { f: 229, x: 3860, y: 230, z: 1.05, r: 3, ease: FOLLOW, hit: 0.4 },
  { f: 247, x: W[3].x, y: W[3].y + 30, z: 1.3, r: 5, ease: WHIP, hit: 0.8 },
  { f: 261, x: 4700, y: 1490, z: 1.38, r: -1, ease: FOLLOW, hit: 0.4 },
  { f: 274, z: 1.48, ease: { kind: "ease", dur: 24 } },
  { f: 301, x: card(11).x, y: card(11).y, z: 1.75, r: -7, ease: RAPID, hit: 0.7 },
  { f: 304, x: card(9).x, y: card(9).y, z: 1.5, r: 8, ease: RAPID, hit: 0.7 },
  { f: 307, x: card(8).x, y: card(8).y, z: 1.85, r: -9, ease: RAPID, hit: 0.7 },
  { f: 310, x: card(7).x, y: card(7).y, z: 1.45, r: 6, ease: RAPID, hit: 0.7 },
  { f: T.brake, x: TL_LEFT - 60 + WIDTH / 2 / 0.95, y: TL.y, z: 0.95, r: 0, ease: BRAKE, hit: 1 },
  { f: T.sweepStart, x: TL.cx, z: FIT_Z, ease: { kind: "linear", dur: T.sweepEnd - T.sweepStart } },
];

// ---------------------------------------------------------------- end card
// Sizes are screen pixels; the camera sits at FIT_Z, so world size = px / FIT_Z.
export const END = {
  jin: "JIN",
  zh: "感谢你了解了部分的我",
  small: "用 Opus 5.5 生成 · Made with Claude Opus 5.5",
  jinIn: 380,
  zhIn: 390,
  smallIn: 398,
};

// ---------------------------------------------------------------- misc
export const UI_TEXT = "SHOT 0123456789:% GENERATING FAILED REROLL × DONE REC";

export const ALL_TEXT = [
  LINE_A.text,
  LINE_A.en,
  LINE_B.left + LINE_B.c1 + LINE_B.c2 + LINE_B.right,
  LINE_B.en,
  ...WORDS.map((w) => w.zh + w.en),
  END.jin,
  END.zh,
  END.small,
  UI_TEXT,
  "我是 JIN", // Test composition
].join("");

export const timecode = (frame: number) => {
  const f = Math.max(0, Math.floor(frame));
  const ff = f % FPS;
  const s = Math.floor(f / FPS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `00:00:${pad(s)}:${pad(ff)}`;
};

// ---------------------------------------------------------------- audio cues (frames)
export const AUDIO = {
  ticks: [6, 52],
  slam: T.slam,
  crack: T.crack,
  burst: T.split,
  hits: CAM_MOVES.filter((m) => m.hit && m.f > T.slam).map((m) => ({ f: m.f, s: m.hit ?? 0 })),
  slams: WORDS.map((w) => w.slam),
  lands: CARDS.map(cardLand),
  fails: FAILS.map((x) => x.f),
  brake: T.brake,
  tone: [T.brake + 3, T.end + 6] as [number, number],
  bell: END.jinIn,
  fadeOut: T.fadeOut,
};
