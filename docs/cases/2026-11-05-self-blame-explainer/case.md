# 心理科普短片「为什么被责怪时先怀疑自己」（Remotion 代码动画，92.8 秒，中英双语）：JIN 定了题目和讲法，其余由 Claude 决定；在 JIN 的 Windows 电脑上本地完成；已交付，JIN 未评价

## 案例状态

- 日期：2026-11-05（UTC+8），在 JIN 的 Windows 11 电脑上本地完成，不是云端容器。会话的工作目录 `C:\Users\weoiq\Desktop\remotion` 不是 git 仓库，本机也没有这个仓库，所以 Claude 在 22:08 把 `weoiquan-art/JIN-motion-` 克隆到 `C:\Users\weoiq\Desktop\remotion\JIN-motion-`，22:27 开了新分支 `claude/self-blame-explainer`，23:21 渲出最终版。
- 类型：心理科普短片，16:9，92.8 秒（2,784 帧，30 帧／秒）。画面、字幕、配乐全部由代码生成；另外混进了 7 条 Freesound 的真实音效（全部 CC0）。**不经过视频生成模型**，没有提示词和参考图。
- 成片：`C:\Users\weoiq\Desktop\remotion\JIN-motion-\out\self-blame.mp4`，本仓库 [`out/self-blame.mp4`](../../../out/self-blame.mp4)（照 CLAUDE.md 用 `git add -f` 提交）。1920×1080，30 帧／秒，H.264（yuvj420p，和 IntroFree、北海片一样是 Remotion 的默认输出）；AAC 48 kHz 立体声；92.8 秒；19,974,602 字节（约 20 MB）。本页另存[每 2.5 秒一帧的联系表](contact-sheet-every-2.5s.jpg)和[转场帧](transitions.jpg)。
- 创作者反馈：**未提供**。
- 声音：Claude 听不到声音，只量了起音位置、响度、峰值和频谱（见“交付前自检”）。**配乐和音效好不好听、音量合不合适，没有人听过。**
- 代码、成片、配乐、音效和本页在提交 74c104a（分支 `claude/self-blame-explainer`，从默认分支 9ff1f4c 开出）；本页补提交号是之后的一个小提交。分支没有推送到 GitHub（JIN 只说“代码提交到新分支”），见“缺口”。

文件指纹（SHA-256）：
- 成片 `out/self-blame.mp4` `bcf46b9536541a525f1ca5349d422921b114be8abb77a2d6b4bdeac612439e6f`
- 配乐 `public/audio/self-blame.wav` `0f800199d31359092bc1204655e26d9db09a15586972620f04a69546ae514f2e`
- 时间表 `src/self-blame/timeline.ts` `b9d4bce8275bfa0339f932ae7d50b4eec0d6382dc816ea2f4934d5ce7c31ac01`
- 文字 `src/self-blame/content.ts` `0c44be82b843a294c55328c9a2d4cfc9ac2ef72f6332ddaf21c844fbd048f7ec`
- [contact-sheet-every-2.5s.jpg](contact-sheet-every-2.5s.jpg) `84428504fa14d84ad8da381e19a0681e117a53775ee2ece9184fe1ad6786f50c`
- [transitions.jpg](transitions.jpg) `43f085216f06c2e552b082c5468881b8b008db5b32728bd820ea00be3bd9940b`

## 原始输入（原话）

