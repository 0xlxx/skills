---
name: modern-web-layout
description: 现代 Web 布局实操（源自《现代 Web 布局》24/27/28 章）——内在尺寸与内容驱动（内驱式）改造、容器查询（container queries）、组件驱动式响应式（component-driven）。用于把设计稿测出的固定宽高改成内容驱动、让同一组件适配不同容器宽度或多语言文案长度、给组件加容器查询或排查 @container 不生效、评审响应式布局的内容溢出与截断。
---

<core-principle>
**内容决定尺寸，设计只给约束。**（下面说的「内驱」都是这个意思：让内容驱动布局，而不是让设计稿驱动。）

设计稿量出来的 `width: 230px` 是候选值，不是事实：数据长度、语言、容器宽度都会变，固定尺寸只在内容恰好等于设计稿时正确。改造的目标不是把所有东西改成 `max-content`，而是把测量值翻译成约束（下限 / 上限 / 首选最大值），并让容器宽度先能变化。

最先失效的往往是语言：同一套导航，中文 6 个两字标签占 323px，英文（Traffic / Subscriptions / Quick Start）占 508px，约 1.6 倍。按中文量出来的尺寸在英文下会把品牌区挤扁甚至压没。
</core-principle>

<decision>
先判断「变化来自哪里」，再选工具 —— 不要一律加 `@media`：

| 变化来源 | 用什么 |
|---|---|
| 内容本身（长度、数量、图片尺寸） | 内在尺寸：`min-content` / `max-content` / `fit-content`、`minmax()`、`fit-content(<length>)` |
| 同一视口下组件的可用宽度不同 | 容器查询 `@container`（媒体查询只知道视口，不知道组件实际宽度） |
| 可用宽度连续变化、不需要断点 | 容器查询单位 `cqi` + `clamp()`；或 RAM：`repeat(auto-fit, minmax(min(100% - 2rem, 320px), 1fr))` |
| 用户系统偏好（减少动效、深色、对比度、低数据） | 用户偏好媒体查询 |
| 设备外形（折叠屏、双屏） | 外形媒体查询，并单独做兼容性验证 |

尺寸问题优先用 Flex 换行与内在尺寸解决；只有组件需要按**自身容器**宽度切换结构时，才上容器查询。
</decision>

<workflow>
改造按 [reference/intrinsic-sizing.md](reference/intrinsic-sizing.md) 的 8 步走。其中两条先做，因为它们决定后面所有判断：

1. **先用最长目标语言的真实文案做极值**，不要用当前语言顺手测。完成判据：切到英文（或最长的目标语言）时，文字完整、不被压扁、不重叠。
2. **盘点固定尺寸**：`width` / `height` / `flex-basis` / Grid 轨道里来自设计稿测量值的位置。完成判据：每个固定值都有「必须固定」或「可改为约束」的结论。
</workflow>

<acceptance>
验收线（都可直接检查）：

- 容器缩到 320px：无横向滚动，无标签被截断成半截字。
- 切到最长目标语言：菜单/按钮文字完整，不互相挤压，品牌区不被压缩。
- 不存在「按某种语言或某台设备量出来」的固定尺寸；仅固定尺寸资源（Logo、图标）可以继续写死。
- 内容变长变多时，布局按规则换行或收缩 —— 而不是新增一个断点。
</acceptance>

<reference>
按需查阅（不必全读，命中哪条读哪条）：

- [reference/intrinsic-sizing.md](reference/intrinsic-sizing.md) —— `min-content` / `max-content` / `fit-content` 的语义与选用、Flex / Grid 如何按内容计算、8 步改造流程、常见反例对照、图片与 Grid 轨道坑。**要把固定宽高改成内容驱动，或排查内容溢出 / 异常断行 / 无意义留白 / 标签截断时读。**
- [reference/container-queries.md](reference/container-queries.md) —— 查询容器声明、`container-type` 与 `@container` 语法清单、容器查询单位、与媒体查询的分工、12 条排查清单、polyfill 与渐进增强。**要给组件加容器查询、判断媒体查询 vs 容器查询、排查 `@container` 不生效时读。**
- [reference/component-driven.md](reference/component-driven.md) —— 组件驱动式响应的分类法（RAM / 媒体查询 / 容器查询 / 用户偏好 / 外形查询）、卡片案例数值、多语言文案实测、组件反模式与边界。**组件要同时适配窄卡片与宽主栏、要按自身容器而非视口自适应、或要适配不同语言长度时读。**
</reference>

<related>
- 速查「内在设计七条」用 `intrinsic-design` skill；本 skill 是它的深水区与实操（容器查询、组件驱动、改造流程、坑），需要动手改造时再进来。
- 三个参考文件标注了原文未覆盖的点（`container-type` 的百分比副作用与元素限制、精确的 `@supports` 回退写法、完整兼容性矩阵等）。遇到这些缺口查 MDN / 规范，不要从本 skill 推断。
</related>
