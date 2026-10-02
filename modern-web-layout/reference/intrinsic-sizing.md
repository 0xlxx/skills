# 内在尺寸与内容驱动布局参考
## 什么时候读

- 要把设计稿测出的固定 `width` / `height` 改成适配真实数据的布局。
- 要评审响应式布局中的内容溢出、异常断行、无意义留白或标签截断。
- 要选择 `min-content` / `max-content` / `fit-content`，或判断 Flex / Grid 在内容变化时如何计算。
## 核心心智模型

- **内容决定尺寸，设计只给约束。** 数据是动态的；固定尺寸只在内容恰好等于设计稿时正确。
- **内在尺寸（intrinsic size）**：元素由自身及后代内容决定大小，关键词为 `min-content`、`max-content`、`fit-content`。
- **外在尺寸（extrinsic size）**：元素不看内容，由上下文决定大小，典型为固定长度和 `%`。
- 设计稿尺寸应优先翻译成下限、上限或首选最大值，不要直接当成内容宽度。
- 内在 Web 设计（Intrinsic Web Design, IWD）不是“内容以设计为导向”，而是让设计受内容驱动。
- 改造目标不是全部改成 `max-content`，而是在内容、容器和约束之间建立可预测关系。
## 关键 API
### `min-content`

- 内容能收缩到的最窄宽度：通常由最长英文单词、最大图片或不可断行子项决定。
- 删除图片后，宽度会落在最长英文单词上；中文断行规则不同。
- Grid / Flex 中项目可缩到自身最小内容宽度，但项目最小宽度总和仍可能大于容器并溢出。

```css
.compact { width: min-content; }
```
### `max-content`

- 内容不折行、按理想宽度展开，效果类似 `white-space: nowrap`。
- 内容超过容器时直接溢出；内容不足容器时也不会占满可用空间。
- 适合宽度确应由内容决定的按钮、按内容展开的导航或标题。

```css
button {
  width: max-content;
  min-width: 230px;
  min-height: 60px;
}
```
### `fit-content`

- 检查可用空间（`fill-available`）、`max-content`、`min-content` 后决定宽度：尽量容纳最宽内容，同时尊重容器。
- 原文给出的等价关系：

```css
.box {
  width: fit-content;
}

/* 原文所述等价写法 */
.box {
  width: auto;
  min-width: min-content;
  max-width: max-content;
}
```

- 适合“内容决定视觉宽度，但不能突破容器”的标题下划线、图文标题对齐等。

```css
h2 {
  width: fit-content;
  padding-bottom: 0.25em;
  border-bottom: 2px solid;
}
```
### 尺寸属性的取值边界

- `width`、`height`、`inline-size`、`block-size` 可接受 `auto`、`<length-percentage>`、`min-content`、`max-content`、`fit-content(<length-percentage>)`。
- 加 `min-` / `max-` 前缀可设置尺寸上下限。
- `min-*` 初始值为 `auto`，不接受 `none`；`max-*` 初始值为 `none`，不接受 `auto`。
- 原文指出 `stretch`、裸 `fit-content`、`contain` 等未来值由 CSS Box Sizing Level 4 定义，未给出具体兼容版本。
## 改造步骤

1. **盘点固定尺寸。** 标出 `width`、`height`、`flex-basis`、Grid 轨道中来自设计稿测量值的位置；区分真正固定值与临时兜底值。完成判据：每个固定值都有“必须固定”或“可改为约束”的结论。
2. **准备极值内容。** 测试短标签、长标签、长英文单词、中文长句、长 URL、图片宽高变化。完成判据：固定尺寸不依赖某份样例数据才成立。
3. **把测量值改成约束。** 例如按钮从固定宽高改为 `width: max-content; min-width: 230px; min-height: 60px`。完成判据：内容变长时扩张，内容变短时仍保留设计下限。
4. **按语义选关键词。** 只包裹自身内容用 `max-content`；要保留最长单词 / 最大子项用 `min-content`；要在容器内尽量按内容展开用 `fit-content`。完成判据：选择理由能用一句话说明。
5. **表达元素间关系。** 描述文本不得超过标题时，外层用 `min-content`，标题用 `max-content`；不要给二者写同一个固定宽度。完成判据：标题变化后，描述以标题宽度为上界且标题不断行。
6. **改造 Grid / Flex。** 用内在关键词、`fit-content(<length>)`、`minmax()`、`fr` 表达收缩扩张；图片按角色处理。完成判据：容器收窄或内容变长时，轨道按规则收缩、换行或溢出，而非新增猜测的固定值。
7. **先尝试无媒体查询适配。** 依次考虑 RAM、Flex 换行、`min()` / `max()` / `clamp()`、容器查询；媒体查询用于特定边界修正。完成判据：常见宽度变化无需逐设备新增断点，确需断点时原因是内在规则无法表达。
8. **验证极值。** 连续缩放并检查水平滚动、标题过早断行、描述过宽、图片裁切、Grid / Flex 溢出。完成判据：极值内容仍符合设计意图，留白来自布局规则而非固定尺寸。
## Flexbox 参考