> 请用 Remotion 在本仓库做一支心理科普短片,16:9 横屏(1920×1080,30fps),约 90 秒。
>
> 题目:为什么你每次被责怪时,总是先怀疑自己,接着误认为自己不值得被爱?
>
> 已定下的:
> - 讲法:科普解释 + 一点建议。先讲清楚为什么会这样(成长经历、依恋模式、自动化的自责想法等),最后给 1–2 条小而具体的做法。
> - 画面文字:中英双语(中文和英文字幕都放)。
> - 画面全部用代码做,不用别人的图片;背景音乐用脚本合成,不用别人的歌。
> - 音效可以用 sound 技能去 Freesound 找真实音效:优先 CC0,CC-BY 的要在片尾署名,下载的文件放进 public/ 并记下来源。
> 其余(叙事结构、风格、色调、镜头、转场、配乐、字幕怎么排)全部由你决定,不用问我,直接做。
>
> 对内容的要求:
> - 心理学说法每一条都要查到出处(论文或权威机构),记进案例;查不到就不写,或者改成"有些人……"这样的说法。
> - 不诊断、不下结论,不要说"你一定是……",也不要承诺能治好。
> - 语气温和。片尾加一句:如果这种感受很重或持续很久,可以找心理咨询师聊聊。
>
> 注意:这是在我本机(Windows)跑,仓库 CLAUDE.md 里的命令是云端容器写的,不能照搬:
> - 渲染用 `npx remotion render`,浏览器用 Remotion 自带的;不要用 /opt/pw-browsers 那些路径和 render:cloud。
> - 字体仍然只用 public/fonts 里的本地文件,画面上新加的字要照仓库规矩写进文字常量再下载。
> - 其余规矩(动画是帧的纯函数、每片一个时间表等)照常遵守。
>
> 交付:成片放 out/ 目录,告诉我完整路径;代码提交到新分支;案例记录照仓库 CLAUDE.md 的要求写。

CLAUDE.md 的流程第 1 步是“先用选择题问三项”。这次三项（做成代码动画成片、16:9 约 90 秒、中英双语）JIN 都已经写明，又说了“不用问我，直接做”，所以 Claude 没有问问题。

## 本机环境：和 CLAUDE.md 的云端命令不一样的地方

- **仓库从哪来**：本机没有这个仓库，Claude 克隆了 GitHub 上的 `weoiquan-art/JIN-motion-`，从默认分支 `claude/remotion-project-setup-8myjua`（提交 9ff1f4c，JIN 合并的 PenangBridge）开新分支。没有用更新的 `claude/jinmyaigc-promo`（上面有 sound 技能、JinmyPromo，还没并入默认分支），新分支里没有那两样东西。
- **sound 技能**：用的是本机 `C:\Users\weoiq\Desktop\remotion\Remotion经验\外部技能\sound\scripts\sfx.py`，没有装进 `~/.claude/skills`。在 Windows 上要先设 `PYTHONUTF8=1`，否则写搜索缓存时报编码错误；本机只有 `python`，没有 `python3`。下载的是 HQ 预览 mp3（原始文件要 Freesound API key 和 OAuth）。
- **渲染**：`npx remotion render src/index.ts SelfBlame out/self-blame.mp4 --codec=h264`。第一次用时 Remotion 自己下载了 Chrome Headless Shell 149（约 113 MB，约 2 分钟），之后整片 2,784 帧约 1 分 50 秒（12 核，默认并发）。
- **静帧**：`scripts/stills.mjs` 从 jinmyaigc 分支拿过来，只改了一处：没设 `REMOTION_BROWSER` 时用 Remotion 自带的浏览器（原来默认是云端 `/opt/pw-browsers` 的路径）。
- **npm 脚本**：Windows 的 cmd 不认 `NODE_USE_ENV_PROXY=1 node …` 这种写法，新加的 `fonts:self-blame` 等脚本都没有这个前缀（本机直连 Google 字体，不需要代理）。
- **字体**：`npm run fonts:self-blame` 下载 Noto Sans SC 17 片、Noto Serif SC 8 片，其中只有 3 个文件是新的，其余仓库里已有。

## 成片里有什么（按时间）

依据：成片本身和[联系表](contact-sheet-every-2.5s.jpg)。下面是画面上的事实，“为什么这样做”放在下一节。底部字幕都是中文一行、英文一行，有出处的再加一行小字（作者, 年份）。

