// Props of the PenangBridge composition. Everything JIN may want to retune in
// Remotion Studio lives here: which bars of the BGM to use, every shot
// (image, start/length in beats, camera move, print position and size,
// transition), every caption, the chapter labels, the year chip, extra
// flares and the credits. Timing is always in film beats (see beats.ts).

import { zColor } from "@remotion/zod-types";
import { z } from "zod";

const move = z.object({
  x: z.number().describe("全屏：焦点横向 %（50 = 居中）；相片：横向位移 px"),
  y: z.number().describe("全屏：焦点纵向 %（50 = 居中）；相片：纵向位移 px"),
  scale: z.number().min(0.2).max(4).describe("缩放"),
});

export const shotSchema = z.object({
  name: z.string().describe("镜头名（Studio 时间线上显示）"),
  kind: z.enum(["photo", "why", "need", "closure"]).describe("photo = 图片；其余是代码画面"),
  src: z.string().describe("public/ 下的图片路径"),
  style: z.enum(["full", "print"]).describe("full = 满屏；print = 相片放在自己的模糊底图上"),
  tone: z.enum(["none", "aged", "bw"]).describe("调色：原样 / 做旧 / 黑白"),
  overlay: z.enum(["none", "ferry", "bridge", "industry"]).describe("地图叠加动画（只对对应的 OSM 截图有效）"),
  at: z.number().describe("从第几拍开始（片内拍号，第 n 小节 = 4n）"),
  beats: z.number().min(0.5).describe("持续几拍"),
  enter: z
    .enum(["cut", "flash", "whip", "whipUp", "leak", "zoom", "fade", "dark"])
    .describe("进场转场：硬切 / 闪白 / 横甩 / 竖甩 / 漏光 / 穿越推镜 / 叠化 / 压暗"),
  from: move.describe("运镜起点"),
  to: move.describe("运镜终点"),
  print: z
    .object({
      x: z.number().describe("相片中心 x（px）"),
      y: z.number().describe("相片中心 y（px）"),
      height: z.number().describe("相片高度（px）"),
      rotate: z.number().describe("旋转（度）"),
    })
    .describe("print 样式的相片位置和大小"),
  kick: z.number().min(0).max(3).describe("每拍推镜脉冲的强度（0 = 不跳）"),
  dim: z.number().min(0).max(1).describe("压暗（0 = 不压暗）"),
  ease: z
    .enum(["drift", "inOut", "linear"])
    .describe("运镜曲线：drift = 匀速为主；inOut = 两头停稳（首尾接 loop 的镜头用）；linear = 匀速"),
});

export const captionSchema = z.object({
  at: z.number().describe("标题出现在第几拍"),
  beats: z.number().min(0.5).describe("停留几拍"),
  kicker: z.string().describe("标题上面的小字"),
  title: z.string().describe("标题（100 px 一行不超过 10 个字）"),
  sub: z.string().describe("副标题（中文）"),
  en: z.string().describe("英文行"),
  subAt: z.number().min(0).describe("副标题比标题晚几拍"),
  place: z.enum(["lowerLeft", "upperLeft", "left", "center", "top"]).describe("位置"),
  size: z.number().min(40).max(260).describe("标题字号 px"),
  slam: z.boolean().describe("砸进（放大回弹）而不是滑入"),
  big: z.string().describe("标题后面的大号数字（可空）"),
  dy: z.number().describe("上下偏移 px（几条字幕叠成一段时用）"),
  scrim: z.boolean().describe("文字后面垫一层暗色"),
  typeBeats: z.number().min(0).describe("逐字打出用几拍（0 = 整行滑入）；字落在八分音符上"),
  exit: z.number().min(0).max(30).describe("结束前淡出用几帧（0 = 一直亮到最后，被下一个镜头盖掉）"),
});

export const penangSchema = z.object({
  music: z.object({
    src: z.string().describe("BGM 路径（public/ 下）"),
    startBar: z.number().int().min(0).describe("从歌的第几小节开始（见 public/data/penang-bgm.json 的 bars）"),
    bars: z.number().int().min(1).describe("用几小节"),
    preRoll: z.number().min(0).max(1).describe("第一拍前留几秒"),
    tail: z.number().min(0).max(10).describe("最后一拍后留几秒（loop 时不用）"),
    loop: z
      .boolean()
      .describe("首尾接成 loop：片长正好是整数小节，结尾停在下一个重拍前，循环播放时节拍不断"),
    fadeIn: z.number().min(0).max(2).describe("音乐淡入秒数"),
    fadeOut: z.number().min(0).max(10).describe("音乐淡出秒数（loop：片尾最后几秒；否则从最后一拍开始）"),
    volume: z.number().min(0).max(1).describe("音量"),
  }),
  layers: z
    .object({
      photos: z.boolean().describe("画面层"),
      fx: z.boolean().describe("特效层（光效、漏光、颗粒、暗角）"),
      text: z.boolean().describe("文字层"),
    })
    .describe("三层可以分开关掉、分开渲染"),
  look: z.object({
    warm: zColor().describe("暖光颜色"),
    accent: zColor().describe("强调色（章节签、年份）"),
    flare: z.number().min(0).max(3).describe("重音光晕强度"),
    pulse: z.number().min(0).max(3).describe("每拍光脉冲强度"),
    leak: z.number().min(0).max(3).describe("漏光强度"),
    grain: z.number().min(0).max(1).describe("颗粒"),
    vignette: z.number().min(0).max(1).describe("暗角"),
    autoHits: z.boolean().describe("自动在 JSON 检测到的强重音上打光晕"),
    hitX: z.number().describe("自动光晕中心 x（%）"),
    hitY: z.number().describe("自动光晕中心 y（%）"),
  }),
  shots: z.array(shotSchema),
  captions: z.array(captionSchema),
  chapters: z.array(z.object({ at: z.number(), label: z.string(), en: z.string() })).describe("左上角章节签"),
  years: z.array(z.object({ at: z.number(), text: z.string() })).describe("右上角年份（空字符串 = 隐藏）"),
  flares: z
    .array(
      z.object({
        at: z.number().describe("拍号"),
        strength: z.number().describe("强度"),
        x: z.number().describe("光晕中心 x（%）"),
        y: z.number().describe("光晕中心 y（%）"),
      }),
    )
    .describe("手动加的光晕；离自动重音不到 0.25 拍时替换掉自动的那一个"),
  credits: z
    .object({
      lines: z.array(z.string()).describe("一行一条，第一行是标题"),
      at: z.number().describe("从第几拍出现"),
      beats: z.number().min(0.5).describe("停留几拍"),
      place: z.enum(["center", "bottom"]).describe("center = 黑场居中；bottom = 小字叠在画面下方"),
    })
    .describe("署名"),
});

export type PenangProps = z.infer<typeof penangSchema>;
export type Shot = z.infer<typeof shotSchema>;
export type Caption = z.infer<typeof captionSchema>;
