# 滚动模式配方

每个配方都先保证内容可达，再按需增加平滑和捕捉。

## 垂直列表 / 信息流

适用于评论、搜索结果、设置列表、动态卡片等高度可能不一致的内容。

```css
.feed {
  overflow-y: auto;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
  scroll-snap-type: y proximity;
  scroll-padding-block: var(--scroll-anchor-offset, 1rem);
}

@media (prefers-reduced-motion: no-preference) {
  .feed {
    scroll-behavior: smooth;
  }
}

.feed__item {
  scroll-snap-align: start;
}
```

选择 `proximity`，因为卡片高度和内容长度可能变化。动态增删或加载更多时，优先让用户自由滚动，只对靠近捕捉线的结果做轻微校正。

键盘导航：

1. 选中项已经完整可见时，不移动列表。
2. 需要移动时临时关闭捕捉，再使用 `scrollIntoView({ block: 'nearest' })`。
3. 用户滚轮或触控后恢复捕捉。
4. 连按方向键时复用同一个滚动器，避免每次居中造成视线跳动。

## 水平卡片轮播

适用于图片、卡片或步骤条目宽度固定且每个项目都能完整显示的轮播。

```css
.carousel {
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: var(--carousel-gutter, 1rem);
  touch-action: pan-x;
}

.carousel__item {
  scroll-snap-align: start;
}

.carousel__item--critical {
  scroll-snap-stop: always;
}
```

只有在内容宽度稳定、项目高度不溢出时才使用 `mandatory`。`touch-action: pan-x` 适合纯横向轮播；如果用户仍需要纵向滚动整页，改用更窄的手势策略或用 `pan-x pan-y` 的实际组合验证。

## 全屏分页

适用于 landing page、演示、步骤面板或全屏故事。

```css
.pager {
  height: 100svh;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scroll-snap-type: y mandatory;
}

.pager__section {
  min-height: 100svh;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}
```

优先把捕捉放在专用 `.pager` 容器上，避免直接在 `body` 上启用强制捕捉。每个 section 的内容必须在当前视口内可达；内容超出一屏时改用 `proximity`，否则中间内容很难查看。

需要平滑分页时只在分页容器上设置 `scroll-behavior: smooth`，并用 `prefers-reduced-motion: no-preference` 包裹。

## 嵌套滚动 / 列表左滑

嵌套滚动器要先明确内外两端分别属于哪个轴，再用 `overscroll-behavior` 隔离边界。

```css
.list-viewport {
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scroll-snap-type: y proximity;
}

.list-row {
  display: flex;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
}

.list-row__content {
  scroll-snap-align: start;
}

.list-row__actions {
  scroll-snap-align: end;
}
```

纵向列表中的每一行，如果横向滚动到末尾不应带动外层列表，就给内层设置 `overscroll-behavior-x: contain`。外层的垂直捕捉最好使用 `proximity`，避免用户横向操作时被外层反复拉回。

## 弹层 / 模态框

弹层内容需要独立滚动时，给内容滚动器设置边界隔离：

```css
.dialog__body {
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-gutter: stable;
}
```

只有产品明确要求根页面完全不能滚动时，才考虑根滚动器的 `overscroll-behavior: none` 和背景滚动锁定。优先保持背景可访问，除非背景滚动会造成真实的任务风险。

## 键盘选择与连续移动

推荐状态机：

- `ArrowDown` / `ArrowUp`：选中下一项或上一项。
- 选中项已经可见：保持 `scrollTop` 不变。
- 需要露出选中项：临时关闭捕捉，调用 `scrollIntoView` 的 `nearest`。
- 用户手动滚动：恢复捕捉，让浏览器重新决定落点。
- 长按方向键：复用同一容器和同一状态；不要创建多个滚动动画。

## 验收矩阵

| 维度 | 至少覆盖 |
|---|---|
| 内容 | 短内容、长内容、动态增删、图片加载后高度变化 |
| 边界 | 第一项、最后一项、无法滚动、超长项目 |
| 输入 | 滚轮、触控、方向键、锚点、脚本请求 |
| 容器 | 根滚动器、嵌套滚动器、弹层滚动器 |
| 偏好 | 正常动态效果、`prefers-reduced-motion: reduce`、深浅色 |
| 环境 | 窄屏、宽屏、缩放、RTL / 竖排、不同浏览器 |

滚动捕捉是否成功，不能只看第一屏。必须观察滚动结束位置、首尾可达性和动态更新后的位置。