| 秒 | 画面 | 画面上的字 |
| --- | --- | --- |
| 0–9.6 | 夜色里，一个米色的圆形小角色拿着蓝色杯子。1.6 秒杯子落地摔碎；2.4 秒一个红框对话框砸进来，角色一缩；4.0 秒、5.6 秒头上先后冒出两个念头泡泡，角色慢慢变灰、变小，胸口的小红心变暗。9.2–9.6 秒静音半拍 | 怎么又出错了？ Wrong again? ／ 是我不好…… It's my fault… ／ 我是不是不值得被爱？ Am I not worth loving? |
| 9.6–16 | 镜头拉远，题目三行逐行出现，下面是变小变灰的角色和碎杯子 | 为什么你每次被责怪时，／总是先怀疑自己，／接着误认为自己不值得被爱？＋英文一行 |
| 16–28.8 | 镜头甩到一张图：被责怪 → ① 碎杯子 → 虚线箭头 → ② 灰色的角色。19.2 秒琥珀色虚线圈只圈住杯子，标“内疚 Guilt”；20.8 秒灰色淹没整个角色，标“羞耻 Shame”；24 秒角色缩小 | ① 我做错了一件事 ／ ② 我是个不好的人；字幕：前者是内疚，针对一件事；后者是羞耻，针对整个人。／羞耻会让人觉得自己渺小、没有价值。 |
| 28.8–38.4 | 原因一·成长经历：高个子的家长和小孩。30.4 秒成绩卡“100”，一颗心从家长飞到小孩；32 秒变成“60”，心飞回去，家长把眼睛移开，小孩变灰 | 左上角：几种可能的原因·不一定都适用于你；1/3 成长经历。字幕：为什么会这样？有些人小时候，爱好像要看表现。／研究发现，他们失败后更容易羞耻、看低自己。 |
| 38.4–48 | 原因二·依恋模式：小孩两次呼唤（白色波纹，小孩往上一伸）。第一次，家长的心发出一道暖光；第二次，家长已经转开。41.6 秒小孩头上出现一直在晃的卡片。43.2 秒镜头移到“长大以后”：别人说“……”，主角周围一圈琥珀色波纹、一惊，心里冒出虚线框 | 我值得被爱吗？ Am I worth loving? ／ …… ／ 你不要我了？ You don't want me? 字幕：依恋理论认为：早年被怎样回应，会影响人怎么看自己。／担心被拒绝的人，更容易在模糊的言行里看到拒绝。 |
| 48–60.8 | 原因三·自动冒出的念头：四个念头按八分音符从头上弹出；52 秒两个念头下面贴上标签，另外两个变淡；56.8 秒念头淡出，镜头往下沉，根须连到一个发光的圆 | 都怪我／我就是不行／又搞砸了／我总是这样（各带英文）；个人化·坏事都算到自己头上；贴标签·一件事，定义整个人；核心信念：我不可爱 I'm unlovable |
| 60.8–70.4 | 小练习一：纸卡上的“我真差劲”，61.6 秒被铅笔划掉（纸卡一震），62.4 秒写上“这件事我没做好”；64 秒灰色从角色身上飘到碎杯子上；64.8 秒碎片拼回去，裂缝补上金线 | 字幕：把“我真差劲”，换成“这件事我没做好”。／研究发现：内疚让人想弥补，羞耻让人想躲起来。 |
| 70.4–80 | 小练习二：青绿色的朋友打翻了杯子；72 秒主角对朋友说话；73.6 秒中间出现一道“镜子”，朋友变成主角自己的颜色，那句话绕回主角身上；75.2 秒两个都亮起来、笑了 | 没关系，收拾一下就好。 It's okay. Let's clean it up. 字幕：像安慰犯错的朋友那样，对自己说一句话。／实验发现：犯错后善待自己，人反而更想弥补、改进。 |
| 80–92.8 | 天亮：主角拿着补好的杯子站在地平线上，太阳在身后慢慢升起；86.4 秒起出现参考资料；91.2 秒起淡出到黑 | 被责怪，说的是一件事，不是你整个人。／如果这种感受很重或持续很久，可以找心理咨询师聊聊。／参考资料（9 条）／本片为科普，不能替代专业诊断或治疗。／Sound effects: Freesound.org (CC0) |

- 段落之间是横向甩镜头（一拍 24 帧，带运动模糊），见[转场帧](transitions.jpg)。背景颜色随镜头位置从深夜蓝慢慢变到紫色，再到结尾的黎明粉橙。

