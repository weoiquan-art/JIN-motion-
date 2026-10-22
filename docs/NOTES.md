# PenangBridge 经验复盘（2026-10-22，云端无人值守完成）

槟城大桥（第一大桥）历史科普短片。Remotion 代码动画加照片，1920×1080、30 帧／秒、62.9 秒（1,887 帧）。分镜见 [STORYBOARD.md](STORYBOARD.md)。

- 代码：`src/penang/`；在 `src/Root.tsx` 注册为 `PenangBridge`（默认 props 写在注册处，Studio 里改完会写回这里）
- 拍点数据：`public/data/penang-bgm.json`（生成脚本 `scripts/penang/analyze-bgm.py`）
- 自检脚本：`scripts/penang/check-sync.py`（卡点）、`scripts/penang/stills.mjs`（批量出静帧）
- 照片、BGM、成片都没进 git（`.gitignore`）

## 1. 做了什么

1. **找回提示词。** 会话开头那段完整提示词一开始没显示在我这边，我先用选择题问了 4 项，你选了：照片直接入片、16:9、约 60 秒、中文为主加英文地名，并说“我只锁主题与音频卡点，其他你发挥”。之后我从会话记录里翻到了原提示词，你也重发了一遍，后面都按它做。
2. **装官方 skill**：`npx remotion skills add`，装进 `.agents/skills/`，`.claude/skills/` 里是软链接。代码按 skill 的规矩写，偏离的地方列在第 3 节。
3. **素材**：你在对话里分 3 批、每批 5 张发了 15 张图，我按批次顺序命名成 a1–a5、b1–b5、c1–c5。没收到 zip 和 IMAGES.md，也没收到 `_hold` 里那 3 张暂缓图。BGM 用的是你上传的 mp3（3:12.8）。
4. **分析 BGM**：拍点、小节线、重音、段落、能量曲线，见第 2 节。
5. **写分镜**：动手前写了 STORYBOARD.md（时间 | 小节·拍 | 内容 | 镜头）。
6. **做片子**：18 个镜头（15 张照片加 3 个代码画面）、18 条字幕、3 个章节签、右上角年份。缺的两张图用代码画面补：
   - “1985 年那一刻”：S9 合龙动画，两段桥面在重拍上接上
   - “工业区航拍”：S13，在 OSM 地图上用光标出北海港口、Perai 工业区和往南的峇六拜
7. **自检**：静帧拼图看了三轮、改了三轮；540p 整片做卡点量化检查，查出并修掉了音轨整体晚 19 ms 的问题；然后渲 1080p，720p 从 1080p 缩出来，再抽帧看一遍，另存一份每拍带 click 的 720p。结果见第 8 节。

## 2. 卡点怎么做的

**分析**（`npm run analyze:penang`，librosa 1.0.0）：

| 项目 | 结果 | 你粗测的 |
| --- | --- | --- |
| 速度 | 112.79 BPM，一拍 0.5319 秒，一小节 2.128 秒 | 约 112.8 BPM，0.53 秒，2.13 秒 |
| 第一拍 | 0.401 秒 | 约 0.41 秒 |
| 小节线 | 第一拍就是小节第 1 拍（4 个相位里得分最高的是相位 0：1.39，其余都是负的） | 没把握 |
| 段落 | 0:17.4 进满能量；1:25.5–1:42.5 回落；1:42.5 再起；2:14.19 全曲最强一记；2:46 起变弱，3:03.6 音乐结束 | 0:17、1:25–1:42、1:42、2:14、2:51、3:04 |
| 3:03.6 之后 | 判为静音，不出拍点；3:10 那声收尾不算 | 一致 |

**做法**：

1. 先用 librosa 默认设置（sr 22050、hop 512）找拍。
2. 把每一拍挪到最近的鼓点起音上。起音用两种方法互相对照：
   - 时域：700 Hz 高通后，取“后 2 ms 能量 ÷ 前 15 ms 能量”的峰值
   - 高分辨率 onset：hop 128、n_fft 1024
3. 歌没有变速，所以用一条直线 `t = 0.4014 + k × 0.531947` 拟合全部拍点：345 拍里有 332 拍误差在 25 ms 以内，误差中位数 4.0 ms。
4. 起音会围着这条直线缓慢漂移（-10 到 +6 ms），每一拍再按前后 17 拍的起音中位数修正。JSON 里的 `beats` 是修正后的，`beatsLine` 是直线。

