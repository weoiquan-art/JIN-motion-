# Remotion 经验

从这个仓库的 IntroFree（`src/intro-free/`）和北海宣传片 Butterworth（`src/butterworth/`）里总结出来的经验，分两份；北海片补的条目都标了“（北海片）”：

- [动效.md](./动效.md)：镜头、转场、运动模糊、节拍同步、声画对齐、整体节奏——**一个镜头/一段画面怎么"动"起来**
- [动画.md](./动画.md)：曲线、弹簧、打字、挤压拉伸、像素字、图层拆分——**单个元素怎么动**

每条都写了：做法、为什么、踩过的坑。代码片段可以直接对照 `src/intro-free/`、`src/butterworth/` 里的实现。北海片的完整案例记录（JIN 原话、决策、事实来源、证据分级、缺口）在 [docs/cases/2026-10-22-butterworth-promo-60s/case.md](../cases/2026-10-22-butterworth-promo-60s/case.md)。

## 通用（两边都用得到）

**开工前**（北海片）
- JIN 的需求常常只有一句（北海片：“帮我做一个槟城北海的宣传片 所有元素你定”），JIN 也说过“说话可能抽象，请先问完整意思”。先用选择题问三项：做成什么（代码动画成片／AI 视频提示词包／两者结合）、画幅和时长、画面文字的语言。北海那次推荐的是 9:16 竖屏 30 秒，JIN 选了 16:9 横屏 60 秒，默认值不一定猜得对。
- 画面里写出来的数字、专名、史实都要查到来源并记进案例；查不到就不写数字，或者先问 JIN。北海片的“第二大桥 24 km”是凭记忆写的，就是反例。

**字体**
- 云端渲染浏览器访问不了 fonts.gstatic.com，字体要放 `public/fonts/`，用 `@remotion/fonts` 的 `loadFont()`。它自带 `delayRender()`，字体没加载完不会出帧；文件缺失会直接报错，不会悄悄换成系统字体。
- Noto Sans SC 按 unicode-range 切成约 100 片，只下载文案用到的切片（`npm run fonts:free`）。改了文案要重新跑。
- 中文主、英文副：字体栈写成 `"Inter", "Noto Sans SC"`——拉丁字母走 Inter，汉字和全角标点落到 Noto。
- （北海片）标题用 Noto Serif SC，标签用 Noto Sans SC，英文用 Inter。两种中文字体都照 IntroV2 的做法去掉 ASCII 区段（`withoutAscii`），英文和数字一定走 Inter，“，”“——”这类全角标点仍由中文字体画。Intro、IntroV2、Butterworth 的切片用 `npm run fonts` 下载，IntroFree 用 `npm run fonts:free`。
- （北海片）坑：画面上的字没写进 `ALL_TEXT*`，对应的切片根本不会注册，这个字会悄悄落到系统字体或显示成方框，不会报错。改了文案（北海片中途改过渡轮标题）就要重跑下载。

**渲染与查看**
- 渲染：`npm run render:cloud -- <CompositionId> out/xxx.mp4 --codec=h264 --concurrency=4`
- 开发时别每次渲整片：用 `@remotion/bundler` 打包一次，再用 `@remotion/renderer` 的 `renderStill` 连出多帧，拼成一张对照图看。比 `remotion still` 一帧一帧快很多。
- 成片抽帧：`ffmpeg -i out.mp4 -vf "select=eq(n\,FRAME)" -vframes 1 kFRAME.png`（按帧号精确抽，不要用 `-ss` 秒数，会差一帧）。
- （北海片）用的是 `npx remotion still` 一帧一帧渲，每次都要重新打包，慢；下次照上面的 `renderStill` 做法。拼图用 Python（PIL），每格写上时间和帧号，回头对得上。
- （北海片）1920×1080、1,800 帧的扁平插画整片渲染约 3 分钟；运动模糊（6 次采样）只开在甩镜头那二十来帧。

**文案**
- 所有会变的字放一个没有 import 的 `src/content.ts`，画面、配乐脚本、字体脚本都能直接读。
- 中文阅读速度按每秒 4–5 个字估；一句话在屏幕上停留的时间要够读完，"节奏太快"的感觉多半来自这里，而不是 BPM。
- （北海片）先定标题安全区，再摆道具。北海片的标题在左下，前后有 5 处道具压到标题（码头浮球、猫和桌凳、单车和盆栽、香炉、渡轮），都是看静帧才发现的。
- （北海片）100 px 的中文标题一行不超过 10 个字。“1894 年至今，渡轮往返两岸”一行约 1,250 px，改成“百年渡轮，往返两岸”，数字放进英文副标题。