## 制作决策（Claude 自定，JIN 没有审过）

- **结构**：一个具体的小场景开头（杯子摔碎、被说一句、心里先冒出两句话）→ 题目 → 把题目里的“两步”拆开（内疚 vs 羞耻）→ 三种可能的原因 → 两个小练习 → 天亮收尾。三个原因就是 JIN 列的“成长经历、依恋模式、自动化的自责想法”。
- **一个贯穿全片的道具：摔碎的杯子**。它是“做错的那一件事”：在“两步”里代表内疚针对的对象，在小练习一里被金线补好，结尾主角拿着它。补金线是画面上的比喻，片中没有把它说成心理学说法。
- **角色**：一个没有性别、没有年龄特征的圆形小角色，胸口一颗心代表“觉得自己值得被爱”；羞耻 = 灰色淹没整个身体，内疚 = 只在杯子上画一个琥珀色的圈。没有人脸照片，没有任何真实人物。
- **措辞**：说法都用“有些人”“研究发现”“依恋理论认为”“可能”，不说“你就是……”；原因前面标“几种可能的原因·不一定都适用于你”；两个练习只说是“小练习”，没有说能治好什么。片尾除了 JIN 要求的咨询师那句，Claude 另加了一行小字“本片为科普，不能替代专业诊断或治疗”。
- **出处直接放在画面上**：每条有心理学说法的字幕下面一行小字写“作者, 年份”，片尾列参考资料，方便观众自己查。
- **字体**：题目、纸卡上的字、核心信念、结尾那句话用 Noto Serif SC（宋体，更“温和”），其余中文用 Noto Sans SC，英文和数字都用 Inter。
- **节拍**：75 BPM（一拍正好 24 帧，也是安静时的心跳速度），全片 29 小节，每一段都从小节线开始。字幕的停留时间按每秒 4–5 个字排（最紧的几条约每秒 5 个字）。
- **配乐**：D 小调讲原因，练习段转到 F 大调。开头是低沉的铺底和心跳；题目段是钢琴和弦加三下铃声；“两步”起有柔和的钢琴琶音、贝斯和很轻的底鼓；原因一加八音盒；原因二心跳回来；原因三用十六分音符的沙锤像“停不下来的念头”，下沉时只剩低音；练习段更亮，有沙锤和小旋律；结尾是钢琴、风铃和很轻的鸟叫。片名前静音半拍。
- **真实音效**（全部 CC0，清单和来源在 [public/self-blame/sfx/SOURCES.md](../../../public/self-blame/sfx/SOURCES.md)）：杯子摔碎、镜头移动的 whoosh、念头泡泡的 pop、铅笔划线、风铃、清晨鸟叫。都按量出来的起音位置对在拍点帧上。

## 画面里的心理学说法与出处

“怎么核对的”一栏写的是 Claude 实际读到了什么：PubMed 的摘要是用 E-utilities 接口读的原文；“全文”指读了论文正文（PMC 网页或 PDF 转出的文字）；没有读原书。

