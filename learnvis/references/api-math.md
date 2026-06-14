# math — 数学原语

所有数学原语第一个参数为显式 `id`，返回链式 Builder。共享混入方法来自 `vis/mixins.ts`。

**通用链式方法**：point-like 实体（point/circle/polygon/rect/symbol）共享 `coreNodeMixin`：`.color(c)` `.strokeW(n)` `.fill(c)` `.opacity(v)` `.label(t)` `.size(n)`
**line-like**：segment/vector 有 `.color()` `.strokeW()` `.dashed()` `.opacity()` `.label()`
**变换**（vector/polygon）：`.rotate(deg,cx,cy)` `.scale(s)` `.translate(dx,dy)` — 纯数学修改坐标

## vector

```js
s.math.vector('v', [x1,y1], [x2,y2]).color('primary').label('v⃗')
```

- 默认：primary 色，strokeW 1.6，classic 实心箭头 marker
- 起点偏移 4px（point radius），终点偏移 4px + marker height
- 变换修改 from/to 坐标

## point

```js
s.math.point('P', [x,y]).color('danger').label('P').size(6)
```

- 默认：filled circle (r=4)，primary 色填充
- `.fill(c)` 改填充色，`.opacity(v)` 改透明度
- `labelPlace` 默认 `'above'`，`labelGap` 默认 10

## segment

```js
s.math.segment('AB', [x1,y1], [x2,y2]).color('dim').dashed('5 3')
```

- 默认：dim 灰色，strokeW 1.5
- 原始线段，不经过偏移
- 坐标存在 `a`/`b` 字段，渲染器 fallback 链路：`x1/x2 → from/to → a/b → 0`

## polyline

```js
s.math.polyline('route', [[x1,y1],[x2,y2],[x3,y3],...], { color: 'dim', strokeW: 1.5 })
```

- 多段折线（开放路径，不闭合），渲染为 SVG `<polyline>`
- 默认：dim 灰色，strokeW 1.5，`stroke-linejoin: round`
- 至少 2 个点
- 链式方法：`.color()` `.strokeW()` `.dashed()` `.opacity()`

## circle

```js
s.math.circle('c', [cx,cy], r).color('accent')
```

- 默认：accent 色描边 (strokeW 1.2)，填充 `p.accent.a(8)`（8% alpha，palette 相关）
- `.fill('none')` 去填充，`.opacity(v)` 改整体透明度（默认 1）
- 支持 `.translate(dx, dy)`

## polygon

```js
s.math.polygon('tri', [[x1,y1],[x2,y2],[x3,y3]]).color('info').opacity(0.6)
```

- 默认：primary 色描边 (strokeW 1.5)，填充 `r.fill`（palette bg 色）
- 变换修改 vertices 坐标
- 支持 `.fill(c)` 改填充

## rect / ngon / ellipse

```js
s.math.rect('box', cx, cy, w, h)        // 矩形
s.math.ngon('hex', cx, cy, r, 6)        // 正六边形
s.math.ellipse('e', cx, cy, rx, ry)     // 椭圆（32 段）
```

- 均为 polygon 的便捷封装，返回 MathPolygon

## angle

```js
s.math.angle('θ', vertex, ray1, ray2, { size: 30 }).color('danger').label('45°')
```

- 纯描边弧线（无填充），画在 overlay 层
- label 在弧外侧 12px 处，角度 < 1.15° 时隐藏
- 默认 arc radius 30px

## rightAngle

```js
s.math.rightAngle('R', vertex, ray1, ray2, { size: 10 }).color('danger')
```

- 直角标记 L 型（polyline，3 点），默认 size 8px

## projection

```js
s.math.projection('p', pt, lineFrom, lineTo).color('danger').dash('4 3')
```

- 自动计算垂足坐标，绘制虚线段（pt → 垂足）+ 小圆点
- 创建两个 entity：`segment:p` + `point:p-p`

## fill

```js
s.math.fill('f', [[x1,y1],[x2,y2],...], { color: 'info', opacity: 0.3 })
```

- 填充多边形（`shape: 'fill'`），无描边
- 默认 opacity 0.45

## fillFn — 函数积分

```js
s.math.fillFn('area', x => Math.sin(x), {
  domain: [0, Math.PI],   // 积分区间
  x: 40, y: 150,          // SVG 原点
  width: 200, height: 130,
  color: 'accent',
  baseline: 0,            // 基线 y 值，默认 0（x 轴）
})
```

- 计算函数曲线下的填充多边形（`shape: 'fill'`，默认 opacity 0.45）
- 配合 `.axes()` + `.fn()` 使用同组 x,y,width,height
- EntityId: `fill:area`

## grid

```js
s.math.grid('g', [ox,oy], { width: 400, height: 300, spacing: 40 })
```

- 默认：dim 色，0.3px strokeW
- 线段范围 `[ox, ox+width]` × `[oy-height, oy]`

## axes

```js
s.math.axes('ax', [ox,oy], { xLen: 300, yLen: 200, xLabel: 'x', yLabel: 'y' })
```

- 默认：dim 色，strokeW 1.4，箭头尖端 10px
- 标记原点小圆

## fn — 函数曲线

```js
s.math.fn('sin', x => Math.sin(x), {
  domain: [0, 6.28],      // x 数据范围
  range: [-1, 1],         // y 数据范围（自动推断）
  x: 60, y: 180,          // SVG 原点位置
  width: 240, height: 140,
  samples: 200,
}).color('primary').label('sin(x)')
```

- 默认：primary 色描边，strokeW 1.5，opacity 1
- domain 默认 [0, 10]，range 自动采样 200 点取 min/max
- 标签在曲线中点上方
- 坐标系对齐：配合 `grid()` + `axes()` 使用同一组 x,y,width,height

## symbol

```js
s.math.symbol('s', [130,100], { type: 'star', size: 12, color: 'danger', fill: 'warning' })
```

- 7 种类型：circle/cross/diamond/square/star/triangle/wye
- 基于 d3-shape `d3Symbol`

## arc

```js
s.math.arc('a', [cx,cy], {
  innerR: 30, outerR: 60,
  startAngle: 0, endAngle: Math.PI,
  color: 'primary', fill: 'primary'
})
```

- 基于 d3-shape `d3Arc`
- innerR=0 为扇形，innerR>0 为环形
- 默认 strokeW 1.2

## 颜色

预设调色板：`primary` / `danger` / `warning` / `success` / `info` / `accent` / `dim`

每个颜色通过 `resolveColor(p, name)` 解构成 `{ stroke: oklch(低L fg), fill: oklch(高L bg) }`。SVG 输出时通过 `svgColor()` 将 oklch 转为 hex。