**默认设置偏晚多少**：

- librosa 默认拍点比起音晚 37 ms（中位数）。
- 高分辨率 onset 的峰比起音晚 12 ms。所以默认拍点比 onset 峰晚 25 ms，和你测的“偏晚约 18 ms”同一方向，大小差一点：参照点不同。
- 我把画面对在**起音**上。观众听到的“拍”比起音晚几毫秒，画面略早于声音，看起来更紧。
- 修正后，在成片音轨上量起音减网格：中位数 -0.4 ms（第 8 节）。

**用哪一段**：第 40–67 小节（1:25.4–2:25.1），中间不剪。

- 开头是“回落”段，和前奏同一套和声（色度相似度 0.99），听起来像一段前奏。
- 17.1 秒进入第二段满能量（drop）。
- 48.8 秒正好是 2:14 那记最强重音，放“槟城大桥”标题和全片最大的光。
- 59.7 秒落在第 68 小节的重拍上，切黑接署名，音乐 2 秒淡出。

**画面怎么对拍**：

- 镜头、字幕、光晕的时间都写成“片内第几拍”（第 n 小节 = 4n），由 `src/penang/beats.ts` 换算成帧。代码里没有手填的帧数。
- 改 `music.startBar`、`music.bars` 或换 BGM 重新分析，所有时间跟着变。
- 硬切落在离拍点最近的帧；滑入、砸字、推镜都用仓库里的 whip 曲线：节拍前一帧不动，节拍那一帧变化最大。
- 光效强度 = 这一帧的响度（JSON 里 30 帧／秒的能量曲线）× 这一拍的重音强度，所以回落段弱、满能量段强。
- 大光晕自动放在 JSON 检测到的强重音上（片内 3.30、5.43、9.69、17.13、48.79 秒）；另外手动加了合龙（第 60 拍）和片尾（第 108 拍）两处。
- 音乐用 `Html5Audio` 放，不用 skill 推荐的 `@remotion/media` 的 `<Audio>`，原因见第 3 节。

## 3. 踩的坑和解法