| 画面上的话 | 出处 | 出处里的原话或要点 | 怎么核对的 | 保留和说明 |
| --- | --- | --- | --- | --- |
| 前者是内疚，针对一件事；后者是羞耻，针对整个人。 | Tangney, J. P., Stuewig, J., & Mashek, D. J. (2007). Moral emotions and moral behavior. *Annual Review of Psychology*, 58, 345–372. doi:10.1146/annurev.psych.56.091103.070145 | “shame involves a negative evaluation of the global self; guilt involves a negative evaluation of a specific behavior” | 全文（PMC3083636，WebFetch 摘出原句） | 这个区分在综述里归到 Lewis（1971）等更早的工作 |
| 羞耻会让人觉得自己渺小、没有价值。 | 同上 | 羞耻常伴随“a sense of shrinking or of ‘being small’”和“a sense of worthlessness and powerlessness” | 同上 | 用“会让人觉得”，没有说一定 |
| 为什么会这样？有些人小时候，爱好像要看表现。 | Assor, A., Roth, G., & Deci, E. L. (2004). The emotional costs of parents' conditional regard. *Journal of Personality*, 72(1), 47–88. doi:10.1111/j.0022-3506.2004.00256.x | “parental conditional regard”：孩子表现符合期望时给更多关爱 | PubMed 摘要 | 用“有些人”“好像” |
| 研究发现，他们失败后更容易羞耻、看低自己。 | Assor, A., & Tal, K. (2012). When parents' affection depends on child's achievement. *Journal of Adolescence*, 35(2), 249–260. doi:10.1016/j.adolescence.2011.10.004；Assor, Roth & Deci (2004) | 153 名青少年：觉得母亲用有条件的关爱督促学业的，“self devaluation and shame following failure”更多；2004 年的大学生样本：有条件的关爱和“fluctuations in self-esteem”、“perceived parental disapproval”相关 | PubMed 摘要 | 都是相关研究（自评问卷，以色列样本），不是因果；片中“他们”指上一句的“有些人” |
| 依恋理论认为：早年被怎样回应，会影响人怎么看自己。 | Pietromonaco, P. R., & Feldman Barrett, L. (2000). The internal working models concept. *Review of General Psychology*, 4(2), 155–175（引 Bowlby, 1973, p. 203） | 照顾者及时、可靠回应的孩子“are assumed to develop a representation of the self as acceptable and worthwhile”；回应不一致或不回应的，“are assumed to develop a view of self as unacceptable and unworthy” | 全文（PDF 转文字） | 原文是“are assumed”（理论假设），所以片中写“依恋理论认为”；Bowlby 1973 原书没有读，只读了这篇综述的引用 |
| 担心被拒绝的人，更容易在模糊的言行里看到拒绝。 | Downey, G., & Feldman, S. I. (1996). Implications of rejection sensitivity for intimate relationships. *JPSP*, 70(6), 1327–1343. doi:10.1037/0022-3514.70.6.1327 | “people who anxiously expect rejection readily perceive intentional rejection in the ambiguous behavior of others” | PubMed 摘要 | “拒绝敏感”和“依恋焦虑”是相关但不同的概念；放在“依恋模式”这一段是 Claude 的编排 |
| 有些念头会自己冒出来，快得来不及检查。（左上角“自动冒出的念头 Automatic thoughts”） | Beck, A. T. (2008). The evolution of the cognitive model of depression and its neurobiological correlates. *American Journal of Psychiatry*, 165(8), 969–977；NHS Every Mind Matters, “Reframing unhelpful thoughts” | Beck：认知模型逐步纳入了“automatic thoughts, cognitive distortions, dysfunctional beliefs”；NHS：我们常常意识不到自己在用没帮助的方式想，要先“catch it” | Beck 是 PubMed 摘要；NHS 是网页（WebFetch） | 没有找到逐字定义“自动思维”的免费权威原文；“快得来不及检查”是对 NHS 那句话的转述 |
| 认知行为疗法里，这叫“个人化”和“贴标签”。（标签：坏事都算到自己头上／一件事，定义整个人） | Royal National Orthopaedic Hospital NHS Trust 临床健康心理科，“Unhelpful Thinking Styles”（2026-03-10 更新）；NHS Every Mind Matters 同上 | Personalisation：“when we assume that things we see, hear, or experience are about us or caused by us”，会让人“blaming ourselves for things that are not fully in our control”；Labelling：“give ourselves or others a negative label based on the outcome of one small event”；NHS 列的没帮助的想法之一：“considering yourself the sole cause of negative situations” | 网页（WebFetch） | 这是 NHS 医院的病人手册，不是论文 |
| 背后，有时藏着更深的信念：“我不可爱”。 | Osmo, F., et al. (2018). The Negative Core Beliefs Inventory. *Journal of Cognitive Psychotherapy*, 32(1), 67–84. doi:10.1891/0889-8391.32.1.67 | 关于自己的负面核心信念可以分成 helplessness、“unlovability”、worthlessness；量表分数和童年负面经历、依恋类型、焦虑、抑郁相关 | PubMed 摘要 | 用“有时”；Judith Beck 关于三类核心信念的原书没有读到 |
| 把“我真差劲”，换成“这件事我没做好”。 | NHS Every Mind Matters, “Reframing unhelpful thoughts” | “catch it, check it, change it”，把想法换成中性的说法；页面也写了“This will not resolve the problems you face” | 网页 | 只说“小练习”，不说能解决问题 |
| 研究发现：内疚让人想弥补，羞耻让人想躲起来。 | Tangney et al. (2007) | 内疚“corresponds with reparative actions including confessions, apologies”；羞耻“corresponds with attempts to deny, hide, or escape” | 全文 | |
| 像安慰犯错的朋友那样，对自己说一句话。 | NHS Every Mind Matters（同上）；Greater Good in Action（UC Berkeley Greater Good Science Center），“How Would You Treat a Friend?”（改编自 Kristin Neff） | NHS 的检查问题之一：“What would you say to a friend if they were thinking this way?”；GGIA 的练习：想想朋友难受时你怎么对 TA，再那样对自己 | 网页（WebFetch） | |
| 实验发现：犯错后善待自己，人反而更想弥补、改进。 | Breines, J. G., & Chen, S. (2012). Self-compassion increases self-improvement motivation. *PSPB*, 38(9), 1133–1143. doi:10.1177/0146167212445599 | 四个实验：自我关怀组“reported greater motivation to make amends and avoid repeating a recent moral transgression”，失败后花更多时间准备考试 | PubMed 摘要 | 实验室里的短期效果，被试是大学生 |
| 被责怪，说的是一件事，不是你整个人。 | （Claude 的总结句，基于 Tangney 等的内疚／羞耻区分） | | | 这是收尾的说法，不是研究结论 |
| 如果这种感受很重或持续很久，可以找心理咨询师聊聊。 | JIN 要求的原句 | | | |

