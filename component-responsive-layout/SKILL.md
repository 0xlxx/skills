---
name: component-responsive-layout
description: 组件驱动响应式布局。用于布局受最近容器而非视窗决定、同一组件出现在弹窗/侧栏/列表、短内容留白、卡片高度被图片或固定轨道撑大、动态文本或缺失媒体导致错位，以及需要使用 @container、container units、局部用户偏好时。先让内容决定尺寸，再用容器查询改变结构，最后用几何断言验收。
---

# 组件驱动响应式布局

组件不是页面的缩小版。一个组件需要先找到离它最近的**容器上下文**，再让内容决定最小尺寸，最后只在结构确实要变化时使用容器查询。

```
容器上下文 → 内容定型 → 结构分支 → 几何验收
```

## 步骤

### 1. 界定容器上下文

完成标志：能回答“这个组件为什么变窄，应该查询谁”。

- 页面列宽、侧栏、弹窗、抽屉、列表单元，都是独立容器上下文。
- 组件自身需要隔离布局时，在父级或组件根上设置 `container-name` 与 `container-type: inline-size`。
- 一个组件如果同时受页面宽度和局部宽度控制，分别查询页面级媒体条件与最近容器；局部布局优先由容器决定。

```css
.card-region {
  container-name: card-region;
  container-type: inline-size;
}
```

### 2. 让内容先生成尺寸

完成标志：把最长的文案、最短的文案、有媒体、无媒体四种组合放进去，核心布局仍然成立。

- 让文字、图片、按钮先按内容尺寸参与布局，再用 `minmax()`、`fit-content()`、`min-content`、`max-content` 和 `fr` 约束它们。
- 卡片列表用内容生成高度；文字多的行自然更高，文字少的行自然更矮。
- 图片或封面是内容的一部分，负责占好自己的槽位，不能把一个固定最小高度转嫁给整张卡片。
- 文本列使用 `minmax(0, 1fr)`，长 URL、长英文单词和不可断词内容才不会把网格撑破。
- 间距用 `gap`、`padding`、`margin` 和流体值，不用绝对定位修补内容关系。

```css
.card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(min-content, 5.5rem);
  grid-template-rows: auto auto;
  align-items: start;
  column-gap: 0.75rem;
  row-gap: 0.25rem;
}

.card__text,
.card__meta {
  min-width: 0;
}

.card__media {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: start;
  aspect-ratio: 16 / 9;
}
```

列表行的纵向密度优先使用 `max(文字组高度, 媒体高度)`；文本组短时，卡片跟着收紧，文本组长时，媒体槽保持自己的尺寸。

### 3. 只给结构变化加查询

完成标志：每条容器查询都对应一个真实的结构分支，而不是一组视觉微调。

常用分支：

- **窄容器**：内容改为单列，次要元信息下移或收拢。
- **中等容器**：文字与媒体并排，低优先级字段留在同一行。
- **宽容器**：增加辅助信息或让媒体获得更舒适的尺寸。
- **有媒体 / 无媒体**：用 `:has()` 或组件状态改变列轨道；无媒体时让正文跨满可用空间。
- **用户偏好**：用 `prefers-reduced-motion`、`prefers-color-scheme`、`prefers-contrast`、`prefers-reduced-data` 调整体验，而不是布局宽度。

```css
@container card-region (max-width: 34rem) {
  .card {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto auto;
  }

  .card__text,
  .card__meta,
  .card__media {
    grid-column: 1;
  }

  .card__media {
    grid-row: 3;
    width: min(100%, 14rem);
  }
}

.card:not(:has(.card__media)) .card__text {
  grid-column: 1 / -1;
}
```

查询条件的单位使用容器单位或 `rem`：`cqi`、`cqw`、`cqb` 随当前容器变化，`clamp()` 负责在上下限之间流体过渡。旧浏览器先得到不依赖查询的可用布局。

### 4. 保留渐进增强回退

完成标志：关闭容器查询后，内容仍可读、可点击、可滚动。

- 默认样式先写成完整的单列或可换行布局。
- `@supports` 或渐进增强层再增加并排、装饰、密度变化。
- `container-type: inline-size` 会建立尺寸包含；确认组件不会被外部内容反向撑大。
- 查询失败时，图片、按钮和正文仍占据正常文档流。

### 5. 用几何结果验收

完成标志：浏览器中的真实尺寸满足下面的断言。

- 同一组件在窄/宽容器中的列数、纵横关系符合设计分支。
- 短文本卡片高度小于长文本卡片，且差额来自内容而不是固定留白。
- 无媒体卡片不会被空媒体槽撑高。
- 文字列在长 URL、长英文单词和动态字段下不溢出。
- 容器边界改变时，兄弟卡片仍能对齐；需要跨卡共享轨道时改用 Subgrid。
- `prefers-reduced-motion` 下核心操作仍可完成；颜色与对比度在目标主题下可读。
- 变更前后都检查真实 `getBoundingClientRect()`、`scrollWidth` 与 `overflow`，不只检查 CSS 声明。

## 选择分支

- **卡片列表**：默认文字列自适应、媒体固定槽；窄容器改为媒体下置。
- **弹窗 / 抽屉 / 侧栏**：查询最近内容区，不查询整个视窗。
- **搜索栏 / 工具栏**：控件先占内容宽度，剩余空间交给 `minmax(0, 1fr)`。
- **动态内容**：用 `:has()`、状态类或组件数据选择“有媒体 / 无媒体 / 多行元信息”。
- **跨项对齐**：多个卡片需要共享边界时，用 Subgrid；单个组件内部优先用普通 Grid。

## 常见误区

- 用视窗断点控制一个只在弹窗里出现的组件。
- 用固定行高或媒体槽给整张卡片设最小高度。
- 为了让短内容“看起来一致”而保留空轨道。
- 容器查询只改颜色、圆角等细节，却不改变任何结构。
- 因为容器变窄就直接删除核心内容；优先重排，其次隐藏低价值元信息。
- 把 `container-type` 放在组件内部后再查询组件自身；查询容器必须是目标元素的可查询祖先。
