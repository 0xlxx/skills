# graph — 图论原语

## vertex

```js
const a = s.graph.vertex('A', [100, 200])
const b = s.graph.vertex('B', [300, 200]).color('primary').label('B').size(12).fill('#fff')
```

- 签名：`vertex(id: string, pos: Vec2): Vertex`
- 默认：r=10，primary 色填充（`p.primary.a(15)`）
- 位置手动指定，或由 `layout()` 自动计算
- 链式方法：`.color(c)` `.label(t)` `.size(r)` `.fill(c)` `.pos()`

## edge

```js
s.graph.edge(a, b)                              // 默认有向
s.graph.edge(a, b, { directed: false })         // 无向
s.graph.edge(a, b, { gap: 4 })                  // 自定义间距
```

- 签名：`edge(a: Vertex, b: Vertex, opts?: { directed?: boolean; gap?: number; marker?: MarkerConfig }): Edge`
- 默认：dim 灰色 stroke，strokeW 1.8，有向（`directed` 默认 true）
- 使用 `offsetLine()` 自动偏移端点，箭头与节点保持 gap 间距
- 链式方法：`.color(c)` `.strokeW(n)` `.dashed(d)` `.label(t)` `.weight(n)`
- `weight(n)` / `label(t)` — 边标签（当前 TODO，通过 callout 实现）

## layout

```js
s.graph.layout('circular', vertices, [], { center: [300, 200], radius: 150 })
s.graph.layout('force', vertices, edges, { center: [300, 200] })
```

- `circular` — 均匀等分圆周（默认半径 `Math.min(W, H) * 0.35`）
- `force` — D3 forceSimulation（charge -300，collision 检测，link distance 60，300 tick）
- layout 后自动 `fm.declare()` 更新所有顶点位置
