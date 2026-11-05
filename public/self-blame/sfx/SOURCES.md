# SelfBlame 用到的真实音效（Freesound，全部 CC0）

2026-11-05 在 JIN 的电脑上用 sound 技能（`Remotion经验/外部技能/sound/scripts/sfx.py`）搜索、下载。
下载的是 Freesound 的 HQ 预览 mp3（原始文件要 API key + OAuth，没有设置）。
全部是 CC0（公有领域贡献），可以商用、改动、再分发，不需要署名；片尾仍写了一行 “Sound effects: Freesound.org (CC0)”。
没有用 CC-BY 或 BY-NC 的音效。

选择依据：sound 技能的规则——下载量和评分人数优先，读上传者的描述判断录音来源；下载后用 ffmpeg 量了时长、起音位置、尾巴长度和能量分布（量法见案例记录）。Claude 听不到声音，这些音效没有人试听过。

| 文件 | Freesound | 作者 | 授权 | 下载量 / 评分（2026-11-05） | 时长 | 在片中的用法 |
| --- | --- | --- | --- | --- | --- | --- |
| `fs_524999_ceramic-cup-shatters-on-tile-floor.mp3` | [524999 ceramic cup shatters on tile floor](https://freesound.org/people/geraldfiebig/sounds/524999/) | geraldfiebig | CC0 | ↓3968 ★4.9(61) | 6.0 s | 开头杯子落地。文件 0.175 s 处的起音对在第 2 拍（帧 48）；只用 0.15–1.6 s，120 Hz 高通、11 kHz 低通 |
| `fs_701104_Whoosh-stereo-light-transition.mp3` | [701104 Whoosh stereo light (transition)](https://freesound.org/people/xkeril/sounds/701104/) | xkeril | CC0 | ↓3217 ★4.6(58) | 2.3 s | 每次镜头移动。文件 0.48 s 最响，对在拍点后 2 帧；只用 0.2–1.4 s，9 kHz 低通 |
| `fs_411462_Bubble-Pop.mp3` | [411462 Bubble Pop](https://freesound.org/people/TheBuilder15/sounds/411462/) | TheBuilder15 | CC0 | ↓3312 ★4.6(31) | 0.6 s | 两个念头泡泡出现。文件 0.17 s 的起音对在拍点 |
| `fs_439186_Pop-5-ogg.mp3` | [439186 Pop 5.ogg](https://freesound.org/people/FourthWoods/sounds/439186/) | FourthWoods | CC0 | ↓3029 ★4.6(36) | 0.1 s | 原因三里四个念头弹出。文件 0.03 s 的起音对在拍点 |
| `fs_211247_Scribble.mp3` | [211247 Scribble](https://freesound.org/people/Tomoyo%20Ichijouji/sounds/211247/) | Tomoyo Ichijouji | CC0 | ↓10324 ★4.7(102) | 1.2 s | 小练习一划掉“我真差劲”。只用 0.42–0.9 s（笔画最密的一段），900 Hz 高通 |
| `fs_398496_wind-chimes-single-04-wav.mp3` | [398496 wind chimes - single 04.wav](https://freesound.org/people/Anthousai/sounds/398496/) | Anthousai | CC0 | ↓1993 ★4.8(50) | 4.0 s | 小练习二“心亮起来”、结尾那句话出现。400 Hz 高通 |
| `fs_608154_Open-window-and-birds-singing-in-the-mor.mp3` | [608154 Open window and birds singing in the morning.wav](https://freesound.org/people/Geri92/sounds/608154/) | Geri92 | CC0 | ↓4606 ★4.4(42) | 50.1 s | 结尾天亮时的鸟叫，很轻。从文件第 5 s 开始用（前 3 s 是开窗声），350 Hz 高通、9 kHz 低通 |

下载了但没有用、已删掉：583310 Tile Breaking（Fission9，CC0，0.7 s，比杯子摔碎短）、169855 Wind Chime (G-003)（GnoteSoundz，CC0，能量 92% 在 10 kHz 以上，太尖）。

作者名和授权先来自 Freesound 搜索结果页（sfx.py 抓取），之后逐个打开了上表的七个音效页面：都能打开（HTTP 200），页面上的授权都是 Creative Commons 0（链接到 creativecommons.org/publicdomain/zero/1.0/）。
