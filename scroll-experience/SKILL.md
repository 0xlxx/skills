---
name: scroll-experience
description: 优化、诊断或评审 Web 滚动体验时使用。覆盖滚动容器、滚动条回流与美化、滚动链和下拉刷新、平滑滚动、scroll snap、吸附偏移、键盘/触控导航、嵌套滚动、动态列表与 prefers-reduced-motion。
---

# 滚动体验

先判断滚动从哪里来、要解决哪一种体验问题，再施加最小 CSS。滚动的本质是内容溢出容器后，浏览器为了不丢失内容而提供可访问路径。

## 工作流

每一步都以下一条完成标志作为门槛；没有证据的“看起来可以”不算完成。

1. **定位滚动器**：找出根滚动器和所有嵌套滚动器，记录滚动轴、可视区域、内容长度、主要输入方式（滚轮、触控、键盘、锚点、脚本）。完成标志：每个受影响容器都能明确说出 `overflow`、方向和触发滚动的原因。

2. **先修容器边界**：默认在需要的轴使用 `overflow: auto`；内容必须被裁剪时使用 `overflow: clip`；只有确实需要保留滚动容器语义、但暂不允许用户滚动时才考虑 `hidden`。存在经典滚动条导致回流风险时补 `scrollbar-gutter: stable`，嵌套滚动器需要隔离时补 `overscroll-behavior: contain`。完成标志：内容没有因裁剪或嵌套链而不可达，滚动条出现不会改变布局，边界行为符合预期。

3. **再处理滚动动效**：只在相关滚动容器上使用 `scroll-behavior: smooth`，并放在 `@media (prefers-reduced-motion: no-preference)` 内；用户手势产生的直接滚动不应依赖它。完成标志：锚点、脚本和键盘导航的实际滚动行为已分别验证，减少动态效果时立即滚动。

4. **需要离散落点时加捕捉**：只对语义上独立、可完整查看的单元使用 `scroll-snap-type`。高度可变的信息流默认用 `proximity`；全屏页面、卡片轮播等每个单元都可预测时用 `mandatory`。项目上设置 `scroll-snap-align`，容器上设置 `scroll-padding` 让捕捉线避开固定头部和容器内距。完成标志：滚动结束位置落在预期位置附近，首尾项可达，长项目不会被卡在中间。

5. **让键盘和脚本共享滚动器**：选中项已经完整可见时不滚动；需要滚动时使用 `scrollIntoView({ block: 'nearest', inline: 'nearest' })`，键盘移动期间临时设 `scroll-snap-type: none`，用户滚轮或触控后恢复捕捉。完成标志：连按方向键不抖动、不抢滚动、不出现捕捉拉回，选中项始终完整可见。

6. **真实浏览器验收**：覆盖长短内容、动态增删、首尾边界、嵌套滚动、键盘、触控、缩放、窄屏、RTL/书写模式、深浅色、`prefers-reduced-motion`。完成标志：每个用例都有可观察结果；不适用项写明原因，而不是默认通过。

## 默认起点

```css
.scroll-container {
  overflow: auto;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}

@media (prefers-reduced-motion: no-preference) {
  .scroll-container {
    scroll-behavior: smooth;
  }
}

.scroll-container__item {
  scroll-snap-align: start;
}
```

只有在容器确实需要捕捉时再加：

```css
.scroll-container--discrete {
  scroll-snap-type: y proximity;
  scroll-padding-block: var(--scroll-anchor-offset, 1rem);
}
```

`scroll-padding` 使用设计 token 或实际头部高度，不写与视觉系统无关的魔法像素。

## 选择规则

| 场景 | 首选 | 关键条件 |
|---|---|---|
| 普通页面或面板 | `overflow: auto` + `scroll-behavior` | 滚动条只在需要时出现 |
| 滚动条出现会影响布局 | `scrollbar-gutter: stable` | 覆盖式滚动条通常无经典沟槽，不必强行使用 |
| 弹层/嵌套列表滚到边界 | `overscroll-behavior: contain` | 阻止滚动链，但保留容器自身的边界反馈 |
| 需要彻底禁止根容器下拉刷新 | 根滚动器 `overscroll-behavior: none` | 同时移除根滚动器的原生过度滚动效果 |
| 连续的信息流 | `scroll-snap-type: y proximity` | 高度可变；允许用户停在任何合理位置 |
| 全屏分页、固定卡片轮播 | `scroll-snap-type: y|x mandatory` | 每个单元都能完整显示，内容增删不会改变捕捉含义 |
| 固定头部遮挡捕捉线 | 容器 `scroll-padding-block` | 让捕捉线位于可见区域内部 |
| 需要为某个项目留额外空间 | 项目 `scroll-margin-block` | 用于项目自身与捕捉点之间的间隔 |
| 必须逐个停靠的重要项目 | 项目 `scroll-snap-stop: always` | 可能让快速滚动变得笨重，只在确实重要时使用 |

详细属性语义、取值和浏览器注意事项见 [`references/properties.md`](references/properties.md)。列表、轮播、全屏、嵌套滚动和键盘导航配方见 [`references/patterns.md`](references/patterns.md)。

## 高频风险

- **把所有容器都设为 `smooth`**：会影响脚本触发的滚动，甚至让已有的 `scrollTop` 逻辑变成异步动画。作用域收窄到真正需要的容器。
- **对高度不一致的内容使用 `mandatory`**：内容比视口高、图片加载后高度变化、列表动态插入时，用户可能永远看不到项目的一部分。信息流优先 `proximity`。
- **只写 `scroll-snap-type` 不写对齐**：捕捉不会按预期工作。容器负责类型，项目负责 `scroll-snap-align`。
- **忽略固定头部**：捕捉点被工具栏遮住。用 `scroll-padding` 在容器上定义最佳浏览区域。
- **键盘滚动和捕捉互抢**：`proximity` 也可能把只差几像素的选中项拉回去。键盘导航期间临时关闭捕捉，用户恢复手动滚动后再交还。
- **用 `hidden` 掩盖溢出**：这会让部分内容不可达。先让容器可滚动，再解决布局或视觉问题。
- **滚动监听里频繁读写布局**：不要把滚动优化建立在每帧 JS 计算上。优先让浏览器处理 CSS 滚动、捕捉和合成动画。

## 验收清单

- [ ] 内容溢出时可达，首项、末项和长项目都能完整查看。
- [ ] 滚动条出现前后没有明显 layout shift；有经典沟槽时已预留空间。
- [ ] 嵌套滚动到边界不会意外带动父容器；下拉刷新行为符合产品预期。
- [ ] 平滑滚动有作用域，`prefers-reduced-motion: reduce` 下立即滚动。
- [ ] 捕捉点避开固定头部和内距，滚动结束位置稳定。
- [ ] 键盘连续移动不抖动，选中项完整可见，手动滚动后状态正确。
- [ ] 动态内容增删后仍能滚动和捕捉，没有项目被跳过或锁死。
- [ ] 触控、滚轮、键盘和脚本导航使用同一套可理解的滚动规则。
