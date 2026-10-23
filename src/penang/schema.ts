// Props of the PenangBridge composition. Everything JIN may want to retune in
// Remotion Studio lives here: which bars of the BGM to use, every shot
// (picture, start/length in beats, camera move, transition, where its light
// comes from), every caption, extra flares, the look and the credits. Timing
// is always in film beats (see beats.ts).

import { zColor } from "@remotion/zod-types";
import { z } from "zod";

const move = z.object({
  x: z.number().describe("照片：画面对准图片的横向位置 %（50 = 居中）；地图：镜头对准的地图 x（px）；代码画面：镜头横移 px"),
  y: z.number().describe("照片：纵向位置 %（可以略小于 0 或大于 100，多出的部分藏在黑边后面）；地图：地图 y（px）；代码画面：竖移 px"),
  scale: z.number().min(0.2).max(6).describe("照片 / 代码画面：放大倍数；地图：每个地图 px 在屏幕上多大"),
  rotate: z.number().min(-25).max(25).describe("照片 / 代码画面：画面旋转（度）；地图：镜头朝向（0 = 正北朝上）"),
  tilt: z.number().min(0).max(78).describe("地图：俯仰角（0 = 正上方往下看，70 以上贴着海面能看到天空）；照片不用"),
});

export const shotSchema = z.object({
  name: z.string().describe("镜头名（Studio 时间线上显示）"),
  kind: z
    .enum(["photo", "map", "sunset", "night", "closure"])
    .describe("photo = 图片；map = 代码画的海峡地图；sunset = 落日双塔；night = 夜里开上桥；closure = 1985 桥面合龙"),
  mapMode: z
    .enum(["ferries", "why", "bridge", "industry"])
    .describe("kind = map 时画什么：渡轮来回 / 自由港划掉、镜头飞到峇六拜 / 大桥一拍一段画过海峡 / 工厂和港口之间的车流"),
  src: z.string().describe("public/ 下的图片路径（kind = photo）"),
  tone: z.enum(["none", "aged", "bw"]).describe("调色：原样 / 做旧 / 黑白老胶片"),
  at: z.number().describe("从第几拍开始（片内拍号，第 n 小节 = 4n）"),
  beats: z.number().min(0.5).describe("持续几拍"),
  enter: z
    .enum(["cut", "flash", "whip", "whipUp", "leak", "zoom", "fade", "dark"])
    .describe("进场转场：硬切 / 闪白 / 横甩 / 竖甩 / 漏光 / 穿越推镜 / 叠化 / 压暗"),
  from: move.describe("运镜起点"),
  to: move.describe("运镜终点"),
  ease: z
    .enum(["drift", "inOut", "linear", "swoop"])
    .describe("运镜曲线：drift = 匀速为主；inOut = 两头停稳（首尾接 loop 的镜头用）；linear = 匀速；swoop = 前半段几乎不动，正中那一拍猛地飞到终点"),
  dim: z.number().min(0).max(1).describe("压暗（0 = 不压暗）"),
  light: z
    .object({
      x: z.number().describe("光源 x（%）"),
      y: z.number().describe("光源 y（%）"),
      amount: z.number().min(0).max(3).describe("这个镜头里每拍光脉冲和重音光晕的强度"),
    })
    .describe("画面里的光从哪里来：每拍的光脉冲、重音光晕和横向光条都从这里打出"),
});

export const captionSchema = z.object({
  at: z.number().describe("出现在第几拍"),
  beats: z.number().min(0.5).describe("停留几拍"),
  style: z
    .enum(["title", "subtitle", "number"])
    .describe("title = 大标题；subtitle = 底部字幕（有黑边时放在下黑边里）；number = 大号数字，跟着画面慢慢移动，sub 是数字上方的小标签"),
  title: z.string().describe("正文（title 100 px 一行不超过 10 个字）"),
  sub: z.string().describe("title：副标题；number：小标签"),
  en: z.string().describe("英文行（只给片名用）"),
  subAt: z.number().min(0).describe("副标题比正文晚几拍"),
  place: z.enum(["lowerLeft", "upperLeft", "left", "right", "center", "top"]).describe("位置（subtitle 不用）"),
  size: z.number().min(30).max(320).describe("字号 px"),
  slam: z.boolean().describe("砸进（放大回弹）而不是滑入"),
  dy: z.number().describe("上下偏移 px（几行叠成一段时用）"),
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
      fx: z.boolean().describe("特效层（光效、漏光、光尘、调色、颗粒、暗角、黑边）"),
      text: z.boolean().describe("文字层"),
    })
    .describe("三层可以分开关掉、分开渲染"),
  look: z.object({
    warm: zColor().describe("暖光颜色"),
    accent: zColor().describe("强调色（数字上方的小标签）"),
    flare: z.number().min(0).max(3).describe("重音光晕强度"),
    pulse: z.number().min(0).max(3).describe("每拍光脉冲强度"),
    leak: z.number().min(0).max(3).describe("漏光强度"),
    grain: z.number().min(0).max(1).describe("颗粒"),
    vignette: z.number().min(0).max(1).describe("暗角"),
    autoHits: z.boolean().describe("自动在 JSON 检测到的强重音上打光晕（打在当时那个镜头的光源上）"),
    dust: z.number().min(0).max(1).describe("漂浮光尘（远近不同的小光点，给画面纵深；亮度跟着拍子）"),
    grade: z.number().min(0).max(1).describe("电影调色：亮部偏暖、暗部偏青"),
    letterbox: z.number().min(0).max(200).describe("上下黑边高度 px（132 ≈ 2.35:1 宽银幕；0 = 不要黑边）"),
  }),
  shots: z.array(shotSchema),
  captions: z.array(captionSchema),
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
export type Move = z.infer<typeof move>;