查了但**没有放进片子**的：
- Bartholomew & Horowitz（1991）的四类依恋：只找到二手介绍，没有读到原文。
- Crocker & Wolfe（2001）“自我价值的条件性”、Park、Crocker & Mickelson（2004）依恋和自我价值：读了摘要，为了让片子短，没有用。
- APA Dictionary of Psychology 的词条：网站是前端渲染，WebFetch 和 curl 都读不到正文，没有引用。
- 画面上没有写任何百分比或人数。

## 交付前自检：Claude 看静帧和量化检查发现的问题（JIN 没看过中间版本）

先渲关键帧拼图看（`node scripts/stills.mjs`），再渲整片跑 `npm run check:self-blame`，最后按帧号每 2.5 秒抽一帧，加上转场中间的帧。

| 看到的问题 | 改法 |
| --- | --- |
| 开头“怎么又出错了？”和第二个念头泡泡重叠 | 两个对话框左右拉开 |
| “两步”那张图太小，偏上 | 卡片放大、整体下移 |
| 原因一：家长“不理”的样子是闭眼微笑，看起来像很满足 | 新加一种表情：眼睛移到一边、嘴是一条直线、没有腮红 |
| 原因二：“小时候”和“长大以后”两半挨得太近，一半的角色和对话框露在另一半的画面边上 | 两半拉开到 1,400 px |
| 原因二：问题卡片下面的小天平看不懂 | 去掉天平，改成卡片一直轻轻晃 |
| 小练习二时，画面右边已经露出结尾天空的一块硬边色块 | 结尾天空改成横向渐隐的椭圆光，结尾站点再往后挪 |
| 甩镜头时文字是一格一格的叠影 | 运动模糊在移动开始后的 14 帧里用 16／12／6 个采样 |
| 镜头下沉到“核心信念”时，顶上淡掉的念头泡泡和左上角标签叠在一起 | 下沉时念头和标签淡出 |
| 结尾参考资料折成三行，最后一行只剩一个词 | 加宽 |
| 声音：第一次量 WAV，9 个重点动作的起音强度低于 6 dB（铃声余音、沙锤把“前 15 ms”的能量抬高了） | 钢琴加 2–3 ms 的击弦噪声；whoosh 的最响点挪到拍点后 2 帧；较安静的动作加一个轻的木鱼“嗒”；铃声缩短 |
| 声音：开头比中间还响（-13 LUFS），整体 -13.5 LUFS | 心跳调轻；总电平降到 -15.3 LUFS、峰值 -1.5 dBFS |
| 画面：17 个重点动作在 160×90 平均帧差里检不出来（都是小元素） | 自检加“变化面积”指标（320×180 下变化超过 6 个灰阶的像素数） |
| 画面：灰色淹没、灰色退去、打翻、镜子这 4 处用的是慢起慢停的曲线，最大变化不在拍点那一帧 | 改成从拍点立刻起速的 whip 曲线 |
| 画面：呼唤的波纹第一帧太小、后面越来越大；警觉波纹拖得太长，盖住下一拍的动作；划线第一帧太细；朋友的手臂晚 4 帧才放开 | 波纹第一帧就大、亮，越扩越淡，寿命缩到 14 帧；划线加粗、6 帧画完、纸卡在拍点一震；手臂在拍点放开、朋友一惊 |
| 画面：镜头移动要 30 帧才停稳，下一拍的小动作落在还在动的画面上 | 站点之间的移动缩到 24 帧（正好一拍） |

