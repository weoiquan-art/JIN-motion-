// Butterworth (北海) promo: single source of truth for timing, text and the
// day's colours. Shared by the composition and scripts/gen-audio-bw.ts (run
// by Node directly), so this file has no imports.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Cut to a 100 BPM score: one beat = 18 frames, one bar = 72 frames, and every
// scene change lands on a bar line. 25 bars = 60 s.
export const BEAT = 18;
export const BAR = BEAT * 4;
export const DURATION = BAR * 25;

// ------------------------------------------------------------------ map
// Opening and ending happen on a map of Penang; the day in between is a strip
// of illustrated scenes the camera whip-pans along.
export const M = {
  fadeIn: 0,
  routesIn: 18, // routes draw on, traffic starts flowing through
  lineA: 30, // "很多人，只是路过北海。"
  stop: 120, // traffic freezes: "但如果，你停下来——"
  lineB: 126,
  irisIn: 156, // Butterworth dot opens into the first scene
  irisFull: BAR * 3,
  // ending
  irisOut: BAR * 23 - 16, // night scene shrinks back into the dot
  irisGone: BAR * 23 + 22,
  endA: BAR * 23 + 20,
  endB: BAR * 23 + 34,
  endSmall: BAR * 23 + 48,
  fadeOut: DURATION - 24,
} as const;

export const MAP_TEXT = {
  a: { zh: ["很多人，", "只是路过北海。"], en: "Most people only pass through Butterworth." },
  b: { zh: ["但如果，", "你停下来——"], en: "But if you stopped here—" },
  end: { zh: ["北海，", "不只是路过。"], en: "Butterworth — more than a stopover." },
  endSmall: "槟城 · 北海   BUTTERWORTH, PENANG",
};

// ------------------------------------------------------------------ scenes
export type SceneId = "dawn" | "food" | "art" | "temple" | "ferry" | "sunset" | "night";
export type SceneDef = {
  id: SceneId;
  from: number; // first frame fully on screen (bar line)
  to: number; // next scene's bar line
  clock: string;
  tag: { zh: string; en: string };
  title: string;
  en: string;
};

export const SCENES: SceneDef[] = [
  {
    id: "dawn",
    from: BAR * 3,
    to: BAR * 6,
    clock: "07:10",
    tag: { zh: "清晨", en: "DAWN" },
    title: "渔船回港",
    en: "Fishing boats come home at first light",
  },
  {
    id: "food",
    from: BAR * 6,
    to: BAR * 9,
    clock: "08:30",
    tag: { zh: "早餐", en: "BREAKFAST" },
    title: "一碗面，叫醒北海",
    en: "A bowl of noodles wakes the town",
  },
  {
    id: "art",
    from: BAR * 9,
    to: BAR * 12,
    clock: "11:00",
    tag: { zh: "北海艺术步道", en: "BUTTERWORTH ART WALK" },
    title: "后巷的墙，画着老北海",
    en: "Old Butterworth, painted on back-lane walls",
  },
  {
    id: "temple",
    from: BAR * 12,
    to: BAR * 15,
    clock: "15:00",
    tag: { zh: "斗母宫", en: "TOW BOO KONG" },
    title: "午后，斗母宫的香火",
    en: "Afternoon incense at Tow Boo Kong",
  },
  {
    id: "ferry",
    from: BAR * 15,
    to: BAR * 18,
    clock: "17:30",
    tag: { zh: "渡轮", en: "PENANG FERRY" },
    title: "百年渡轮，往返两岸",
    en: "Crossing the strait by ferry since 1894",
  },
  {
    id: "sunset",
    from: BAR * 18,
    to: BAR * 21,
    clock: "19:10",
    tag: { zh: "海峡日落", en: "SUNSET" },
    title: "日落，在对岸",
    en: "The sun goes down on the other shore",
  },
  {
    id: "night",
    from: BAR * 21,
    to: BAR * 23,
    clock: "20:30",
    tag: { zh: "海边夜市", en: "PANTAI BERSIH" },
    title: "入夜，海边的灯亮了",
    en: "Night falls, the seaside stalls light up",
  },
];

// Whip pan between scenes: leaves PAN_LEAD frames before the bar line and
// settles PAN_TAIL frames after it, so the downbeat hits as the scene lands.
export const PAN_LEAD = 14;
export const PAN_TAIL = 6;
export const panAt = (i: number) => ({ start: SCENES[i].to - PAN_LEAD, end: SCENES[i].to + PAN_TAIL });
export const PANS = SCENES.slice(0, -1).map((_, i) => panAt(i));

// Scene titles: in after the camera settles, out before the next pan.
export const titleIn = (s: SceneDef) => s.from + 8;
export const titleOut = (s: SceneDef) => s.to - PAN_LEAD - 8;

// Food cards in the breakfast scene (pop on beats).
export const DISHES = [
  { zh: "粿条汤", en: "Koay Teow Th'ng", f: BAR * 6 + BEAT * 2 },
  { zh: "咖喱面", en: "Curry Mee", f: BAR * 6 + BEAT * 4 },
  { zh: "卤面", en: "Loh Mee", f: BAR * 6 + BEAT * 6 },
  { zh: "扁担饭", en: "Nasi Kandar", f: BAR * 6 + BEAT * 8 },
];

