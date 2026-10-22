// IntroFree 片中所有会变的文字都在这里。
//
// 改完文字之后：
//   1. npm run fonts:free         下载新汉字需要的 Noto Sans SC 字体切片
//   2. npm run audio:free         （改了打字的三句 name / job / learning 时）让键盘声对上新的字
//   3. npm run render:intro-free  重新渲染 out/intro-free.mp4
//   4. npm run check:intro-free   自检节拍、削波、静音
//
// 每句话落在哪一拍由 src/intro-free/timeline.ts 决定，与文字长度无关。
// 打字的句子按 8 分 / 16 分音符一个字出现，太长会被压进可用的拍子里，
// 所以尽量保持和现在差不多的长度。
// 这个文件不能有 import：配乐脚本和字体脚本也直接读取它。

export const CONTENT = {
  // 0–4s 安静开场：光标打字
  opening: {
    name: "我叫 JIN",
    nameEn: "I'm JIN.",
    job: "主要做 AI 视频生成",
    jobHighlight: "AI 视频生成", // 必须是 job 里的一段
    jobEn: "I make videos with AI.",
  },

  // 4–11s 每天同时做的三件事（三个窗口）
  daily: {
    header: "每天，同时在做三件事",
    headerEn: "THREE THINGS · EVERY DAY · AT ONCE",
    skill: {
      tab: "video-prompt.skill.md",
      title: "改我的视频提示词 skill",
      sub: "每天测试：它能不能听懂我要的工作流",
      code: ["## 工作流", "1. 先读懂我要的情绪"],
      removed: "2. 镜头缓慢推进",
      added: "2. 镜头跟着文字走",
      test: "测试：它听懂了吗？",
      score: "7/10",
    },
    breakdown: {
      tab: "breakdown",
      title: "拆解别人的作品",
      sub: "分析他们是怎么做到的",
      layers: ["光线", "运镜", "提示词"],
      layersEn: ["LIGHT", "CAMERA", "PROMPT"],
      prompt: ["golden hour", "wide shot", "slow dolly-in"],
    },
    app: {
      tab: "my-first-app",
      title: "尝试做 app",
      sub: "边做边学",
      header: "我的工作流",
      cards: ["提示词", "分镜"],
      button: "生成",
    },
  },

  // 11–15s 转折
  turn: {
    nice: "「和 AI 协同工作」",
    niceSub: "说起来，很好听。",
    niceEn: "“Working with AI.” Sounds nice.",
    actually: "其实每天都在",
    squeeze: "挤破脑袋",
    pour: "把想法倒出来",
    squeezeEn: "Every day: squeezing ideas out of my head.",
  },

  // 15–19s 安静：灵感枯竭，真正的问题
  quiet: {
    dry: "做到现在，有点灵感枯竭了。",
    dryEn: "Lately, I'm running a little dry.",
    want: "我真正想弄懂的是：",
    unclear: "一个我自己也说不清的问题",
  },

  // 19–23s 一个「我」字走过两个模型
  chain: {
    me: "我",
    meLabel: "我的语言",
    meLabelEn: "MY WORDS",
    llm: "语言模型",
    llmEn: "LANGUAGE MODEL",
    tokens: ["a", "person", "who", "makes", "AI", "videos", "cinematic"],
    rewrite: "我 → a person",
    rewriteLabel: "被改写",
    video: "视频模型",
    videoEn: "VIDEO MODEL",
    noiseStep: "step 1/30",
    doneStep: "step 30/30",
  },

  // 23–28s 满格
  full: {
    q1: ["AI 怎么理解", "我的语言？"],
    q1En: "HOW DOES AI READ MY WORDS?",
    q2: ["视频模型，", "又怎么理解", "被过滤后的"],
    q2Last: "我？", // 开头的「我」会画成像素字
    q2En: "AND HOW DOES A VIDEO MODEL READ ME, AFTER THE FILTER?",
    wall: [
      "我",
      "a person",
      "U+6211",
      "me",
      "I",
      "wo",
      "prompt",
      "token",
      "noise",
      "step 12/30",
      "attention",
      "seed 4127",
      "cinematic",
      "我的语言",
      "?",
    ],
  },

  // 28–34s 落地 + 片尾
  ending: {
    who: "我是 JIN，",
    learning: "一个还在学习 AI 的人",
    learningHighlight: "还在学习", // 必须是 learning 里的一段
    thanks: "感谢你了解了部分的我",
    credit: "用 Opus 5.5 生成 · Made with Claude Opus 5.5",
  },
};

// 所有会出现在画面上的字（字体脚本用它判断需要哪些 Noto Sans SC 切片）。
// 画面里写死的符号也列在最后。
export const ALL_TEXT_FREE = JSON.stringify(CONTENT) + "0123456789/·:+-#.?";