- `flex-basis` 可使用内在关键词，但最终值还受剩余 / 不足空间、`flex-grow`、`flex-shrink` 影响。
- 容器空间足够且项目未显式设宽时，`max-content` 与 `fit-content` 的 `flex-basis` 效果等同 `auto`。
- 空间不足且 `flex-shrink: 1` 时，项目继续收缩到 `min-content`，之后不再收缩。
- `flex-shrink: 0` 时，`max-content` 项目不收缩，空间不足会溢出容器。
- `flex-basis: min-content` 始终以最小内容宽度计算；项目总和超过容器时仍会溢出。

```css
.card {
  display: flex;
  flex-wrap: wrap;
}

.card > * { flex: 1 1 280px; }
```
## Grid 参考

- `min-content`、`max-content` 可用于 `grid-template-columns`、`grid-template-rows`、`grid-auto-columns`、`grid-auto-rows`。
- 裸 `fit-content` 是无效的 Grid 轨道值；应使用 `fit-content(<length-percentage>)`，二者不是同一特性。
- `auto` 作最大值时接近最大内容，但允许对齐属性扩展轨道；作最小值时取项目最大的最小尺寸。
- 内容相同时，`auto` 和 `1fr` 可能呈现相同平均分配效果。
- `auto` 与 `fr` 同时出现时，`fr` 获得剩余空间，`auto` 收缩到内容所需空间。
- 全部轨道使用 `max-content` 且内容总宽超过容器时，网格项目会溢出。
- `fit-content(<length>)` 是轨道的“首选最大值”：空间足够时达到该值，不足时最小可缩到 `min-content`。

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100% - 2rem, 400px), 1fr));
  gap: 1rem;
}
```

- 上例是 RAM：`repeat()` + `auto-fit` / `auto-fill` + `minmax()`，无需媒体查询即可适配不同终端。
- 应用壳、聊天页可用“内容高度 + 吃剩余空间”的轨道结构：

```css
.chat {
  display: grid;
  grid-template-columns: min-content fit-content(24rem) minmax(0, 1fr);
  grid-template-rows: min-content minmax(0, 1fr) min-content;
}
```
## 常见反例与正解
### 按钮：测量宽度 vs 内容驱动

```css
/* ❌ 内容或字号变化后可能截断、溢出或留下过多空白 */
button { width: 230px; height: 60px; }

/* ✅ 内容决定尺寸，设计稿尺寸成为下限 */
button {
  width: max-content;
  min-width: 230px;
  min-height: 60px;
}
```

出处：<https://codepen.io/airen/full/KKeLazj>
### 图文标题：`max-content` vs `fit-content`

```css
figure {
  /* 图片与标题谁更宽，结果就更偏向谁；只在二者等宽时符合预期 */
  width: max-content;
}

figure {
  /* 较宽内容决定视觉宽度，同时不突破可用空间 */
  width: fit-content;
}
```

出处：<https://codepen.io/airen/full/ZERNdjQ>
### Hero：固定同宽 vs 内容关系

```css
.hero__content {
  width: min-content;
  text-align: center;
}

.hero__title { width: max-content; }
```

- 原文用这组规则实现“描述宽度不超过标题宽度”。
- 移动端 `max-content` 标题可能造成水平滚动，原文以媒体查询收口：

```css
@media only screen and (max-width: 441px) {
  .hero__title { width: min(100% - 1rem, 400px); }
}
```

出处：<https://codepen.io/airen/full/KKeOMVG>
## 坑与边界

- `max-content` 不保证不溢出；容器不够宽时会直接溢出。
- Grid 轨道直接使用 `min-content` 时，设置了 `display: block; max-width: 100%; height: auto` 的图片可能被视为 `width: 0` 而不可见。
- 原文修法是给轨道最小尺寸设具体值：

```css
.grid {
  grid-template-columns: minmax(100px, min-content) 1fr;
}
```

- `min-content` 不是“永不溢出”：多个项目的最小宽度总和超过容器时，Flex / Grid 仍可能溢出。
- `max-content` 适合按内容展开，但不能替代所有响应式约束；标题、导航等可能仍需 `min()`、`max()`、媒体查询或容器查询兜底。
- `object-fit: cover` / `contain` 与 `background-size` 的表现对应，但 `object-fit` 不接受 `<length-percentage>`。
- `cover` / `contain` 尺寸计算只适用于具有内在尺寸和比例的背景图片，例如位图；`<gradient>` 或部分矢量图不适用。
- 普通响应式图片可用 `display: block; max-width: 100%; height: auto`，但图片小于容器时仍可能被拉伸扭曲。
- IWD 允许固定尺寸图片和灵活图片并存；固定 Logo 是否合适取决于它本来就是固定尺寸资源，而不是把动态内容改回固定值。
- 使用 `subgrid`、CSS 容器查询等特性前要单独确认目标浏览器；原文只给出用法与示例，未给出具体版本或兼容性矩阵。
- 原文覆盖内在尺寸、Flex / Grid、RAM、间距、图片与容器查询；未覆盖 `srcset`、`sizes`、`<picture>` 的完整用法及全部浏览器兼容结论。
