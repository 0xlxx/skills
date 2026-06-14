# layout — 布局原语

图论/算法可视化的布局系统：node, block, port, edge, layer, enclosure。

## node

```js
const n = s.layout.node('A', x, y, { w: 64, h: 30, rx: 6 })
  .color('primary').label('A')
n.port('A-out', 'bottom', { size: 4 }).color('dim')
n.port('A-in', 'top', { size: 4 }).color('dim')
```

- 圆角矩形节点（默认 `shape: 'rect'`）
- `.label(t)` — 标签（默认 `labelPlace: 'above'`）
- `.size(w, h)` — 修改尺寸
- `.port(id, pos, opts)` — 添加端口，返回 `LayoutPort`
- `.moveTo(x, y)` — 移动节点

## block

```js
s.layout.block('blk', x, y, w, h, { style: 'normal', rx: 8 }).label('Container')
```

- 容器节点，三种预设样式：`'muted'` | `'normal'` | `'active'`
- 支持 `.port()` 和 `.label()`
- `x, y` 为左上角坐标

## port

端口通过 `node.port()` 或 `block.port()` 创建，不直接调用。

| 方位 | 说明 |
|------|------|
| `'top'` `'bottom'` `'left'` `'right'` | 边中点 |
| `[dx, dy]` | 相对节点中心的偏移 |

```js
n.port('id', pos, { size: 4 }).color('primary')
// port 返回 LayoutPort，支持 .color() .size() .fill() .opacity() .label()
```

## edge

```js
s.layout.edge('e', 'fromPort', 'toPort')
  .color('dim').directed(true).strokeW(1.4)
```

- 从端口到端口，自动计算路径
- `.directed(v)` — 有向/无向
- `.dashed('6 3')` — 虚线
- `.bend()` — 弯曲
- `.label(t)` — 边标签

有向边箭头自动与目标端口保持 2px 间隙，不会被端口遮挡。

## layer

```js
// 纯色带（默认）
s.layout.layer('L', 0, { totalRanks: 4, w: 640, color: 'info', label: 'Rank 0' })

// 泳道（虚线边框容器）
s.layout.layer('L', 0, { totalRanks: 4, w: 640, color: 'info', style: 'swimlane', label: 'Phase' })
```

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `rank` | — | 当前层序号（0-based） |
| `totalRanks` | — | 总层数 → 自动计算 y 和 h |
| `style` | `'band'` | `'band'`（纯色填充）\| `'swimlane'`（虚线边框） |
| `color` | `'accent'` | 语义颜色名 |
| `opacity` | `0.30` (band) / `0.7` (swimlane) | 整体透明度 |
| `label` | `''` | 标签文本 |
| `labelPlace` | `'left'` | 标签位置：左上角内部 |
| `startY` / `endY` | `48` / `412` | 首层/末层 y 范围 |
| `layerGap` | `0` | 层间距 |
| `dash` | `'4 3'` (swimlane) | 边框虚线 |
| `rx` | `8` | 圆角半径 |
| `strokeW` | `1.2` (swimlane) | 边框宽度 |

**rank 自动定位：** 提供 `totalRanks` 后自动计算 `y = startY + rank * (h + layerGap)`。

**链式方法：** `.color()` `.opacity()` `.label()` `.dash()` `.strokeW()`

## enclosure

```js
s.layout.enclosure('E', x, y, w, h, { color: 'accent', dash: '6 3', rx: 10 })
  .strokeW(1.5).label('Group')
```

- 虚线圆角包围框（多边形 region）
- `.color()` `.dash()` `.strokeW()` `.opacity()` `.label()`
- 标签渲染在质心

## 完整示例

```js
const ly = s.layout;

// 3 层 Sugiyama
for (let i = 0; i < 3; i++) {
  ly.layer(`r${i}`, i, { totalRanks: 3, w: 400, startY: 30, endY: 270, layerGap: 4,
    color: ['info','warning','success'][i], label: `Rank ${i}` });
}

// 节点 + 端口 + 边
const a = ly.node('A', 200, 60, { w: 50, h: 24, rx: 4 }).color('primary').label('A');
a.port('A-out', 'bottom', { size: 4 }).color('dim');
const b = ly.node('B', 200, 180, { w: 50, h: 24, rx: 4 }).color('primary').label('B');
b.port('B-in', 'top', { size: 4 }).color('dim');
ly.edge('A-B', 'A-out', 'B-in').color('dim').directed(true).strokeW(1.4);
```
