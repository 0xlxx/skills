# vis.js API Reference

All functions accessed via `const ctx = Vis.setup(selector, W, H, M)`.

## Canvas & groups

| Key | Value |
|-----|-------|
| `ctx.W, ctx.H, ctx.M` | Width, height, margin (numbers) |
| `ctx.bg` | Background group — compound rects, layer backgrounds, guides (CLEARED each phase) |
| `ctx.nG` | Node group — real nodes, D3 data-join with `data-id` tracking (PERSISTENT, animated) |
| `ctx.eG` | Edge group — edges between nodes, `data-id` tracking (PERSISTENT, animated) |
| `ctx.oG` | Overlay group — annotations, raw SVG, port dummies (CLEARED each phase) |

**Rule**: Nodes go in `nG`, edges in `eG`, transient decorations in `oG` or `bg`.

## Config (0014 defaults)

| Key | Default | Usage |
|-----|---------|-------|
| `ctx.nW, ctx.nH` | 38, 28 | Node dimensions |
| `ctx.dR, ctx.rx` | 8, 6 | Dummy radius, node corner radius |
| `ctx.gap` | 4 | Edge entry gap |
| `ctx.dim, ctx.emph, ctx.conflict` | Gray, green, red | Three palette colors |
| `ctx.marker(c)` | fn | Returns arrow marker URL for given color |

## Adaptive drawing (smooth transitions)

These use `data-id` matching across phases. When `data-id` matches a previous phase, the element **transitions** position/style. When new, it **fades in**. Elements not in current phase **fade out**.

