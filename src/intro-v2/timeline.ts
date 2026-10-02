// IntroV2: single source of truth for timing, layout and the prompt-template
// edit script. Shared by the composition and scripts/gen-audio-v2.ts (run by
// Node directly), so this file has no imports.

export const FPS = 30;
export const DURATION = 900;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Emotional arc: calm → confession → disappointment loops (each faster) →
// peak → breath held → release → looking back.
export const S = {
  turn: 120, // 4s   "听起来很好听。"
  loop1: 180, // 6s  first loop, slow
  loop2: 330, // 11s second loop, medium
  loop3: 450, // 15s third loop: the only full-frame 5 seconds
  stop: 600, // 20s  everything stops, v13
  press: 632, //     generate is pressed
  success: 645, // 21.5s clean footage
  look: 750, // 25s  pull back over the 13 versions
  endText: 815,
  fadeOut: 885,
} as const;

// ------------------------------------------------------------------ text
export const INTRO_A = { zh: "我是 JIN。", en: "I'm JIN.", y: -110, fs: 120, in: 8 };
export const INTRO_B = { zh: "我和 AI 协同工作。", en: "I work with AI.", y: 92, fs: 76, in: 40 };
export const TURN_A = { zh: "听起来很好听。", en: "It sounds nice.", y: 420, fs: 84, in: 126 };
export const TURN_B = { zh: "其实是——", en: "Actually—", y: 590, fs: 84, in: 153 };

export const SLAMS = [
  { zh: "改。", en: "EDIT.", f: 480 },
  { zh: "再改。", en: "AGAIN.", f: 520 },
  { zh: "再抽。", en: "REROLL.", f: 562 },
];
export const SLAM_LIFE = 17;

export const SUCCESS_NOTE = { zh: "这一条，能用。", en: "This one works.", f: 668 };

export const END = {
  a: "我是 JIN。",
  zh: "感谢你了解了部分的我",
  small: "用 Opus 5.5 生成 · Made with Claude Opus 5.5",
  aIn: S.endText,
  zhIn: S.endText + 8,
  smallIn: S.endText + 15,
};

// Narrow glyphs come from JetBrains Mono (0.6em), everything CJK / full-width
// from Noto Sans SC (1em). Layout is computed from these widths.
export const isWide = (ch: string) => {
  const c = ch.codePointAt(0) as number;
  return c >= 0x2e80 || (c >= 0x3000 && c <= 0x303f) || (c >= 0xff00 && c <= 0xffef);
};
export const textWidth = (s: string, fs: number) =>
  [...s].reduce((w, ch) => w + (isWide(ch) ? 1 : 0.6) * fs, 0);

// Where "AI" sits inside INTRO_B (logos burst out of it).
export const AI_POS = (() => {
  const full = textWidth(INTRO_B.zh, INTRO_B.fs);
  const before = textWidth("我和 ", INTRO_B.fs);
  const ai = textWidth("AI", INTRO_B.fs);
  return { x: -full / 2 + before + ai / 2, y: INTRO_B.y };
})();

// ------------------------------------------------------------------ document
export type FieldId = "asset" | "style" | "neg" | "sound" | "shot1" | "shot2";
export const FIELDS: { id: FieldId; label: string }[] = [
  { id: "asset", label: "【资产】" },
  { id: "style", label: "【全局风格】" },
  { id: "neg", label: "【负面】" },
  { id: "sound", label: "【声音】" },
  { id: "shot1", label: "【镜1】" },
  { id: "shot2", label: "【镜2】" },
];