| 坑 | 解法 |
| --- | --- |
| 会话开头的提示词没显示在我这边，我以为你只发了图和音乐 | 先用选择题问了 4 项，再从会话记录（list_events）里翻到原文；以后先查会话记录，再问 |
| 维基百科、NST、AARoads、penang-traveltips 直连被云端网络策略挡住（403） | 改用搜索结果里的摘要核对事实，来源链接记在第 6 节；证据等级比直接读原文低。要放开的话，在这个云环境的设置里把这些域名加进 Allowed domains（[文档](https://code.claude.com/docs/en/cloud-environments#network-access)） |
| librosa 1.0 的函数只接受关键字参数 | 按新签名写 |
| `--scale=0.6667` 出 720p 报错：高度 720.000000036 不是整数 | 720p 改成从 1080p 用 ffmpeg lanczos 缩（`npm run render:penang-720`）；自检片用 `--scale=0.5` |
| 官方 skill 是 4.0.537 版，里面的 `<Track>` 在本仓库的 4.0.532 里没有 | 不升级（会牵动其他几条片子），用带名字的 `<Sequence>` 代替 |
| skill 推荐的光效 `@remotion/effects`（lightLeak 等）要 WebGL，`<HtmlInCanvasMotionBlur>` 要 Chrome 149 以上加实验开关；云端没有 GPU，浏览器是 141 版 headless shell | 漏光、光晕、光条用 CSS 渐变叠加（screen）；甩镜头的运动模糊用 SVG 方向高斯模糊 |
| 甩镜头用 8 份、14 份叠加做模糊都是一格一格的重影：一帧要移动上千像素 | 改成 `feGaussianBlur`，只沿运动方向模糊，强度约为这一帧位移的 0.32 |
| 模糊强度一开始按“前后各半帧”的速度算，拍点前一帧就先糊了（帧差在拍点前一帧就跳） | 改成上一帧到这一帧的位移，拍点前一帧保持清楚 |
| **量化检查发现成片音轨比拍点网格整体晚约 19 ms**（听不出来，量出来的） | 对照实验：同一段，ffmpeg 直接切 mp3 是 -8.9 ms，`Html5Audio` 渲出来 -9.3 ms，`@remotion/media` 的 `<Audio>` 渲出来 +16.0 ms，多出的 25 ms 正好是 mp3 的编码延迟（1105 个采样）没被跳过。改用 `Html5Audio`，删掉 `@remotion/media` 依赖 |
| 剩下的 -9 ms 是拟合直线在这一段的局部偏差 | 分析脚本加了局部漂移校正 |
| 原曲这一段真峰值 +2.5 dBFS、响度约 -9 LUFS，渲出来 +0.7 dBTP，播放时可能削波 | 默认音量 0.7（约 -3 dB）：成片 -12.3 LUFS、真峰值 -2.4 dBFS |
| 片尾署名淡入晚、字小，完全看清只有不到 2 秒 | 重拍后 2 帧就开始淡入，尾巴从 2.4 秒加到 3.2 秒，字号 30／34 px |
| 用 `pkill -f "remotion render"` 停渲染，把正在执行这条命令的 shell 自己也杀了（命令行里也有这串字） | 用任务管理停后台任务，不用 `pkill -f` 匹配自己命令里出现的字 |
| OSM 地图底色太浅，叠上去的航线和大桥光线看不见 | 地图整体正片叠底一层深蓝（0.55），光线加粗、加暖色外发光 |
| 示意地图上陆地和海颜色太接近 | 陆地调亮、海调暗 |
| 重音光晕带一层全屏泛白，整个画面发灰 | 全屏泛白从 0.28 降到 0.1，光晕半径收小 |
| 三张相片压到左下标题 | 挪到右边、缩小一点 |
| React 的 style 里 `scale: 1.1` 会被补成 `1.1px` | `scale`、`rotate`、`translate` 一律写成字符串 |
| `Array.prototype.findLastIndex` 不在 tsconfig 的 ES2015 库里 | 自己写了一个 `lastIndexWhere` |
| 原来的字体规矩是“画面文字写进常量再下载”，但 Studio 改的文字会写回 `Root.tsx` | `npm run fonts:penang` 直接扫描 `src/Root.tsx` 和 `src/penang/` 里的所有字。合成里还有检查：props 里出现字体没有的字就直接报错，提示先跑下载，不会悄悄变成系统字体 |
| `remotion-dev/skills` 仓库没有许可证文件 | skill 本身不提交（`.gitignore`），只提交 `skills-lock.json`；本地重新装即可 |

## 4. 没做到的事

- **旁白和配音**：云端做不了 AI 配音，也不是硬要求。信息全靠字幕。
- **IMAGES.md 和暂缓图**：没收到。每张图的来源不清楚，片尾只能写“其他照片来自网络，版权归原作者”。拿到出处后在 Studio 的 `credits` 里改。
- **“1985 年那一刻”和“工业区航拍”两张照片**：没有，用代码画面补了（S9 合龙、S13 地图）。没有下载新素材。
- **声音没人听过**：我听不到声音，只量了起音位置和响度。click 预览的“听感”要你来确认。
- **整片观感**：只看过静帧和抽帧，没有人从头到尾看过。

## 5. 不确定的事实（画面上怎么写的）

| 画面上 | 来源怎么说 | 我的处理 |
| --- | --- | --- |
| 1985 年通车 | 有的说 1985 年 8 月 3 日通车，有的说 9 月 14 日正式启用 | 按你的要求只写年份 |
| 1982 年动工 | 多个来源都写 1982 年（AARoads：1982 年 4 月 12 日） | 只写年份 |
| 1985 年桥面合龙 | travel 网站和 AARoads：1985 年 4 月最后一段桥面接上 | 只写年份；合龙动画是示意，不是照着施工图画的 |
| 主跨 225 米 | AARoads／维基百科的资料框写 225 米 | 写 225 米 |
| 全长 13.5 公里 | 维基百科、AARoads 都写 13.5 公里（海上部分约 8.4 公里） | 写全长 13.5 公里 |
| 中间三跨是斜拉桥 | TRID（TRRL 报告）摘要：三个斜拉的中央跨 | 写“中间三跨，用斜拉索吊起” |
| 1960 年代末失去自由港地位 | 多数来源写 1969 年 | 按你的要求写“1960 年代末”；右上角年份写“1960s” |
| 1972 年峇六拜自由工业区设立 | 维基百科：第一期 1972 年开张；UNIDO 文件：自由贸易区法令 1972 年 1 月 20 日生效 | 写“1972 年，峇六拜自由工业区设立” |
| 通车前几天，数千人先上桥走了一趟 | NST：正式启用前几天开放市民上桥步行，来了好几千人 | 配在 b1（黑白，人群走在桥上）上。**照片是不是那一天拍的没有核实**，图文对应是推断 |
| 大多数车辆改走大桥 | 维基百科“Penang ferry service”：大桥通车后多数过海车辆改走大桥 | 写成这样 |
| 每天数万辆车 | Malay Mail 2017：每天 8 万多辆；2009 年的工程论文：最多每天 10 万辆 | 不写具体数字，写“数万辆” |
| 码头越来越挤 | Aliran 的声明：大桥本来是要缓解渡轮需求和码头拥挤（倡议团体，不是中立来源） | 写“码头越来越挤”，不写数字 |
| 1894 年起有渡轮 | 维基百科“Penang ferry service”：1894 年 Quah Beng Kee 兄弟创办 | 写“1894 年起，渡轮往返两岸” |
| 渡轮还在开 | 维基百科：现在是 4 艘双体客船。老的车客渡轮 2020 年底停航（也有来源说 2018 年） | 写“渡轮还在开”。配图 c3、b5 是老式渡轮，拍摄年份未知 |
| 1986 年起有大桥马拉松 | 槟城州政府的马拉松官网、The Star 都写 1986 年。维基百科把源头追到 1982 年的路跑 | 写“1986 年起” |
| 地图上的峇六拜位置 | 示意：机场东边。代码画面里的海岸线来自北海片用的 Natural Earth 数据 | 示意，不是测绘 |

**没有写的**：施工死亡人数；1786 年开埠（片子没讲到这段，没写）；“桥曾因晚宴封闭”；第二大桥；造价（RM 8 亿左右，各来源说法不一）；承建商（韩国现代建设和 UEM）。

## 6. 素材和来源

**图片**（按你发图的顺序命名；你本地的文件名可能不同，见第 7 节）：

| 文件 | 内容 | 用在 |
| --- | --- | --- |
| a1.png 564×390 | 施工中的大桥，斜拉索已挂上，塔顶有塔吊 | S7 |
| a2.webp 640×640 | 黄色渡轮 P. RAWA | S3 |
| a3.webp 1080×1349 | 从塔顶俯拍桥面车流 | S11 |
| a4.webp 720×480 | 黄昏的桥面，车流和晚霞 | S17 片尾 |
| a5.png 640×438 | 施工中：一座主塔，桥面向两边悬臂伸出 | S6 |
| b1.png 488×628 | 黑白：人群在桥上步行 | S10 |
| b2.png 679×452 | 桥上的马拉松 | S15 |
| b3.png 480×640 | 落日卡在两座塔之间 | S14 |
| b4.png 459×612 | 蓝调时分航拍，车灯光轨 | S12 |
| b5.webp 1600×2000 | 蓝色渡轮 P. TALANG TALANG，**有摄影师水印 SIVAKUMAR，保留原样** | S16b |
| c1.webp 1273×736 | OSM 地图：大桥走向 | S8 |
| c2.png 640×491 | 黑白：渡轮 SENANGIN，甲板上停满汽车 | S2 |
| c3.webp 960×638 | 海边步道看出去：渡轮和远处的大桥 | S16 |
| c4.webp 1062×829 | OSM 地图：乔治市、北海、大桥 | S13 |
| c5.webp 985×683 | OSM 地图：渡轮航线 | S1 |

大部分照片分辨率低（宽 460–720 px），所以多数做成“相片”（`style: "print"`，以接近原尺寸放在自己的模糊底图上），没有满屏硬放大。

**片尾署名**（`credits` 属性，可在 Studio 改）：

- 地图 © OpenStreetMap contributors
- 蓝色渡轮照片 © SIVAKUMAR · The art of seeing
- 其他照片来自网络，版权归原作者
- 音乐版权归原作者 · 个人作品集，非商用

**BGM**：你上传的 mp3。元数据显示是从抖音／TikTok 视频转出来的（`vid:v0300fg10000db210snog65h8k8ufs80`），曲名和作者不知道。

**事实来源**（都是通过搜索结果的摘要核对的，原文页面被网络策略挡住，没有直接读）：

- 维基百科 Penang Bridge：https://en.wikipedia.org/wiki/Penang_Bridge
- AARoads Penang Bridge：https://wiki.aaroads.com/wiki/Penang_Bridge
- NST175 “Rise of the iconic Penang Bridge”：https://www.nst.com.my/news/nation/2020/08/619492/nst175-rise-iconic-penang-bridge
- Carlist（马哈迪开 Proton Saga 过桥）：https://www.carlist.my/news/when-tun-dr-mahathir-drove-a-proton-saga-across-the-newly-built-penang-bridge/64390/
- penang-traveltips Penang Bridge：https://www.penang-traveltips.com/penang-bridge.htm
- TRID“Penang progress hangs on crucial cables”：https://trid.trb.org/View/202456
- anilnetto.com（承建商、造价）：https://anilnetto.com/governance/accountability/penang-bridge-disappointments/
- 维基百科 Bayan Lepas Free Industrial Zone：https://en.wikipedia.org/wiki/Bayan_Lepas_Free_Industrial_Zone
- 维基百科 Penang Development Corporation：https://en.wikipedia.org/wiki/Penang_Development_Corporation
- PBA 历史页（1901–1980）：https://pbahb.com.my/history-water-supply/1901-1980/
- 维基百科 Penang ferry service：https://en.wikipedia.org/wiki/Penang_ferry_service
- Malay Mail 2024（渡轮百年）：https://www.malaymail.com/news/malaysia/2024/07/30/the-journey-of-penangs-iconic-ferries-a-century-old-legacy/145064
- Aliran 声明（渡轮与码头拥挤）：https://m.aliran.com/archives/ms/2001/0802.html
- 槟城大桥国际马拉松官网：https://penangmarathon.gov.my/
- The Star 2024（马拉松 1986 年开始）：https://thestar.com.my/metro/metro-news/2024/09/04/new-milestone-for-penang-run
- Malay Mail 2017（每天 8 万多辆）：https://www.malaymail.com/news/malaysia/2017/08/16/penang-bridge-closes-lanes-for-maintenance-works/1443711
- Structurae（拓宽工程论文、造价）：https://structurae.de/fachliteratur/fachartikel/widening-of-the-penang-bridge-malaysia

## 7. 本地怎么跑起来

1. `npm i`
2. 放素材（这两个文件夹在 `.gitignore` 里）：
   - 图片放进 `public/penang/images/`。代码里的文件名是 `a1.png … c5.webp`（见第 6 节的表）。你 zip 里的文件名如果不同，有两种办法：照表改名；或者在 Studio 的 props 里把每个镜头的 `src` 改成你的文件名。
   - BGM 放成 `public/penang/audio/bgm.mp3`。
3. 装官方 skill（没提交进仓库）：`npx remotion skills add`
4. 预览和调整：`npm run dev`，打开 Studio 里的 `PenangBridge`，右侧 props 面板可以改。
5. 渲染：
   - 云端的命令带了 `--browser-executable=/opt/pw-browsers/...`；本地直接用 `npx remotion render src/index.ts PenangBridge out/penang-bridge.mp4 --codec=h264`
   - 720p：`npm run render:penang-720`（从 1080p 缩）
6. 换 BGM 或想重新分析：装好 librosa 后 `npm run analyze:penang`。要分析的 mp3 路径可以写在命令后面，默认是 `public/penang/audio/bgm.mp3`。
7. 改了画面上的文字：先跑 `npm run fonts:penang`（下载新字的字体切片），否则合成会报“字体里没有这些字”。

**在 Studio 里改什么、怎么改**：

| 想改 | 改哪里 |
| --- | --- |
| 用歌的哪一段、多长 | `music.startBar`（歌的第几小节开始，见 JSON 的 `bars`）、`music.bars`。片长自动重算 |
| 某个镜头早一点、晚一点、长一点 | `shots[i].at`（第几拍开始；第 n 小节 = 4n，可以写 0.5 拍）、`shots[i].beats` |
| 换图 | `shots[i].src` |
| 相片的位置和大小 | `shots[i].print.x / y / height / rotate` |
| 运镜 | `shots[i].from` / `to`。满屏：焦点 %；相片：位移 px，外加缩放 |
| 转场 | `shots[i].enter`：cut / flash / whip / whipUp / leak / zoom / fade / dark |
| 字幕的文字、时间、位置、字号 | `captions[i]` |
| 光效强弱 | `look.flare / pulse / leak / grain / vignette`；`flares` 里加减手动光晕 |
| 分层输出 | `layers.photos / fx / text`。例如只要文字层：关掉另外两层，渲成带透明通道的 ProRes 4444 或 WebM |

拍号和时间对照：第 0 拍 = 0.11 秒，之后每拍 +0.532 秒，每小节（4 拍）+2.128 秒。drop 在第 32 拍（17.13 秒），2:14 那记重音在第 91.5 拍（48.79 秒），最后一个重拍在第 112 拍（59.69 秒）。

## 8. 自查结果

**成片**（直接发文件给你，不进 git）：

| 文件 | 规格 | 大小 | SHA-256 |
| --- | --- | --- | --- |
| `out/penang-bridge.mp4` | 1920×1080，30 帧／秒，H.264（x264 slow, CRF 19），AAC 48 kHz 立体声，62.9 秒 | 见下方“最终文件” | 见下方 |
| `out/penang-bridge-720p.mp4` | 1280×720，从 1080p 原始渲染用 lanczos 缩，CRF 20 | 同上 | 同上 |
| `out/penang-bridge-720p-click.mp4` | 720p，每拍一声 click（小节第 1 拍音高更高），用来听卡点 | 同上 | 同上 |

**卡点**（`scripts/penang/check-sync.py`）：

- 声音：在成片自己的音轨上，找离每一拍最近的起音。113 拍里有 106 拍有清楚的起音，起音减网格中位数 **-0.4 ms**（四分位 -1.0 到 +0.9 ms），没有整体偏移。改之前是 +19 ms，原因见第 3 节。
- 画面：成片缩成 160×90 灰度算帧差。18 个转场里 **17 个的最大跳变正好落在拍点那一帧**。唯一例外是第 80 拍的竖甩：最大跳变在 +2 帧。那一帧刚进场的是暗色模糊底图，帧差小；运动本身从拍点帧开始（拍点帧 18.3，前两帧 6.1）。拍点前一帧有 10.9 的变化，是上一个镜头的字幕在切点前 7 帧内淡出。
- 横甩：拍点前一帧几乎不变（3.0–3.8），拍点帧跳到 36–53。
- 听感：Claude 听不到，**请用 click 版听一下 click 和鼓点是不是同时**。

**画面文字里的事实**（逐条对照第 5 节）：

- 每一条都有来源，只是来源是搜索摘要，原文没打开。
- 按你的要求处理了：通车只写 1985 年；自由港写“1960 年代末”；主跨写 225 米；没写死亡人数；没写 1786 年；没用“晚宴封桥”。
- 有推断成分的两处：b1 是不是通车前那次步行拍的；c3、b5 的渡轮照片是哪年拍的（画面上写的是“渡轮还在开”，指渡轮服务，不指照片里那艘船）。

**署名**：

- 片尾有“地图 © OpenStreetMap contributors”。
- b5 的摄影师水印“SIVAKUMAR The art of seeing”保留在相片左上角（S16b，55.4–57.6 秒），片尾也写了“蓝色渡轮照片 © SIVAKUMAR · The art of seeing”。
- 其余照片没有出处信息，写的是“其他照片来自网络，版权归原作者”；**拿到 IMAGES.md 后要在 `credits` 里补具体来源**。
- 音乐写的是“音乐版权归原作者”，曲名未知。

**声音**：成片 -12.3 LUFS，响度范围 2.4 LU，真峰值 -2.4 dBFS，不削波。最后一个重拍后 2 秒淡出，最后约 1 秒是静音。

**画面**：

- 静帧拼图看了三轮，改掉的问题见第 3 节。
- 成片每 2.5 秒抽一帧，加上 16 个转场或重音的中间帧，又看了一遍。
- 整片连续播放的观感没有人看过。
