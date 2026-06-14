# math — 数学原语

第一个参数永远是 `id`。所有原语都有合理默认值，最简形式即可工作。

## point

```js
s.math.point('P', [x, y])
s.math.point('P', [x, y]).color('danger').label('P').size(6)
```

默认：filled circle (r=4)，primary 色。

## vector

```js
s.math.vector('v', [x1,y1], [x2,y2])
s.math.vector('v', [x1,y1], [x2,y2]).color('primary').label('v⃗')
```

默认：primary 色，strokeW 1.6，实心箭头。支持 `.rotate()` `.scale()` `.translate()`。

## segment

```js
s.math.segment('AB', [x1,y1], [x2,y2])
```

默认：dim 灰，1.5px。坐标 fallback 链：`x1/x2 → from/to → a/b`。

## polyline

```js
s.math.polyline('p', [[x1,y1],[x2,y2],[x3,y3],...])
```

默认：dim 灰，1.5px，`stroke-linejoin: round`。至少 2 点。

## circle

```js
s.math.circle('c', [cx,cy], r)
```

默认：accent 色描边 (1.2px)，淡色填充。

## polygon

```js
s.math.polygon('tri', [[x1,y1],[x2,y2],[x3,y3]])
```

默认：primary 色描边 (1.5px)，淡色填充。支持 `.rotate()` `.scale()` `.translate()`。

## rect / ngon / ellipse

```js
s.math.rect('box', cx, cy, w, h)
s.math.ngon('hex', cx, cy, r, 6)
s.math.ellipse('e', cx, cy, rx, ry)     // 32 段
```

均为 polygon 便捷封装。

## angle

```js
s.math.angle('θ', vertex, ray1, ray2)
```

默认：纯描边弧线，arc radius 30px。label 在弧外侧。

## rightAngle

```js
s.math.rightAngle('R', vertex, ray1, ray2)
```

默认：L 型 polyline，size 8px。

## projection

```js
s.math.projection('p', pt, lineFrom, lineTo)
```

自动计算垂足 + 虚线 + 小圆点。

## fill / fillFn

```js
s.math.fill('f', pts)
s.math.fillFn('area', f, { domain, range, x, y, width, height })
```

fill: 默认 opacity 0.45。fillFn: 函数曲线下填充。

## grid / axes

```js
s.math.grid('g', [ox,oy], { width, height })
s.math.axes('ax', [ox,oy], { xLen, yLen })
```

grid: dim 色 0.3px。axes: dim 色 1.4px 带箭头。

## fn

```js
s.math.fn('sin', f, { domain, x, y, width, height })
```

默认：primary 色 1.5px，200 采样点。range 自动推断。

## symbol / arc

```js
s.math.symbol('s', [x,y], { type: 'star' })
s.math.arc('a', [cx,cy], { outerR, startAngle, endAngle })
```

7 种 symbol：circle/cross/diamond/square/star/triangle/wye。

## 通用链式

point-like（point/circle/polygon/rect/symbol）：`.color()` `.strokeW()` `.fill()` `.opacity()` `.label()` `.size()`
line-like（segment/polyline/vector）：`.color()` `.strokeW()` `.dashed()` `.opacity()` `.label()`