export const DOC = {
  cx: 0,
  top: 960,
  w: 920,
  pad: 32,
  labelW: 186,
  gap: 22, // content column = 648 = exactly 18 full-width characters
  headerH: 84,
  rowPad: 20,
  fs: 36,
  lineH: 54,
  labelFs: 28,
  footerH: 104,
  appear: 166,
  rowsIn: 182, // skeleton rows appear one by one from here
};
export const DOC_LEFT = DOC.cx - DOC.w / 2;
export const DOC_RIGHT = DOC.cx + DOC.w / 2;
export const CONTENT_X = DOC_LEFT + DOC.pad + DOC.labelW + DOC.gap;
export const CONTENT_W = DOC.w - DOC.pad * 2 - DOC.labelW - DOC.gap;
export const ROWS_TOP = DOC.top + DOC.headerH + 12;
// header slots the logos settle into
export const TOPBAR_ICON = 34;
export const topbarSlot = (i: number) => ({ x: DOC_LEFT + 408 + i * 48, y: DOC.top + DOC.headerH / 2 });

export type Op =
  | { kind: "type"; field: FieldId; at: number; text: string; rate: number; where?: "start" | "end" }
  | { kind: "strike"; field: FieldId; at: number; target: string | "all" }
  | { kind: "erase"; field: FieldId; at: number; rate: number };

// The whole edit history v1 → v13. rate = frames per character.
export const OPS: Op[] = [
  // loop 1 (slow): v1, v2
  { kind: "type", field: "shot1", at: 212, text: "女孩探头", rate: 5 },
  { kind: "strike", field: "shot1", at: 270, target: "女孩探头" },
  { kind: "erase", field: "shot1", at: 278, rate: 3 },
  { kind: "type", field: "shot1", at: 292, text: "女孩从圆形舷窗后探出头", rate: 2.6 },
  // loop 2 (medium): v3 – v6
  { kind: "type", field: "style", at: 334, text: "写实", rate: 2 },
  { kind: "strike", field: "style", at: 342, target: "写实" },
  { kind: "erase", field: "style", at: 347, rate: 2 },
  { kind: "type", field: "style", at: 353, text: "2.5D 卡通渲染", rate: 1.5 },
  { kind: "type", field: "neg", at: 371, text: "不要变形", rate: 1.5 },
  { kind: "type", field: "sound", at: 379, text: "BGM", rate: 1.5 },
  { kind: "type", field: "neg", at: 392, text: "，不要闪烁", rate: 1.5 },
  { kind: "type", field: "shot1", at: 403, text: "，眨眼", rate: 1.5 },
  { kind: "type", field: "shot2", at: 413, text: "角色在沙尘中出拳", rate: 1.5 },
  { kind: "strike", field: "shot2", at: 427, target: "all" },
  { kind: "erase", field: "shot2", at: 436, rate: 1 },
  { kind: "type", field: "shot2", at: 446, text: "远景，沙尘中，角色侧身出拳，尘土炸开", rate: 1.2 },
  // loop 3 (peak): v7 – v12, several fields at once
  { kind: "type", field: "neg", at: 472, text: "，不要多手指", rate: 1 },
  { kind: "type", field: "style", at: 474, text: "，16:9", rate: 1 },
  { kind: "type", field: "asset", at: 480, text: "Q版女孩", rate: 1 },
  { kind: "type", field: "neg", at: 489, text: "，不要脸漂", rate: 1 },
  { kind: "type", field: "shot1", at: 492, text: "，歪头", rate: 1 },
  { kind: "strike", field: "sound", at: 501, target: "BGM" },
  { kind: "type", field: "neg", at: 503, text: "，不要突然换脸", rate: 1 },
  { kind: "erase", field: "sound", at: 505, rate: 1 },
  { kind: "type", field: "sound", at: 509, text: "环境音", rate: 1 },
  { kind: "type", field: "neg", at: 528, text: "，不要穿模", rate: 1 },
  { kind: "type", field: "asset", at: 531, text: "：浅蓝短发、红白外套", rate: 1 },
  { kind: "type", field: "style", at: 535, text: "，自然光", rate: 1 },
  { kind: "type", field: "neg", at: 547, text: "，不要多余字幕", rate: 1 },
  { kind: "type", field: "sound", at: 550, text: "，轻微金属回声", rate: 1 },
  { kind: "type", field: "shot1", at: 574, text: "0–2s 近景，", rate: 1, where: "start" },
  { kind: "type", field: "shot2", at: 578, text: "0–2s ", rate: 1, where: "start" },
  // one more "不要" typed in panic and taken back
  { kind: "type", field: "neg", at: 584, text: "，不要太丑", rate: 1 },
  { kind: "strike", field: "neg", at: 590, target: "，不要太丑" },
  { kind: "erase", field: "neg", at: 593, rate: 1 },
];