// Moments the soundtrack marks.
export const CUES = {
  gulls: BAR * 3 + 20,
  boatIn: BAR * 3 + 40,
  bell: BAR * 12 + 10,
  horn: BAR * 15 + 24,
  sunTouch: BAR * 19 + 36, // sun meets the hill line
  lightsOn: BAR * 20 + 12, // lamps and the far shore light up
  stallsOn: BAR * 21 + 8,
};

// ------------------------------------------------------------------ sky
// Sky gradient and sun / moon per scene (screen space). Between scenes the
// sky blends during the whip pan, like a time-lapse.
export type Sky = {
  top: string;
  mid: string;
  low: string;
  sun: { x: number; y: number; r: number; color: string; glow: string; a: number };
  moon: number; // 0..1
  stars: number; // 0..1
};
export const SKIES: Record<SceneId, [Sky, Sky]> = {
  dawn: [
    { top: "#26315f", mid: "#b8668a", low: "#ffb07a", sun: { x: 800, y: 612, r: 56, color: "#ffe2b0", glow: "#ff9d6b", a: 1 }, moon: 0, stars: 0.25 },
    { top: "#3a4f86", mid: "#d98a8f", low: "#ffcf96", sun: { x: 820, y: 536, r: 58, color: "#fff0cc", glow: "#ffb57a", a: 1 }, moon: 0, stars: 0 },
  ],
  food: [
    { top: "#4f9ee0", mid: "#9fd2f0", low: "#f7ead0", sun: { x: 1640, y: 170, r: 44, color: "#fffbe8", glow: "#fff2b8", a: 1 }, moon: 0, stars: 0 },
    { top: "#4a9ae0", mid: "#9ad0f0", low: "#f3ecd8", sun: { x: 1650, y: 150, r: 44, color: "#fffbe8", glow: "#fff2b8", a: 1 }, moon: 0, stars: 0 },
  ],
  art: [
    { top: "#2f8fe0", mid: "#86c6f2", low: "#e6f3fb", sun: { x: 1560, y: 90, r: 42, color: "#ffffff", glow: "#fff6cc", a: 1 }, moon: 0, stars: 0 },
    { top: "#2f8fe0", mid: "#86c6f2", low: "#e6f3fb", sun: { x: 1580, y: 86, r: 42, color: "#ffffff", glow: "#fff6cc", a: 1 }, moon: 0, stars: 0 },
  ],
  temple: [
    { top: "#4689d4", mid: "#a2cbe8", low: "#f8e2b4", sun: { x: 1600, y: 200, r: 46, color: "#fff6dc", glow: "#ffe08a", a: 1 }, moon: 0, stars: 0 },
    { top: "#4a84cc", mid: "#b2c8de", low: "#fbd9a0", sun: { x: 1620, y: 240, r: 48, color: "#fff2d0", glow: "#ffd27a", a: 1 }, moon: 0, stars: 0 },
  ],
  ferry: [
    { top: "#4f6db0", mid: "#e7a873", low: "#ffd08a", sun: { x: 1460, y: 330, r: 58, color: "#fff0c0", glow: "#ffb35c", a: 1 }, moon: 0, stars: 0 },
    { top: "#4a5f9e", mid: "#eb9a6c", low: "#ffc27a", sun: { x: 1450, y: 380, r: 60, color: "#ffe6a8", glow: "#ffa04c", a: 1 }, moon: 0, stars: 0 },
  ],
  sunset: [
    { top: "#3b2c6e", mid: "#d6527c", low: "#ff9b4c", sun: { x: 1190, y: 360, r: 90, color: "#ffd38a", glow: "#ff7a45", a: 1 }, moon: 0, stars: 0 },
    { top: "#1f1a4c", mid: "#9c3a6c", low: "#ff7a3c", sun: { x: 1200, y: 566, r: 90, color: "#ffb36a", glow: "#ff5a3a", a: 1 }, moon: 0, stars: 0.35 },
  ],
  night: [
    { top: "#0a0f2e", mid: "#172453", low: "#2c3a72", sun: { x: 1200, y: 700, r: 90, color: "#ff8a4a", glow: "#ff5a3a", a: 0 }, moon: 1, stars: 1 },
    { top: "#090d29", mid: "#15214e", low: "#28356a", sun: { x: 1200, y: 700, r: 90, color: "#ff8a4a", glow: "#ff5a3a", a: 0 }, moon: 1, stars: 1 },
  ],
};

// ------------------------------------------------------------------ all text (font subset check)
export const ALL_TEXT_BW = [
  ...MAP_TEXT.a.zh, MAP_TEXT.a.en, ...MAP_TEXT.b.zh, MAP_TEXT.b.en, ...MAP_TEXT.end.zh, MAP_TEXT.end.en, MAP_TEXT.endSmall,
  ...SCENES.map((s) => s.clock + s.tag.zh + s.tag.en + s.title + s.en),
  ...DISHES.map((d) => d.zh + d.en),
  // map labels and signboards
  "槟城岛 PENANG ISLAND 乔治市 George Town 北海 Butterworth 威省 SEBERANG PERAI 马六甲海峡 STRAIT OF MALACCA",
  "槟威大桥 Penang Bridge 13.5 km 第二大桥 24 km 铁路 往吉隆坡 Kuala Lumpur 渡轮 Ferry 5.40°N 100.37°E",
  "茶室 KOPITIAM 咖啡 海鲜 SEAFOOD 沙爹 SATAY 炒粿条 福 斗母宫 TOW BOO KONG 北海 BUTTERWORTH",
  "0123456789:·—–，。、",
].join("");
