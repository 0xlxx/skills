---
name: learnvis
description: D3+SVG visualization — math, graph, layout primitives for algorithm lessons
---

# learnvis

D3+SVG 可视化库，用于算法教学。80% 场景只传 id + 坐标。

## Quick Start

```html
<script src="https://cdn.jsdelivr.net/gh/0xlxx/skills@main/learnvis/assets/learnvis.iife.js"></script>
<script>
const s = LearnVis.stage('#stage', { width: 780, height: 460 });
s.frames.begin();
s.math.point('O', [390, 230]).color('danger').label('O');
s.frames.commit();
</script>
```

## Math

所有原语 `(id, 坐标, ...)` — 默认值即合理。

| 签名 | 说明 | Reference |
|------|------|-----------|
| `s.math.point('P',[x,y])` | 标注点 | [api-math](references/api-math.md#point) |
| `s.math.vector('v',[x1,y1],[x2,y2])` | 向量（箭头） | [api-math](references/api-math.md#vector) |
| `s.math.segment('AB',A,B)` | 线段 | [api-math](references/api-math.md#segment) |
| `s.math.polyline('p',[A,B,C])` | 折线段 | [api-math](references/api-math.md#polyline) |
| `s.math.circle('c',[cx,cy],r)` | 圆 | [api-math](references/api-math.md#circle) |
| `s.math.polygon('tri',[A,B,C])` | 多边形 | [api-math](references/api-math.md#polygon) |
| `s.math.rect('box',cx,cy,w,h)` | 矩形 | [api-math](references/api-math.md#rect--ngon--ellipse) |
| `s.math.ngon('hex',cx,cy,r,6)` | 正 n 边形 | [api-math](references/api-math.md#rect--ngon--ellipse) |
| `s.math.fill('f',pts)` | 填充多边形 | [api-math](references/api-math.md#fill--fillfn) |
| `s.math.angle('θ',vertex,ray1,ray2)` | 角度弧 | [api-math](references/api-math.md#angle) |
| `s.math.fn('sin',f,{domain,x,y,width,height})` | 函数曲线 | [api-math](references/api-math.md#fn) |
| `s.math.grid('g',[ox,oy],{width,height})` | 坐标网格 | [api-math](references/api-math.md#grid--axes) |
| `s.math.axes('ax',[ox,oy],{xLen,yLen})` | 坐标轴 | [api-math](references/api-math.md#grid--axes) |

**链式（可选）：** `.color(c)` `.label(t)` `.strokeW(n)` `.dashed(d)` `.fill(c)` `.opacity(v)` `.size(n)`
**变换（vector/polygon）：** `.rotate(deg,cx,cy)` `.scale(s)` `.translate(dx,dy)`

> 详见 [references/api-math.md](references/api-math.md)

## Graph

| 签名 | 说明 | Reference |
|------|------|-----------|
| `s.graph.vertex('A',[x,y])` | 顶点（r=10，默认 label=A） | [api-graph](references/api-graph.md#vertex) |
| `s.graph.edge(a,b)` | 边（默认有向） | [api-graph](references/api-graph.md#edge) |
| `s.graph.layout('circular',v)` | 圆周布局 | [api-graph](references/api-graph.md#layout) |
| `s.graph.layout('force',v,e)` | Force 布局 | [api-graph](references/api-graph.md#layout) |

**链式：** `.color(c)` `.label(t)` `.size(r)` `.strokeW(n)` `.dashed(d)` `.weight(n)`

> 详见 [references/api-graph.md](references/api-graph.md)

## Layout

| 签名 | 说明 | Reference |
|------|------|-----------|
| `s.layout.node('A',x,y)` | 节点（60×36，primary 色） | [api-layout](references/api-layout.md#node) |
| `s.layout.block('B',x,y,w,h)` | 复合节点/容器 | [api-layout](references/api-layout.md#block) |
| `n.port('p','top')` | 端口（置于 node/block 上） | [api-layout](references/api-layout.md#port) |
| `s.layout.edge('e','from','to')` | 边（自动偏移避端口） | [api-layout](references/api-layout.md#edge) |
| `s.layout.layer('L',rank,{totalRanks,w})` | 分层色带（band） | [api-layout](references/api-layout.md#layer) |

**layer 风格：** `style:'band'`（默认，纯色） / `style:'swimlane'`（虚线边框）
**rank 是 0-based 整数索引，不是像素 Y。**

> 详见 [references/api-layout.md](references/api-layout.md)

## Control Flow

| 签名 | 说明 | Reference |
|------|------|-----------|
| `LearnVis.stage('#sel',{width,height})` | 入口（theme 默认 warm） | [api-controlflow](references/api-controlflow.md) |
| `s.steps([{label, frame(s){...}}])` | 步骤动画 | [api-controlflow](references/api-controlflow.md) |
| `s.frames.begin(); ...; s.frames.commit()` | 低层管线 | [api-atomic](references/api-atomic.md) |

## Common Patterns

### Sugiyama 分层布局

```js
const s = LearnVis.stage('#stage', { width: 700, height: 440 });
s.frames.begin();

// 3 层 band，自动定位
for (let i = 0; i < 3; i++) {
  s.layout.layer(`L${i}`, i, { totalRanks: 3, w: 700, startY: 50, endY: 390, layerGap: 4 });
}

// 节点 + 端口
const nodes = { A: [200,80], B: [340,80], C: [270,220], D: [200,360], E: [340,360] };
for (const [k,[x,y]] of Object.entries(nodes)) {
  const n = s.layout.node(k, x, y, { w: 44, h: 28, rx: 5 }).color('primary').label(k);
  n.port(k+'-in','top',{size:3}).color('dim');
  n.port(k+'-out','bottom',{size:3}).color('dim');
}

// 边（直线）
const edges = [['A','C'],['B','C'],['C','D'],['C','E'],['A','E']];
for (const [src,dst] of edges) {
  s.layout.edge(src+'-'+dst, src+'-out', dst+'-in').color('dim').directed(true).strokeW(1.4);
}

s.frames.commit({ animate: false });
```

### 正交路由（polyline）

```js
// 3 段折线：下→水平→下
const midY = (sy + dy) / 2;
s.math.polyline('route', [[sx,sy],[sx,midY],[dx,midY],[dx,dy]]).color('dim').strokeW(1.5);
```

### 复合节点（block）

```js
const blk = s.layout.block('Sorter', 200, 130, 140, 110, { style: 'normal', rx: 8 }).label('Sorter');
blk.port('top', 'top', { size: 5 }).color('primary');
blk.port('bottom', 'bottom', { size: 5 }).color('primary');
s.layout.node('cmp', 200, 110, { w: 48, h: 22, rx: 4 }).color('warning').label('cmp');
```

### 步骤动画

```js
const steps = [
  { label: 'Step 1', frame: s => { s.math.point('P', [100, 200]); } },
  { label: 'Step 2', frame: s => { s.math.point('P', [300, 200]).color('danger'); } },
];
const ctrl = s.steps(steps);
// 配合 LearnVis.stepper(container, labels, onChange)
```

## Best Practices

1. **port 必须创建** — `edge()` 用 port ID，不用 node ID。先 `node.port()` 再 `edge()`
2. **rank 是索引** — `layer(rank)` 传 0/1/2，不传像素 Y
3. **begin 必配 commit** — 漏写 `begin()` 会导致 `commit() required before begin()`
4. **id 不能空** — `eid()` 对空字符串有防护，但建议始终传有意义 id
5. **变量名别覆盖** — `for (const [s,d] of edges)` 会把 stage 变量 `s` 变成字符串

## 反馈

用得不爽直接提 issue：**[github.com/0xlxx/learnvis/issues/new](https://github.com/0xlxx/learnvis/issues/new)**
