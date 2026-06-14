---
name: learnvis
description: D3+SVG visualization — math, graph, layout primitives for algorithm lessons
---

# learnvis

80% 场景只需 `id + 坐标`，零配置可用。其余 20% 按需链式定制。

## math

| 最简 | 说明 |
|------|------|
| `s.math.point('P',[x,y])` | 标注点（r=4, primary 色填充） |
| `s.math.vector('v',[x1,y1],[x2,y2])` | 向量（箭头+标签） |
| `s.math.segment('AB',A,B)` | 线段（dim 灰, 1.5px） |
| `s.math.polyline('p',[A,B,C])` | 折线段（多段开放路径） |
| `s.math.circle('c',[cx,cy],r)` | 圆（淡色填充） |
| `s.math.polygon('tri',[A,B,C])` | 多边形（淡色填充） |
| `s.math.rect('box',cx,cy,w,h)` | 矩形（≈ polygon） |
| `s.math.ngon('hex',cx,cy,r,6)` | 正 n 边形 |
| `s.math.ellipse('e',cx,cy,rx,ry)` | 椭圆 |
| `s.math.fill('f',pts)` | 填充多边形 |
| `s.math.fillFn('area',f,{domain,range,x,y,width,height})` | 函数积分填充 |
| `s.math.angle('θ',vertex,ray1,ray2)` | 角度弧 |
| `s.math.rightAngle('R',vertex,ray1,ray2)` | 直角标记 |
| `s.math.symbol('s',[x,y],{type:'star'})` | d3 symbol（7 种） |
| `s.math.arc('a',[cx,cy],{outerR,startAngle,endAngle})` | 扇形/环形 |
| `s.math.fn('sin',f,{domain,x,y,width,height})` | 函数曲线（自动缩放） |
| `s.math.grid('g',[ox,oy],{width,height})` | 坐标网格 |
| `s.math.axes('ax',[ox,oy],{xLen,yLen})` | 坐标轴 |
| `s.math.projection('p',pt,lineFrom,lineTo)` | 垂足（自动计算） |

**链式定制（可选）：** `.color(c)` `.label(t)` `.strokeW(n)` `.dashed(d)` `.fill(c)` `.opacity(v)` `.size(n)`
**变换：** `.rotate(deg,cx,cy)` `.scale(s)` `.translate(dx,dy)`（vector/polygon）

> 详见 `references/api-math.md`

## graph

| 最简 | 说明 |
|------|------|
| `s.graph.vertex('A',[x,y])` | 顶点（r=10, primary 色填充, label=A） |
| `s.graph.edge(a,b)` | 边（默认有向, dim 灰, 1.8px） |
| `s.graph.layout('circular',v)` | 圆周均分 |
| `s.graph.layout('force',v,e)` | D3 force 模拟 |

**链式：** `.color(c)` `.label(t)` `.size(r)` `.strokeW(n)` `.dashed(d)` `.weight(n)`

> 详见 `references/api-graph.md`

## layout

| 最简 | 说明 |
|------|------|
| `s.layout.node('A',x,y)` | 节点（rect, primary 色, 60×36, label=A above） |
| `s.layout.block('B',x,y,w,h)` | 复合节点/容器（normal 样式, 支持 port） |
| `n.port('p','top')` | 端口（置于节点/block 上） |
| `s.layout.edge('e','from','to')` | 边（dim 灰, 1.5px, 自动偏移避端口） |
| `s.layout.layer('L',rank,{totalRanks,w})` | 分层色带（band 纯色, label 左上角） |

**layer 两种风格：** `style:'band'`（默认，纯色） / `style:'swimlane'`（虚线边框）
**链式：** `.color(c)` `.label(t)` `.strokeW(n)` `.dashed(d)` `.opacity(v)` `.size(w,h)` `.directed(v)`

> 详见 `references/api-layout.md`

## controlflow

| 签名 | 说明 |
|------|------|
| `LearnVis.stage('#sel',{width,height})` | 入口（theme 默认 warm） |
| `s.steps([{label, frame(s){...}}])` | 步骤动画 → StepsController |
| `s.frame(s => { ... })` | 单帧渲染 |
| `s.frames.begin(); ...; s.frames.commit()` | 直接 FrameManager |

**主题：** `stage({theme:'warm'|'cool'|'dark'|'paper'|'vivid'|'soft'})`

> 详见 `references/api-controlflow.md`

## common

| 签名 | 说明 |
|------|------|
| `s.ctx.callout({x,y},'text')` | HTML overlay 标注 |

> 详见 `references/api-common.md`

## 独立 HTML

```html
<script src="https://cdn.jsdelivr.net/gh/0xlxx/skills@main/learnvis/assets/learnvis.iife.js"></script>
<script>
const s = LearnVis.stage('#stage', { width: 780, height: 460 });
s.frames.begin();
s.math.point('O', [390, 230]).color('danger').label('O');
s.frames.commit();
</script>
```

> 详见 `references/guide-standalone.md`

## 架构

FrameManager ECS 管线：`begin() → declare() → commit()`。Mixins 组合 Builder。
EntityId branded type。oklch → hex 颜色管线。
Label 统一 `label`/`labelPlace`/`labelGap`。

## 反馈

**[github.com/0xlxx/learnvis/issues/new](https://github.com/0xlxx/learnvis/issues/new)**
