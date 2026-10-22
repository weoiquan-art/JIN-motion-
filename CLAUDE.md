# JIN-motion

JIN（AI 视频创作者）的代码动画仓库：用 Remotion 写画面，用脚本合成配乐，直接渲染成 mp4，不经过视频生成模型。

## 开工前先读

- [docs/remotion/README.md](docs/remotion/README.md)：通用经验（开工前要问的、字体、渲染与查看、文案）
- [docs/remotion/动效.md](docs/remotion/动效.md)：镜头、转场、节拍、声画同步、自检
- [docs/remotion/动画.md](docs/remotion/动画.md)：单个元素怎么动、扁平插画场景、地图
- `docs/cases/`：每条片子的案例记录（见文末“案例”）

## 片子

| Composition | 代码 | 成片 | 配乐 | 说明 |
| --- | --- | --- | --- | --- |
| `Intro` | `src/intro/` | `out/intro.mp4` | `scripts/gen-audio.ts` | 15 秒 |
| `IntroV2` | `src/intro-v2/` | `out/intro-v2.mp4` | `scripts/gen-audio-v2.ts` | 30 秒 |
| `IntroFree` | `src/intro-free/`、`src/content.ts` | `out/intro-free.mp4` | `scripts/gen-audio-free.ts` | 34 秒自我介绍，有自检脚本 |
| `Butterworth` | `src/butterworth/` | `out/butterworth.mp4` | `scripts/gen-audio-bw.ts` | 60 秒槟城北海宣传片 |

配乐都写到 `public/audio/`。都是 1920×1080、30 帧／秒。`Test`、`MyComp` 是脚手架，不用管。

## 命令（在 claude.ai 云端容器里跑过）

- 装依赖：`npm i --loglevel=error`
- 检查：`npm run lint`（eslint + tsc），提交前必跑。
- 渲染整片：`npm run render:intro`、`render:intro-v2`、`render:intro-free`、`render:butterworth`。新片照着加一条 `npm run render:cloud -- <Composition> out/<名字>.mp4`。浏览器用 `/opt/pw-browsers` 里现成的 headless shell，不要跑 `playwright install`。
- 渲染单帧：`npx remotion still src/index.ts <Composition> <输出.png> --frame=<帧> --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`。要连看很多帧时，照 docs/remotion/README.md 用 `renderStill`，快得多。
- 生成配乐：`npm run audio`、`audio:v2`、`audio:free`、`audio:bw`。改了时间轴就重跑。
- 下载字体：`npm run fonts`（Intro、IntroV2、Butterworth）、`npm run fonts:free`（IntroFree）。画面上加了新字就重跑。
- IntroFree 自检：`npm run check:intro-free`（节拍对齐、削波、静音段、每段响度）。

## 硬规矩

- **字体只用 `public/fonts` 里的本地文件。** 渲染用的浏览器走代理，连不上 Google 字体。画面上的每个字都要写进文字常量（各片 `timeline.ts` 里的 `ALL_TEXT*`；IntroFree 是 `src/content.ts` 的 `ALL_TEXT_FREE`），再跑下载。漏写的字不会报错，会显示成系统字体或方框；写了却没重跑下载，本地缺文件，渲染会失败。
- **每条片子一个时间表**（`timeline.ts`，IntroFree 另有 `beat.ts`），管时间、文字和关键帧；配乐脚本直接 import 它，声音按帧号对齐画面。配乐脚本是用 Node 直接跑的，所以这些文件只能 import 同样不依赖 React／Remotion 的文件，路径要写 `.ts` 后缀（IntroFree 的 `timeline.ts` import `beat.ts`、`content.ts` 就是这样）。
- **动画是帧的纯函数**：不用 `useState`、`Math.random()`、`Date`；随机用 `hash`、`noise1`。运动模糊会传入小数帧，所有曲线都要对小数帧成立。
- `out/` 在 `.gitignore` 里，成片要用 `git add -f out/<名字>.mp4`，和 wav、新下载的字体一起提交。单个文件要小于 100 MB（北海片 38 MB）。

## 做新片的流程

1. **先问清楚再开工。** JIN 的需求常常只有一句，而且 JIN 说过“说话可能抽象，请先问完整意思”。用选择题问三项：做成什么（代码动画成片／AI 视频提示词包／两者结合）、画幅和时长、画面文字的语言。
2. **画面里的事实都要有来源。** 数字、专名、史实，每一条都查到出处并记进案例；查不到就不写数字，或者先问 JIN。
3. **先定节拍网格和时间表，再做画面。** 选每拍是整数帧的 BPM（docs/remotion/动效.md 第 1 节）；重点动作从节拍开始（第 2 节）。
4. **先定标题安全区，再摆道具。** 100 px 的中文标题一行不超过 10 个字；一句话停留的时间要够读完。
5. **自检。** 静帧拼图看 → 改 → 渲整片 → 按帧号抽帧（每 2.5 秒一帧，加上转场中间的帧）再看；能写自检脚本就照 IntroFree 写。
6. **声音 Claude 听不到，只能量。** ebur128 量响度、频谱图找嘶声，交付时要说明配乐没有人听过。
7. **交付。** lint → 渲染 → 抽帧检查 → 提交推送 → 把成片发给 JIN，说清楚哪些没核验。
8. **记案例、补经验。** 在 `docs/cases/<日期>-<名字>/case.md` 记一份（JIN 的原话和选择、画面事实、决策、事实来源、自检改了什么、证据分级、缺口）；新学到的做法按条补进 docs/remotion，标出处。JIN 给了反馈就追加，不改旧记录。

## 案例

- [2026-10-22 槟城北海 60 秒宣传片](docs/cases/2026-10-22-butterworth-promo-60s/case.md)：已交付，JIN 还没评价成片。
- IntroFree 的经验写在 docs/remotion，没有单独的案例记录；Intro、IntroV2 没有记录。