export const VERSIONS: { v: number; f: number }[] = [
  { v: 1, f: 234 },
  { v: 2, f: 323 },
  { v: 3, f: 368 },
  { v: 4, f: 385 },
  { v: 5, f: 409 },
  { v: 6, f: 470 },
  { v: 7, f: 486 },
  { v: 8, f: 498 },
  { v: 9, f: 514 },
  { v: 10, f: 543 },
  { v: 11, f: 559 },
  { v: 12, f: 583 },
  { v: 13, f: S.stop },
];

export const FINAL_V13: Record<FieldId, string> = {
  asset: "Q版女孩：浅蓝短发、红白外套",
  style: "2.5D 卡通渲染，16:9，自然光",
  neg: "不要变形，不要闪烁，不要多手指，不要脸漂，不要突然换脸，不要穿模，不要多余字幕",
  sound: "环境音，轻微金属回声",
  shot1: "0–2s 近景，女孩从圆形舷窗后探出头，眨眼，歪头",
  shot2: "0–2s 远景，沙尘中，角色侧身出拳，尘土炸开",
};

// ------------------------------------------------------------------ glitch results
export type Glitch = "stutter" | "pixelate" | "tear" | "rgb" | "hue" | "stretch";
export type GlitchCardDef = {
  pop: number;
  mark: number; // red ✕ + label
  toss: number; // thrown away
  clip: "portrait" | "wide";
  glitch: Glitch;
  label: string;
  corner: "tr" | "br" | "bl" | "tl";
  version: number;
};
export const GLITCH_CARDS: GlitchCardDef[] = [
  { pop: 238, mark: 252, toss: 266, clip: "portrait", glitch: "stutter", label: "动作僵", corner: "tr", version: 1 },
  { pop: 387, mark: 397, toss: 405, clip: "portrait", glitch: "pixelate", label: "脸崩了", corner: "br", version: 4 },
  { pop: 411, mark: 421, toss: 429, clip: "wide", glitch: "tear", label: "画面闪", corner: "tr", version: 5 },
  { pop: 487, mark: 495, toss: 503, clip: "wide", glitch: "stretch", label: "变形了", corner: "bl", version: 7 },
  { pop: 515, mark: 523, toss: 531, clip: "portrait", glitch: "hue", label: "不是我要的", corner: "tr", version: 9 },
  { pop: 560, mark: 568, toss: 576, clip: "wide", glitch: "rgb", label: "画面闪", corner: "br", version: 11 },
];

// ------------------------------------------------------------------ clips
export const CLIPS = {
  portrait: { src: "clips/clip-portrait.mp4", frames: 53, aspect: 720 / 1280 },
  wide: { src: "clips/clip-wide.mp4", frames: 48, aspect: 720 / 368 },
};

// Clean results after v13, next to the document.
export const RESULT_Y = 1420;
export const RESULTS = {
  portrait: { x: DOC_RIGHT + 80 + 405 / 2, y: RESULT_Y, w: 405, in: S.success - 4 },
  wide: { x: DOC_RIGHT + 80 + 405 + 70 + 880 / 2, y: RESULT_Y, w: 880, in: 698 },
};

// Back stack of earlier versions revealed when the camera pulls back.
export const STACK_STEP = { x: 46, y: -72 };