最终版自检结果（`npm run check:self-blame`，成片 out/self-blame.mp4）：
- 削波：采样峰值、4 倍过采样真峰值都是 -1.50 dBFS，没有满幅采样。
- 静音：只有计划内的两段（片名前 9.2–9.6 秒；片尾最后 0.12 秒淡出到无声）。
- 每段响度（K 加权、不加门限）：开头 -15.5、片名 -14.8、两步 -14.3、原因一 -16.2、原因二 -14.8、原因三 -15.0、练习一 -15.9、练习二 -14.8、结尾 -17.8 LUFS；ffmpeg ebur128 量整体 -15.3 LUFS，响度范围 4.4 LU。
- 47 个重点动作：声音起点和拍点最大差 0.15 帧（5 ms）；画面变化都在拍点那一帧或后一帧（“杯子补好”是 +1 帧，其余 +0）。
- 盲测：45 个起音点都在 32 分音符网格上（最大偏离 1.5 ms）；9 次大的画面跳变（都是镜头移动）都有声音对应。
- 频谱图：10 kHz 以上除了杯子碎裂和铃声的泛音以外没有嘶声。
- 没解决的：运动模糊叠加时，大的径向光晕会出现一点彩色环纹，每次转场约 5 帧（见[转场帧](transitions.jpg)里 38.5 秒、48.1 秒、70.5 秒那几格）。

这些都是 Claude 看静帧和量化检查得出的。整片放起来顺不顺、字幕够不够时间读，没有人从头看过。

## 技术记录（这次的做法，单次）

- Remotion 4.0.532，Windows 11 本地渲染；整片约 1 分 50 秒。代码约 3,300 行（含配乐和自检脚本）。
- 代码：[`src/self-blame/`](../../../src/self-blame/)（`beat.ts` 节拍、`content.ts` 全部文字、`timeline.ts` 时间表、`scenes/` 各段画面），配乐 [`scripts/gen-audio-self-blame.ts`](../../../scripts/gen-audio-self-blame.ts)，自检 [`scripts/check-self-blame.ts`](../../../scripts/check-self-blame.ts)（从 IntroFree 的自检改来），字体 [`scripts/fetch-fonts-self-blame.ts`](../../../scripts/fetch-fonts-self-blame.ts)，静帧 [`scripts/stills.mjs`](../../../scripts/stills.mjs)。
- 世界是一条横向长卷，每段一个站点，摄像机在站点之间甩过去（`timeline.ts` 的 `ST`、`CAMERA`）；字幕和左上角标签在屏幕空间，不跟镜头动。
- 真实音效在配乐脚本里用 ffmpeg 解码成 PCM，再按“文件里第几秒是起音”放到拍点帧上（`sfx(name, frame, gain, { align })`）。这些录音内部有自己的小起音（碎片、笔画、鸟叫），自检的盲测把这些区间（`timeline.ts` 的 `RECORDED`）单独计数，不算错。
- 加声音会消耗配乐脚本里确定性随机数的序列，后面所有用噪声的声音都会跟着变；起音强度在门槛边上（5–7 dB）的动作会来回翻转，要留余量。
- 新加的经验已按条补进 [docs/remotion/](../../remotion/README.md)，标“（自责科普片）”。

