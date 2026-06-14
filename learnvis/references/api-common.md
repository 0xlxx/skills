# common — 通用工具

> **注意：** `elements.ts` 已删除。`zone`, `dot`, `arrow`, `line`, `path` 原语不再存在。用 `math` 或 `layout` 原语替代。

## card

```js
const c = LearnVis.card('#grid', 'My Chart', 'A sine wave', { width: 300, height: 200, theme: 'warm' })
c.math.fn(Math.sin, { domain: [0, 6.28], x: 0, y: c.cell.h, width: c.cell.w, height: c.cell.h })
```

- 创建带标题、描述、内嵌 SVG stage 的 DOM 卡片
- 返回 `CardStage`，有 `c.cell`（`{x,y,w,h}` 可直接传 math 原语）、`c.el`（DOM 元素）
- `parent` 可以是 CSS 选择器字符串或 DOM 元素

## tag

```js
const tip = s.tag(ball, '<b>θ₀</b>').above(16).color('primary')
tip.text('<b>θ₁</b>')  // 更新文字 → 自动跟随目标位置
```

- 绑定到目标元素，自动跟随位置，不用每步重建
- 方位：`.above(gap)` `.below(gap)` `.left(gap)` `.right(gap)`
- 样式：`.bold()` `.size(n)` `.color(c)` `.text(t)`

## callout

```js
s.ctx.callout({ x, y }, 'Label text', { place: 'right', gap: 6, style: { fontSize: '10px' } })
```

- HTML overlay 标注，锚定到 SVG 坐标点
- `place`: `'above'` | `'below'` | `'left'` | `'right'`
- `style`: 内联 CSS 样式对象
