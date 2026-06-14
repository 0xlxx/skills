---
name: learnvis
description: D3+SVG visualization — math, graph, layout primitives for algorithm lessons
---

# learnvis

按领域索引。agent 读签名判断能力，需要详情时读子文件。

## math — 数学原语

所有原语第一个参数为显式 `id`，返回链式 Builder。

| 签名 | 说明 |
|------|------|
| `s.math.point('P',[x,y]).color('danger').label('P').size(6)` | 标注点 |
| `s.math.vector('v',[x1,y1],[x2,y2]).color('primary').label('v⃗')` | 向量（箭头+标记+标签） |
| `s.math.segment('AB',A,B).color('dim').dashed('5 3')` | 线段 |
| `s.math.circle('c',[cx,cy],r).color('accent')` | 圆（默认淡色填充） |
| `s.math.polygon('tri',[A,B,C]).color('info').opacity(0.6)` | 多边形 |
| `s.math.rect('box',cx,cy,w,h)` | 矩形（= polygon 糖） |
| `s.math.ngon('hex',cx,cy,r,6)` | 正 n 边形 |
| `s.math.ellipse('e',cx,cy,rx,ry)` | 椭圆（= polygon 糖） |
| `s.math.angle('θ',vertex,ray1,ray2).color('warning').label('45°')` | 角度弧（纯描边，无填充） |
| `s.math.rightAngle('R',vertex,ray1,ray2,{size:10}).color('danger')` | 直角标记 L 型 |
| `s.math.grid('g',[ox,oy],{width,height,spacing})` | 坐标网格 |
| `s.math.axes('ax',[ox,oy],{xLen,yLen,xLabel,yLabel})` | 坐标轴（箭头+标记） |
| `s.math.fn('sin',f,{domain,range,x,y,width,height}).color('primary')` | 函数曲线（自动缩放） |
| `s.math.symbol('s',[x,y],{type:'star',size:12,color:'danger'})` | d3 symbol（7 种） |
| `s.math.arc('a',[cx,cy],{outerR,startAngle,endAngle})` | d3 arc（扇形/环形） |
| `s.math.projection('p',pt,lineFrom,lineTo).color('danger')` | 垂足（自动计算+虚线+垂足点） |
| `s.math.fill('f',pts,{color:'info',opacity:0.3})` | 填充多边形 |
| `s.math.fillFn('area',f,{domain,range,x,y,width,height,color,baseline})` | 函数定积分填充 |

**通用链式方法**（组合自 mixins）：`.color()` `.label()` `.opacity()` `.strokeW()` `.dashed()` `.fill()`

**变换方法**（vector/polygon）：`.rotate(deg,cx,cy)` `.scale(s)` `.translate(dx,dy)` — 纯数学修改坐标

> 详见 `references/api-math.md`

## graph — 图论

| 签名 | 说明 |
|------|------|
| `s.graph.vertex('A',[x,y]).color('primary').label('A').size(12)` | 顶点 |
| `s.graph.edge(a,b,{directed}).color('dim').strokeW(1.4).weight(5)` | 边（默认有向） |
| `s.graph.layout('force'/'circular',v,e)` | 自动布局 |

> 详见 `references/api-graph.md`

## layout — 布局原语

| 签名 | 说明 |
|------|------|
| `s.layout.node('A',x,y,{w,h,rx}).color('primary').label('A').port('p',pos)` | 节点 + 端口 |
| `s.layout.block('b',x,y,w,h,{style:'normal'|'muted'|'active'})` | 容器节点 |
| `s.layout.edge('e','from','to').color('dim').directed(true).strokeW(1.4)` | 边（自动偏移避开端口） |
| `s.layout.layer('L',rank,{totalRanks,w,color,style:'band'|'swimlane',label})` | 分层色带/泳道 |
| `s.layout.enclosure('E',x,y,w,h,{color,dash,rx}).label('Group')` | 虚线包围框 |

> 详见 `references/api-layout.md`

## common — 通用工具

| 签名 | 说明 |
|------|------|
| `s.ctx.callout({x,y},'text',{place:'right',gap,style})` | HTML overlay 标注 |
| `s.tag(target,html).above(gap).color(c)` | 绑定标签（自动跟随） |

> 详见 `references/api-common.md`

## controlflow — 生命周期

| 签名 | 说明 |
|------|------|
| `LearnVis.stage('#sel',{width,height,theme})` | 入口 |
| `s.steps([{label, frame(s){...}}])` | 声明式步骤动画（返回 StepsController） |
| `s.frame(s => { ... }, { ms? })` | 单帧异步渲染 |
| `s.play([s=>{...}, ...], { ms? })` | 程序式多帧动画 |
| `s.frames.begin(); ...; s.frames.commit({ ms?, animate? })` | 直接 FrameManager 管线 |
| `LearnVis.stepper(container, labels, onChange)` | 独立步骤控件 |

**主题：** `stage({theme:'warm'|'cool'|'dark'|'paper'|'vivid'|'soft'})`

> 详见 `references/api-controlflow.md`

## atomic — 原子层

| 签名 | 说明 |
|------|------|
| `FrameManager` + `SVGRenderer` | ECS 管线：begin → declare → commit |
| `fm.declare(id, state)` | 创建/更新 entity |
| `fm.patch(id, partial)` | 局部更新 |
| `fm.get(id, type)` | 泛型安全 getter |
| EntityId branded type | `eid(prefix, id)` → `"point:O"` |

> 详见 `references/api-atomic.md`

## 架构

- **FrameManager** — ECS 风格声明式管线：`begin() → declare() → commit()`
- **Mixins** — 可组合 Builder 特征工厂：`coreNodeMixin`（共享节点特征），`mixColor/mixStrokeW/mixOpacity/...`
- **Renderer** — 策略模式，`SVGRenderer` 为默认实现（`vis/renderer/svg.ts`）
- **EntityId** — branded type：`eid(prefix, id)` → `"point:A"`, `"vertex:B"`, `"fill:L"`
- **Color pipeline** — oklch theme → `resolveColor()` → `svgColor()` → hex SVG attribute
- **Transform** — 纯描述符 `.rotate()/.scale()/.translate()` 修改坐标，`interpolate()` 平滑插值
- **Label** — 统一 `label`/`labelPlace`/`labelGap` 字段，region 支持四个方向

## 构建

```
pnpm build    # IIFE (dist/learnvis.iife.js) + ESM (dist/learnvis.mjs) + .d.ts
pnpm check    # tsc --noEmit 类型检查
pnpm test     # vitest, 150 tests
```

## 独立 HTML 使用

CDN: `https://cdn.jsdelivr.net/gh/0xlxx/skills@main/learnvis/assets/learnvis.iife.js`

```html
<script src="https://cdn.jsdelivr.net/gh/0xlxx/skills@main/learnvis/assets/learnvis.iife.js"></script>
<script>
const s = LearnVis.stage('#stage', { width: 780, height: 460, theme: 'paper' });
s.frames.begin();
s.math.point('O', [390, 230]).color('danger').label('O');
s.frames.commit({ animate: false });
</script>
```

> 详见 `references/guide-standalone.md`
