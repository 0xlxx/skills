# atomic — 原子层 API

低层 API，用于自定义渲染和精细控制。通过 `FrameManager` + `SVGRenderer` 访问。

## 入口

```js
import { FrameManager } from 'learnvis'
import { SVGRenderer } from 'learnvis'

const fm = new FrameManager(renderer)
```

`FrameManager` 是 ECS 风格声明式管线，`SVGRenderer` 是默认渲染器。

## Entity 系统

五种 base entity 类型（`vis/types.ts`）：

| type | 说明 | 示例 EntityId |
|------|------|-------------|
| `node` | 节点（circle/rect/symbol） | `vertex:A`, `point:O`, `port:p` |
| `line` | 线段（含箭头） | `segment:AB`, `edge:A:B` |
| `region` | 区域（polygon/circle/arc/fill） | `polygon:tri`, `fill:L1` |
| `curve` | 函数曲线 | `fn:sin` |
| `group` | 组合（axes/grid/angle） | `axes:ax`, `grid:g` |

**EntityId** — branded type `string & { [EntityIdBrand]: true }`，通过 `eid(prefix, id)` 构造。

## 生命周期

```js
fm.begin()                          // 开始新帧
fm.declare(eid('point', 'O'), {     // 创建/更新 entity
  type: 'node', shape: 'circle',
  x: 100, y: 200, r: 4,
  fill: '#e44', stroke: '#c00',
})
fm.patch(eid('point', 'O'), {       // 局部更新
  x: 150,
})
fm.commit({ ms: 500, animate: true }) // 提交帧：计算 enter/update/exit → D3 过渡
```

## 泛型 getter

```js
const e = fm.get('point:O', 'node')  // 类型安全的 entity 访问
// e.desired.x, e.desired.r, ...  — 直接访问属性，无需 cast
```

## 颜色管线

```
theme palette (oklch) → resolveColor() → svgColor() → hex SVG attribute
```

- `svgColor('oklch(0.52 0.18 68)')` → `#e06b38`（自动转换）
- 所有 SVG `fill`/`stroke` 属性都经过 `svgColor()`

## 渲染器接口

```typescript
interface Renderer {
  create(id, state): RenderHandle
  update(id, oldState, newState, transition?): void
  remove(id): void
  beginFrame(): void
  commitFrame(opts?: { animate?, ms? }): void
  dispose(): void
}
```

`SVGRenderer` 在 `vis/renderer/svg.ts` — 将 5 种 entity type 映射到 SVG 元素（line, circle, polygon, path, text）。

## 变换系统

纯描述符存储（`_tf` / `_base`），不在 SVG 层做 transform：

```js
const tf: Transform[] = [
  { type: 'rotate', angle: 45, cx: 0, cy: 0 },
  { type: 'scale', sx: 2, sy: 2 },
]
// applyLine(from, to, tf) / applyVertices(vertices, tf) 应用变换到坐标
// interpolate(oldTf, newTf, t) 平滑插值
// normalizeTransforms(a, b) 补齐到等长数组
```

## StageCtx

```js
// 通过 s.ctx 访问
s.ctx.W / s.ctx.H           // 画布尺寸
s.ctx.palette               // Palette
s.ctx.stage.bg              // 背景层 D3 selection
s.ctx.stage.nodes           // 节点层
s.ctx.stage.edges           // 边层
s.ctx.stage.overlay         // 覆盖层
s.ctx.callout(pos, html, opts)  // HTML overlay 标注
s.ctx.markerFor(color)      // 获取/创建 SVG marker
```
