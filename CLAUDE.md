# JIN-motion

JIN（AI 视频创作者）的代码动画仓库：用 Remotion 写画面，用脚本合成配乐，直接渲染成 mp4，不经过视频生成模型。

## 片子

| Composition | 代码 | 成片 | 配乐 | 说明 |
| --- | --- | --- | --- | --- |
| `Intro` | `src/intro/` | `out/intro.mp4` | `scripts/gen-audio.ts` → `public/audio/intro.wav` | 15 秒 |
| `IntroV2` | `src/intro-v2/` | `out/intro-v2.mp4` | `scripts/gen-audio-v2.ts` → `public/audio/intro-v2.wav` | 30 秒 |
| `Butterworth` | `src/butterworth/` | `out/butterworth.mp4` | `scripts/gen-audio-bw.ts` → `public/audio/butterworth.wav` | 60 秒槟城北海宣传片 |

都是 1920×1080、30 帧／秒。`Test`、`MyComp` 是脚手架，不用管。

## 命令（在 claude.ai 云端容器里实测过）

- 装依赖：`npm i --loglevel=error`
- 检查：`npm run lint`（eslint + tsc），提交前必跑。
- 渲染整片：`npm run render:intro`、`render:intro-v2`、`render:butterworth`。新片照着加一条 `npm run render:cloud -- <Composition> out/<名字>.mp4`。浏览器用 `/opt/pw-browsers` 里现成的 headless shell，不要跑 `playwright install`。Butterworth 1,800 帧约 3 分钟。
- 渲染单帧：`npx remotion still src/index.ts <Composition> <输出.png> --frame=<帧> --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`
- 生成配乐：`npm run audio`、`audio:v2`、`audio:bw`。改了时间轴就重跑。
- 下载字体：`npm run fonts`。画面上加了新字就重跑。

## 硬规矩

- **字体只用 `public/fonts` 里的本地文件。** 渲染用的浏览器走代理，连不上 Google 字体。画面上的每个字都要写进那条片子 `timeline.ts` 里的 `ALL_TEXT*` 常量，再跑 `npm run fonts`。漏写的字不会报错，会显示成系统字体或方框；写了却没重跑 `npm run fonts`，本地缺文件，渲染会失败。
- 中文字体（Noto Sans SC、Noto Serif SC）注册时去掉 ASCII 区段，英文和数字统一走 Inter（IntroV2 走 JetBrains Mono）。工具函数在 `src/intro/font-subsets.ts`。
- **每条片子一个 `timeline.ts`**，管时间、文字和关键帧；配乐脚本直接 import 它，声音按帧号对齐画面。`timeline.ts` 不能 import 别的文件，因为脚本是用 Node 直接跑的。
- `out/` 在 `.gitignore` 里，成片要用 `git add -f out/<名字>.mp4`，和 wav、新下载的字体一起提交。单个文件要小于 100 MB（Butterworth 是 38 MB）。
- 运动模糊（`src/intro/MotionBlur.tsx`）只在快速运镜时开，平时每帧 1 次采样；全程开，渲染会慢很多。

## 做新片的流程

以下来自 2026-10-22 的北海宣传片（单次；JIN 同意写进本文件，但还没评价那条成片）。

1. **先问清楚再开工。** JIN 的需求常常只有一句，而且 JIN 说过“说话可能抽象，请先问完整意思”。用选择题问三项：做成什么（代码动画成片／AI 视频提示词包／两者结合）、画幅和时长、画面文字的语言。北海那次推荐的是 9:16 竖屏 30 秒，JIN 选了 16:9 横屏 60 秒，默认值不一定猜得对。
2. **画面里的事实都要有来源。** 数字、专名、史实，每一条都查到出处并记进案例；查不到就不写数字，或者先问 JIN。北海片的“第二大桥 24 km”是凭记忆写的，就是反例。
3. **先定节拍网格。** 30 帧／秒下 100 BPM 正好 18 帧一拍、72 帧一小节；换场景放在小节线上。
4. **先定标题安全区，再摆道具。** 北海片的标题在左下，道具和主体都不要进这块。100 px 的中文标题一行不超过 10 个字。
5. **自检。** 每个场景先渲 2–3 张静帧，用 Python（PIL）拼成一张看 → 改 → 渲整片 → 每 2.5 秒抽一帧，再加上转场中间的帧看一遍。北海片看出来的问题：道具压住标题、太阳被房子挡住、半透明的山让太阳透出来、鸟正好飞过太阳像一张脸、屋脊悬空、灯泡不像亮着、标题太长、地图标签压在线上。
6. **声音 Claude 听不到，只能量。** 用 `ffmpeg -i <wav> -af ebur128=framelog=quiet -f null -` 量响度（北海片整体 -14.1 LUFS），用 ffmpeg 的 `showspectrumpic` 画频谱图找嘶声；用噪声做的音效（海浪、人声、风声）要加低通。交付时要说明配乐没有人听过。
7. **交付。** lint → 渲染 → 抽帧检查 → 提交推送 → 把成片发给 JIN，说清楚哪些没核验。
8. **记案例。** 每条片子在 `docs/cases/<日期>-<名字>/case.md` 记一份：JIN 的原话和选择、画面事实、制作决策、事实来源、自检改了什么、证据分级、缺口。JIN 给了反馈就追加，不改旧记录。

## 案例

- [2026-10-22 槟城北海 60 秒宣传片](docs/cases/2026-10-22-butterworth-promo-60s/case.md)：已交付，JIN 还没评价成片。