| Function | Signature | Data-id | Where |
|----------|-----------|---------|-------|
| `ctx.node(g, n, opts)` | `node.emph(nG, {id,x,y,nW,nH}, {label})` | `n.id` | `nG` |
| `ctx.edge(g, from, to, opts)` | `edge(eG, f, t)` | `f.id + '→' + t.id` | `eG` |
| `ctx.edgePath(g, from, to, opts)` | L-shaped path between nodes | same | `eG` |
| `ctx.dummy(g, n, opts)` | Circle + optional label | `n.id` | `oG` |
| `ctx.lBend(g, from, to, bx, opts)` | L-bend path at x=bendX | `opts.id` | `eG` |
| `ctx.crossEdge(opts)` | See [crossEdge](#crossedge) | `opts.id` | `oG` |
| `ctx.compoundRect(bg, rect, opts)` | Rounded rect with label | `compound-{id}` | `bg` |

### node() options

```javascript
// Color presets (zero-config):
ctx.node.dim(g, n)      // dim fill
ctx.node.emph(g, n)     // emph fill  
ctx.node.r(g, n)        // conflict fill + stroke

// Manual:
ctx.node(nG, n, { fill: color, stroke: color, label: 'text', textSize: 12 })
```

### edge() / edgePath() options

```javascript
ctx.edge(eG, from, to, { stroke: ctx.conflict, strokeW: 2, dash: '5 4' })
// marker auto-resolved from stroke color
```

### dummy() options

```javascript
ctx.dummy(oG, { id:'d', x, y, r:dR, fill:color }, {
  textSize: 8,           // 0 to hide label
  label: 'label',        // text content
  labelSide: 'right',    // left|right|top|bottom
  halo: true,            // show colored ring
})
```

### compoundRect() options

```javascript
ctx.compoundRect(bg, { x, y, w, h, rx:12 }, {
  id: 'c',               // for data-id
  label: 'CA',           // text in top-left
  fill, stroke, strokeW,  // override defaults
})
```

### lBend() options

```javascript
ctx.lBend(eG, from, to, bendX, {
  id: 'seg1',            // required for data-id
  stroke, strokeW, dash,  // style overrides
})
```

## crossEdge

High-level: draws a cross-compound edge. Computes port positions on compound walls.

```javascript
const result = ctx.crossEdge({
  from: N.a1, to: N.b1,          // source/target nodes {x,y}
  fromRect: CA, toRect: CB,       // compound rects {x,y,w,h}
  color: ctx.conflict,
  strokeW: 2,
  dash: '3 3',                    // dasharray (default '' = solid)
  mode: 'split',                  // 'split' | 'restore' | 'direct'
  portInset: 26,                  // how far internal ports sit from wall
  midOffset: 30,                  // how far middle segment extends beyond wall
});
// result.ports: { fromExt, toExt, fromInt, toInt }
```

**Modes**:
- `'split'` — 3 dashed segments + 4 port dummies. Shows the preprocessor decomposition.
- `'restore'` — 1 continuous solid path + bend-point dots. Shows postprocessor merging.
- `'direct'` — 1 straight line node-to-node (ignores compound walls). Shows the problem.

## DOM labels (HTML overlay)

```javascript
ctx.domLabel(anchor, html, opts)
```

`anchor` can be:
- A node object `{x, y}` — automatically treated as a point (no `nW:0` needed)
- A D3 selection (labels follow element position)
- A `{x, y, nW, nH}` object — label anchored to rect edge

```javascript
ctx.domLabel({ x: 100, y: 200 }, 'Some text', {
  place: 'above',        // above|below|left|right|center (default: above)
  gap: 8,               // pixels in viewBox space
  style: { color: 'red', fontSize: '12px', fontWeight: 600 },
})
```

KaTeX auto-detected: wrap math in `$...$` or `$$...$$`.

## Stepper

```javascript
// Read texts from <template id="t0">...<template id="tN">
const texts = ctx.pages(count);           // default prefix 't'
const texts = ctx.pages(5, 'phase');     // reads #phase0..#phase4

// Wire stepper
ctx.go('.stepper button', {
  panel: '#panel-right',     // where to inject text html
  texts,                     // array of html strings
  draw: (s) => draw(() => phases(s)),
});
```

## Rendering lifecycle

```javascript
ctx.draw(ms)  // 'update' destructured — smooth transition of shared elements
ctx.render(ms) // full redraw with fade-in over ms (default 400)
// Always use draw() for multi-phase lessons. render() only for static diagrams.
```

## Arrows

```javascript
ctx.arrows();  // call once after setup, creates 3 markers
// marker(c) auto-resolves: dim→gray, emph→green, conflict→red
ctx.marker(ctx.conflict)  // returns 'url(#a-R)'
```

## Guides & layer backgrounds

```javascript
ctx.layerBg([y1, y2], { bgFill: 'oklch(...)', rx: 8 })
ctx.guides([y1, y2, y3], { x1, x2 })  // horizontal separator lines
```

## Raw SVG helpers

```javascript
ctx.halo(g, cx, cy)             // highlight rect around a node position
ctx.label(g, x, y, text, opts)  // SVG <text> element
ctx.eLabel(g, f, t, ratio, text) // edge label at fraction t along straight edge
ctx.bbox(nodes) → bounds        // compute bounding box
ctx.bboxRect(g, bounds)         // draw outlined rect
```

## Common pitfalls

1. **KaTeX must load synchronously** — no `defer`/`async` on the katex.js `<script>` tag. Inline scripts run before deferred scripts.
2. **Text in `<template>`, not JS strings** — avoids Chinese + KaTeX escaping issues. Use `ctx.pages(N)` to read them.
3. **Nodes must have `id`** — required for `data-id` matching and smooth transitions.
4. **`{x,y}` anchors for domLabel work as points** — no need to add `nW:0, nH:0`.
5. **Phase-order matters for transitions** — `edge()` and `edgePath()` are distinct. If a pair switches from straight to L-shaped, use `edgePath()` consistently with `dash` toggling.
6. **`bg` and `oG` are fully cleared each phase** — only `nG` and `eG` participate in `data-id` tracking.
7. **`crossEdge` draws into `oG` automatically** — all elements redrawn each phase, no `_seenIds` needed.
8. **lBend requires `opts.id`** — without it, the edge won't be tracked and will fade out between phases.