## 证据与推断分级

### 可直接确认
- JIN 的原话（上面）。
- 成片规格、文件指纹、画面上的字（成片本身、联系表）。
- 照做了的硬要求：16:9、1920×1080、30 帧／秒、92.8 秒；中英双语；画面全是代码画的；配乐是脚本合成的；音效全部 CC0、来源记在 SOURCES.md；片尾有咨询师那句话；渲染用 `npx remotion render` 和 Remotion 自带浏览器；字体只用 public/fonts 的本地文件；新分支 `claude/self-blame-explainer` 上有提交。
- 上表每条出处 Claude 读到的内容（摘要或全文，见“怎么核对的”）；七个音效页面的授权（都是 CC0）。
- 自检脚本的数字。

### Claude 的观察和判断（JIN 没有确认）
- “成片里有什么”的画面描述。
- 自检发现的问题以及“改完就好了”的判断。
- 结构、角色、杯子比喻、配乐和措辞的选择理由。
- 把拒绝敏感的研究放在“依恋模式”这一段。

### 未核验
- JIN 和任何观众对成片的看法；画面是否“温和”。
- 配乐和音效好不好听、音量平衡对不对（没有人听过）。
- 字幕在实际观看时够不够时间读完（只按每秒 4–5 个字估算）。
- Bowlby（1973）原书、Judith Beck 关于核心信念的原书没有读；APA 词典没有读到。
- 片中说法是否适合所有文化背景的观众：引用的研究大多是以色列、美国的样本。

## 不能说的

- 不能说这支片子有效、能帮人走出自责：没有任何观众数据，练习部分也没有说能治好。
- 不能说“被责怪时怀疑自己”就是这三种原因造成的：片中写的是“几种可能的原因”，研究多数是相关研究。
- 不能说配乐好听：Claude 只量了响度、起音和频谱。
- 不能把“甩镜头 + 小角色 + 道具贯穿”说成心理科普片的模板：只做过一次，也没有反馈。

## 下次可以先试的做法（候选，单次）

1. 心理、健康类题材：每条说法先查到论文或权威机构再写进 `content.ts`，出处直接写在字幕下面一行（作者, 年份），片尾列参考资料；措辞用“有些人／研究发现／理论认为”。
2. 用 PubMed 的 E-utilities（`efetch.fcgi?db=pubmed&id=…&rettype=abstract&retmode=text`）读摘要，比打开网页快，也不会被 cookie 页挡住。
3. 真实音效先量出“起音在文件第几秒”，放的时候让那一刻落在拍点帧上；whoosh 的最响点放在拍点后 2 帧，拍点本身留给和弦或鼓的清楚起音。
4. 自检除了 160×90 的平均帧差，再算 320×180 的“变化面积”：小元素（一个圈、一行字）在平均帧差里看不出来。
5. 站点之间的镜头移动不要长过一拍，否则下一拍的小动作会落在还在动的画面上。

## 缺口（待问 JIN）

- 对成片的看法：画面、节奏、字幕长度、配乐、说法有没有不妥。
- 要不要推送：分支 `claude/self-blame-explainer` 只在本机提交，没有推到 GitHub。CLAUDE.md 的交付流程写的是“提交推送”，但 JIN 这次只说“代码提交到新分支”，推送是对外的操作，所以先问。
- 要不要把这个分支和 `claude/jinmyaigc-promo`（sound 技能、JinmyPromo）合起来，或者合进默认分支。
- 用途和发布平台：要不要 9:16 竖屏版、要不要配音。
- 片尾要不要加“JIN 制作”之类的署名（这次没加）。

JIN 给了反馈以后再更新本页，不覆盖上面的记录。
