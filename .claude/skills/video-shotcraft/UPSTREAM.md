# 来源与取舍

- 上游:https://github.com/Vincentwei1021/video-shotcraft (Apache-2.0,见 LICENSE),取自提交 43bd349(2026-10-17)。
- 这里只放技能说明(SKILL.md)、镜头配方卡和流程文档(references/)、agents/、可复用组件(assets/lib/)。
- 没放进来的(体积大,需要时再从上游取):assets/audio(音效和配乐,约 36 MB)、demos/、gallery/、template/、workbench/、publish/、shot-polish/。
- 所以 SKILL.md 里提到的 `template/`、`demos/`、`gallery/` 在这里不存在。**本仓库只把它当镜头配方库用**:读 references/shots/ 里的镜头卡选运镜和转场写法,不走它的"产品宣传片"全流程(那一套面向网页截图,和槟城科普题材不同)。
- 要用完整版:`npx skills add Vincentwei1021/video-shotcraft`。
