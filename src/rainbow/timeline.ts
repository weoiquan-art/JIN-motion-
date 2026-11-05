// Time table of "彩虹为什么是圆的" (Rainbow), 16:9, 1920×1080, 30 fps.
// 90 BPM, so one beat is exactly 20 frames and one bar 80; 30 bars = 80 s.
// Scenes, captions, camera moves and every sound cue are placed here; the
// composition and the soundtrack script (scripts/gen-audio-rainbow.ts) both
// read it. No React or Remotion imports: Node runs this file directly.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BPM = 90;
export const BEAT = 20; // frames
export const BAR = BEAT * 4;
export const BARS = 30;
export const DURATION = BAR * BARS; // 2400 frames, 80 s

/** frame of a bar (and beat within it) */
export const at = (bar: number, beat = 0) => bar * BAR + beat * BEAT;

// ------------------------------------------------------------------ scenes
export const S = {
  hook: { from: at(0), to: at(4) }, // ground view, then the crane up to the full circle
  title: { from: at(4), to: at(6) }, // the title inside the circle, then a dive into one drop
  drop: { from: at(6), to: at(12) }, // one ray, many rays, the 42° pile-up, Descartes
  colors: { from: at(12), to: at(15) }, // white light splits: red 42.4°, violet 40.6°
  cone: { from: at(15), to: at(21) }, // 3D: the 42° cone around the shadow line, the ground, the sun rising
  own: { from: at(21), to: at(23) }, // two people, two cones; walking with it
  double: { from: at(23), to: at(26) }, // two reflections: the secondary bow, the dark band
  ending: { from: at(26), to: DURATION }, // your shadow is the centre
} as const;

// key moments
export const M = {
  bowIn: at(0, 0.5), // the bow brightens (sun comes out)
  rise: at(1, 3.5), // the crane up starts…
  riseEnd: at(3, 3.5), // …and the circle is closed
  title: at(4),
  dive: at(5, 2), // zoom into one drop
  dropIn: at(6),
  ray1: at(7), // one ray enters (bar 7), reflects (+1 beat), exits (+2 beats)
  angle1: at(8), // 42° marked
  sweep: at(9), // many rays, one per 8th note…
  sweepEnd: at(10),
  pile: at(10), // …they pile up at 42°
  descartes: at(11),
  split: at(12), // white → spectrum
  labels: at(13),
  order: at(14),
  coneIn: at(15),
  orbit: at(16), // side view → behind your head
  orbitEnd: at(17),
  ground: at(18), // the ground cuts the circle
  sunUp: at(19), // the sun climbs 12° → 50°
  sunUpEnd: at(20, 3),
  second: at(21), // a second person, a second cone
  walk: at(22), // walk towards the bow; it walks too
  twoBounce: at(23), // two reflections in the drop
  doubleSky: at(24), // the landscape with both bows
  darkBand: at(25),
  ending: at(26),
  centre: at(27), // the shadow of your head is the centre
  endTitle: at(28),
  fadeOut: at(29, 1),
} as const;

/** sun elevation in degrees in the landscape scenes (behind the viewer) */
export const SUN_EL = 12;

// ------------------------------------------------------------------ captions
export type Caption = { from: number; to: number; text: string };
export const CAPTIONS: Caption[] = [
  { from: 30, to: 150, text: "你见过的彩虹，都只是它的一部分。" },
  { from: 190, to: 312, text: "从高空看，彩虹是一个完整的圆。" },
  { from: 490, to: 594, text: "答案藏在一颗雨滴里。" },
  { from: 600, to: 714, text: "阳光射进雨滴，在背面反射一次，再射出来。" },
  { from: 722, to: 798, text: "每条光线射出的角度都不一样，" },
  { from: 802, to: 878, text: "但大多挤在 42° 附近，没有一条超过它。" },
  { from: 884, to: 956, text: "1637 年，笛卡尔逐条计算，得出了这个角度。" },
  { from: 966, to: 1038, text: "不同颜色的光，偏折得不一样：" },
  { from: 1044, to: 1116, text: "红光约 42.4°，紫光约 40.6°，" },
  { from: 1122, to: 1196, text: "所以彩虹外圈是红色，内圈是紫色。" },
  { from: 1210, to: 1286, text: "天上所有和“影子方向”成 42° 的雨滴，" },
  { from: 1292, to: 1364, text: "都把那束最亮的光送进你的眼睛；" },
  { from: 1370, to: 1438, text: "它们连起来，就是一个圆。" },
  { from: 1446, to: 1518, text: "地面挡住了下半圈，我们只看到一段弧。" },
  { from: 1526, to: 1596, text: "太阳越高，彩虹越低；" },
  { from: 1602, to: 1676, text: "太阳高过 42°，平地上就看不到这道彩虹了。" },
  { from: 1686, to: 1758, text: "每个人看到的，都是只属于自己的彩虹，" },
  { from: 1764, to: 1836, text: "所以，你永远走不到彩虹的尽头。" },
  { from: 1846, to: 1918, text: "光在雨滴里反射两次，就成了外侧的副虹：" },
  { from: 1924, to: 1996, text: "约 51°，颜色顺序正好反过来；" },
  { from: 2004, to: 2076, text: "两道虹之间的天空更暗，叫“亚历山大暗带”。" },
  { from: 2090, to: 2160, text: "下次看到彩虹，低头找找自己的影子：" },
  { from: 2166, to: 2236, text: "你头部的影子，就是彩虹的圆心。" },
];

export const TITLE = "彩虹为什么是圆的？";
export const END_TITLE = "彩虹，其实是一个圆。";
export const CREDIT = "JIN 制作";
