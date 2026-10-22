# Remotion 经验

从这个仓库的 IntroFree（`src/intro-free/`）里总结出来的经验，分两份：

- [动效.md](./动效.md)：镜头、转场、运动模糊、节拍同步、声画对齐、整体节奏——**一个镜头/一段画面怎么"动"起来**
- [动画.md](./动画.md)：曲线、弹簧、打字、挤压拉伸、像素字、图层拆分——**单个元素怎么动**

每条都写了：做法、为什么、踩过的坑。代码片段可以直接对照 `src/intro-free/` 里的实现。

## 通用（两边都用得到）

**字体**
- 云端渲染浏览器访问不了 fonts.gstatic.com，字体要放 `public/fonts/`，用 `@remotion/fonts` 的 `loadFont()`。它自带 `delayRender()`，字体没加载完不会出帧；文件缺失会直接报错，不会悄悄换成系统字体。
- Noto Sans SC 按 unicode-range 切成约 100 片，只下载文案用到的切片（`npm run fonts:free`）。改了文案要重新跑。
- 中文主、英文副：字体栈写成 `"Inter", "Noto Sans SC"`——拉丁字母走 Inter，汉字和全角标点落到 Noto。

**渲染与查看**
- 渲染：`npm run render:cloud -- <CompositionId> out/xxx.mp4 --codec=h264 --concurrency=4`
- 开发时别每次渲整片：用 `@remotion/bundler` 打包一次，再用 `@remotion/renderer` 的 `renderStill` 连出多帧，拼成一张对照图看。比 `remotion still` 一帧一帧快很多。
- 成片抽帧：`ffmpeg -i out.mp4 -vf "select=eq(n\,FRAME)" -vframes 1 kFRAME.png`（按帧号精确抽，不要用 `-ss` 秒数，会差一帧）。

**文案**
- 所有会变的字放一个没有 import 的 `src/content.ts`，画面、配乐脚本、字体脚本都能直接读。
- 中文阅读速度按每秒 4–5 个字估；一句话在屏幕上停留的时间要够读完，"节奏太快"的感觉多半来自这里，而不是 BPM。