// ------------------------------------------------------------------ logos
export const LOGO_FILES = [
  { file: "gpt-white.png" },
  { file: "claude.png", pixelated: true },
  { file: "gemini.png" },
  { file: "deepseek.png" },
];
export const LOGO_BOX = 92;
export const LOGO_BURST = 90; // 3s
export const LOGO_OFFSETS: [number, number][] = [
  [-300, -150],
  [260, -175],
  [-280, 150],
  [300, 140],
];
export const logoEmerge = (i: number) => LOGO_BURST + i * 3;
export const logoDock = (i: number) => LOGO_BURST + 13 + i * 2; // shrink into the corner
export const LOGO_TO_TOPBAR = [172, 194] as const; // corner → editor top bar
export const CORNER_ICON = 46; // screen px while docked in the corner
export const cornerSlot = (i: number) => ({ x: WIDTH - 72 - (3 - i) * 62, y: 66 });

// ------------------------------------------------------------------ camera
export type Key = { f: number; x: number; y: number; z: number; r?: number };
export const KEYS_INTRO: Key[] = [
  { f: 0, x: 0, y: -14, z: 1.18 },
  { f: 119, x: 0, y: -14, z: 1.3 },
  { f: 146, x: 0, y: 505, z: 1.3 },
  { f: 160, x: 0, y: 515, z: 1.33 },
  { f: 192, x: 0, y: 1340, z: 1.0 },
];
export const KEYS_SUCCESS: Key[] = [
  { f: S.success, x: 600, y: RESULT_Y, z: 0.9 },
  { f: 694, x: 610, y: RESULT_Y, z: 0.92 },
  { f: 716, x: 1050, y: RESULT_Y, z: 0.9 },
  { f: S.look, x: 1060, y: RESULT_Y, z: 0.9 },
];
export const END_POS = { x: 520, y: 3480 };
export const LOOK_Z = 0.42;
export const KEYS_LOOK: Key[] = [
  { f: S.look, x: 1060, y: RESULT_Y, z: 0.9 },
  { f: 800, x: 520, y: 1080, z: LOOK_Z },
  { f: 808, x: 520, y: 1110, z: LOOK_Z },
  { f: 828, x: END_POS.x, y: END_POS.y, z: LOOK_Z },
  { f: DURATION, x: END_POS.x, y: END_POS.y, z: LOOK_Z },
];
// Whole-template framing for the stop / generate beat.
export const STOP_CAM = { x: 0, y: 1452, z: 1.0 };

// zoom used while following the cursor, per loop
export const FOLLOW_Z = { loop1: 1.95, loop2: 1.5 };
export const LOOP3_Z = [1.3, 1.5, 1.36, 1.56, 1.28, 1.45];
export const LOOP3_R = [-3, 3.5, -2.5, 3, -3.5, 2.5];

// motion-blur samples per frame (strongest only at the peak)
export const blurSamples = (f: number) => {
  if (f >= S.loop3 && f < S.stop) return 7;
  if (f >= 86 && f <= 120) return 5;
  if (f >= S.loop2 && f < S.loop3) return 3;
  if (f >= 262 && f <= 282) return 3;
  return 1;
};

// ------------------------------------------------------------------ all text (font subset check)
export const ALL_TEXT_V2 = [
  INTRO_A.zh, INTRO_A.en, INTRO_B.zh, INTRO_B.en, TURN_A.zh, TURN_A.en, TURN_B.zh, TURN_B.en,
  ...SLAMS.map((s) => s.zh + s.en),
  SUCCESS_NOTE.zh, SUCCESS_NOTE.en,
  END.a, END.zh, END.small,
  ...FIELDS.map((f) => f.label),
  ...OPS.map((o) => (o.kind === "type" ? o.text : "")),
  ...GLITCH_CARDS.map((g) => g.label),
  "prompt_template.txt 生成 GENERATE RESULT v0123456789 · ×",
].join("");
