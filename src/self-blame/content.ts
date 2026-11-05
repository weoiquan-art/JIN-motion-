// SelfBlame 片中所有会出现在画面上的文字（中英双语）都在这里。
//
// 改完文字之后：
//   1. npm run fonts:self-blame   下载新汉字需要的 Noto Sans SC / Noto Serif SC 字体切片
//   2. npm run audio:self-blame   （改了打字的句子时）让打字声对上新的字
//   3. npm run render:self-blame  重新渲染 out/self-blame.mp4
//   4. npm run check:self-blame   自检节拍、削波、静音
//
// 每句话落在哪一拍由 src/self-blame/timeline.ts 决定，与文字长度无关；
// 字幕在屏幕上停留的时间按每秒 4–5 个汉字估过，改长了要同时改时间表。
// 心理学说法的出处见 docs/cases/2026-11-05-self-blame-explainer/case.md，
// 每条字幕下面的小字（cite）就是它的出处。
// 这个文件不能有 import：配乐脚本和字体脚本也直接读取它。

export type Line = { zh: string; en: string; cite?: string };

export const CONTENT = {
  // 0–9.6 s 钩子：杯子摔碎 → 被责怪 → 心里先冒出来的两句话
  hook: {
    blame: { zh: "怎么又出错了？", en: "Wrong again?" },
    think1: { zh: "是我不好……", en: "It's my fault…" },
    think2: { zh: "我是不是不值得被爱？", en: "Am I not worth loving?" },
  },

  // 9.6–16 s 片名（JIN 给的题目原文）
  title: {
    zh: ["为什么你每次被责怪时，", "总是先怀疑自己，", "接着误认为自己不值得被爱？"],
    en: "Why do you doubt yourself first whenever you're blamed — and then wrongly feel unworthy of love?",
  },

  // 16–28.8 s 拆成两步：内疚（针对一件事） vs 羞耻（针对整个人）
  steps: {
    event: { zh: "被责怪", en: "Blamed" },
    one: { zh: "我做错了一件事", en: "I did something wrong" },
    two: { zh: "我是个不好的人", en: "I am bad" },
    guilt: { zh: "内疚", en: "Guilt" },
    shame: { zh: "羞耻", en: "Shame" },
    capA: {
      zh: "前者是内疚，针对一件事；后者是羞耻，针对整个人。",
      en: "The first is guilt — about one act. The second is shame — about your whole self.",
      cite: "Tangney, Stuewig & Mashek, 2007",
    },
    capB: {
      zh: "羞耻会让人觉得自己渺小、没有价值。",
      en: "Shame can make you feel small and worthless.",
      cite: "Tangney, Stuewig & Mashek, 2007",
    },
  },

  // 28.8–60.8 s 三种可能的原因（不一定都适用）
  reasons: {
    note: { zh: "几种可能的原因 · 不一定都适用于你", en: "Possible reasons · not all may fit you" },
    r1: {
      chip: { zh: "成长经历", en: "Growing up" },
      cap1: {
        zh: "为什么会这样？有些人小时候，爱好像要看表现。",
        en: "Why? For some people, love in childhood seemed to depend on how well they did.",
      },
      cap2: {
        zh: "研究发现，他们失败后更容易羞耻、看低自己。",
        en: "Studies find they tend to feel more shame and think less of themselves after failure.",
        cite: "Assor & Tal, 2012 · Assor, Roth & Deci, 2004",
      },
      good: "100",
      bad: "60",
    },
    r2: {
      chip: { zh: "依恋模式", en: "Attachment" },
      cap1: {
        zh: "依恋理论认为：早年被怎样回应，会影响人怎么看自己。",
        en: "Attachment theory holds that how we were responded to early on shapes how we see ourselves.",
        cite: "Bowlby, 1973 · Pietromonaco & Feldman Barrett, 2000",
      },
      model: { zh: "我值得被爱吗？", en: "Am I worth loving?" },
      cap2: {
        zh: "担心被拒绝的人，更容易在模糊的言行里看到拒绝。",
        en: "People who anxiously expect rejection more readily see it in ambiguous words and actions.",
        cite: "Downey & Feldman, 1996",
      },
      vague: "……",
      heard: { zh: "你不要我了？", en: "You don't want me?" },
    },
    r3: {
      chip: { zh: "自动冒出的念头", en: "Automatic thoughts" },
      cap1: {
        zh: "有些念头会自己冒出来，快得来不及检查。",
        en: "Some thoughts pop up on their own — too fast to check.",
        cite: "Beck, 2008 · NHS Every Mind Matters",
      },
      thoughts: [
        { zh: "都怪我", en: "It's all my fault" },
        { zh: "我就是不行", en: "I'm just no good" },
        { zh: "又搞砸了", en: "Messed up again" },
        { zh: "我总是这样", en: "I'm always like this" },
      ],
      cap2: {
        zh: "认知行为疗法里，这叫“个人化”和“贴标签”。",
        en: "In CBT, these are called “personalisation” and “labelling”.",
        cite: "RNOH NHS Trust · NHS Every Mind Matters",
      },
      personal: { zh: "个人化 · 坏事都算到自己头上", en: "Personalisation · it's all on me" },
      label: { zh: "贴标签 · 一件事，定义整个人", en: "Labelling · one event = who I am" },
      cap3: {
        zh: "背后，有时藏着更深的信念：“我不可爱”。",
        en: "Underneath, there may be a deeper belief: “I'm unlovable.”",
        cite: "Osmo et al., 2018",
      },
      core: { zh: "我不可爱", en: "I'm unlovable" },
      coreTag: { zh: "核心信念", en: "Core belief" },
    },
  },

  // 60.8–80 s 两个小练习
  practice: {
    p1: {
      chip: { zh: "小练习一", en: "Practice 1" },
      before: { zh: "我真差劲", en: "I'm hopeless" },
      after: { zh: "这件事我没做好", en: "I didn't do this one well" },
      cap1: {
        zh: "把“我真差劲”，换成“这件事我没做好”。",
        en: "Swap “I'm hopeless” for “I didn't do this one well.”",
        cite: "NHS Every Mind Matters",
      },
      cap2: {
        zh: "研究发现：内疚让人想弥补，羞耻让人想躲起来。",
        en: "Research: guilt moves us to repair; shame makes us want to hide.",
        cite: "Tangney, Stuewig & Mashek, 2007",
      },
    },
    p2: {
      chip: { zh: "小练习二", en: "Practice 2" },
      cap1: {
        zh: "像安慰犯错的朋友那样，对自己说一句话。",
        en: "Talk to yourself the way you'd comfort a friend who made a mistake.",
        cite: "NHS Every Mind Matters · Greater Good Science Center",
      },
      comfort: { zh: "没关系，收拾一下就好。", en: "It's okay. Let's clean it up." },
      cap2: {
        zh: "实验发现：犯错后善待自己，人反而更想弥补、改进。",
        en: "Experiments find that self-kindness after a mistake can make people more motivated to make amends and improve.",
        cite: "Breines & Chen, 2012",
      },
    },
  },

  // 80–92.8 s 结尾
  ending: {
    line: { zh: "被责怪，说的是一件事，不是你整个人。", en: "Blame is about one thing — not all of you." },
    help: {
      zh: "如果这种感受很重或持续很久，可以找心理咨询师聊聊。",
      en: "If these feelings are heavy or last a long time, consider talking with a counselor.",
    },
    refsTitle: { zh: "参考资料", en: "References" },
    refs: [
      "Tangney, Stuewig & Mashek (2007) Annu Rev Psychol 58",
      "Assor, Roth & Deci (2004) J Pers 72",
      "Assor & Tal (2012) J Adolesc 35",
      "Pietromonaco & Feldman Barrett (2000) Rev Gen Psychol 4",
      "Downey & Feldman (1996) JPSP 70",
      "Beck (2008) Am J Psychiatry 165",
      "Osmo et al. (2018) J Cogn Psychother 32",
      "Breines & Chen (2012) PSPB 38",
      "NHS Every Mind Matters · RNOH NHS Trust · Greater Good Science Center (UC Berkeley)",
    ],
    sfx: "Sound effects: Freesound.org (CC0)",
    disclaimer: { zh: "本片为科普，不能替代专业诊断或治疗。", en: "For general education only — not a diagnosis or treatment." },
  },
};
