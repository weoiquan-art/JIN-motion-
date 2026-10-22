# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Welcome to your Remotion project!

## Commands

**Install Dependencies**

```console
npm i --loglevel=error
```

**Start Preview**

```console
npm run dev
```

**Render video**

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## IntroFree（自我介绍短片）

所有画面和音乐都由代码生成，不使用 `public/` 里的图片、视频或 logo。字体沿用 `public/fonts/` 里的 Noto Sans SC。

- 文字：全部在 `src/content.ts`
- 节拍：`src/intro-free/beat.ts`（112.5 BPM，每拍 16 帧），画面和配乐共用
- 时间表：`src/intro-free/timeline.ts`（每个重点动作落在哪一拍）

```console
npm run fonts:free         # 改了文字后：下载新汉字需要的字体切片
npm run audio:free         # 重新合成配乐 public/audio/intro-free.wav
npm run render:intro-free  # 渲染 out/intro-free.mp4
npm run check:intro-free   # 自检：节拍对齐、削波、静音段、每段响度
```

经验总结：[docs/remotion/动效.md](docs/remotion/动效.md)、[docs/remotion/动画.md](docs/remotion/动画.md)

## Butterworth（槟城北海宣传片）

60 秒、16:9。画面、字幕和配乐都由代码生成；地图海岸线来自 Natural Earth（公有领域）。

- 时间轴和文字：`src/butterworth/timeline.ts`（100 BPM，每拍 18 帧；换场景在小节线上），画面和配乐共用
- 场景：`src/butterworth/world/scenes/`
- 案例记录：[docs/cases/2026-10-22-butterworth-promo-60s/case.md](docs/cases/2026-10-22-butterworth-promo-60s/case.md)

```console
npm run fonts               # 改了文字后：下载新汉字需要的字体切片（Intro、IntroV2、Butterworth 共用）
npm run audio:bw            # 重新合成配乐 public/audio/butterworth.wav
npm run render:butterworth  # 渲染 out/butterworth.mp4
```

经验总结和 IntroFree 共用同一套：[docs/remotion/](docs/remotion/README.md)。给 Claude 的仓库说明在 [CLAUDE.md](CLAUDE.md)。

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
