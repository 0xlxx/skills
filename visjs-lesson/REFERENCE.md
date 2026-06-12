# vis.js API Reference

All functions accessed via `const ctx = Vis.setup(selector, W, H, M)`.

**Legend**: `required` = must pass. Everything else is optional (has a sensible default).

---

## Canvas & groups

| Key | Value |
|-----|-------|
| `ctx.W`, `ctx.H`, `ctx.M` | Width, height, margin (numbers) |
| `ctx.bg` | Background group — compound rects, layer backgrounds, guides. **Cleared each phase.** |
| `ctx.nG` | Node group — real nodes. **data-id tracked, animated across phases.** |
| `ctx.eG` | Edge group — edges between nodes. **data-id tracked, animated across phases.** |
| `ctx.oG` | Overlay group — annotations, raw SVG, port dummies. **Cleared each phase.** |

**Rule**: Nodes → `nG`. Edges → `eG`. Transient decorations → `oG` or `bg`.

---

## Config (0014 defaults)

| Key | Default | Usage |
|-----|---------|-------|
| `ctx.nW`, `ctx.nH` | 38, 28 | Node dimensions |
| `ctx.dR`, `ctx.rx` | 8, 6 | Dummy radius, node corner radius |
| `ctx.gap` | 4 | Edge entry gap |
| `ctx.dim`, `ctx.emph`, `ctx.conflict` | Gray, green, red | Three palette colors |
| `ctx.marker(c)` | fn | Returns arrow marker URL for given color |

---

## Adaptive drawing (smooth transitions)

All draw functions use `data-id` matching across phases. Matching elements **transition** position/style. New elements **fade in**. Stale elements **fade out**.

---

### `ctx.node(g, n, opts?)`

Draws a node (rect or circle for dummy). Color presets for zero-config use.

```javascript
// Presets:
ctx.node.dim(nG, n)       // optional label
ctx.node.emph(nG, n, { label:'a₁' })   // optional label
ctx.node.r(nG, n)         // optional label — conflict color

// Full control:
ctx.node(nG, {
  id: 'A',              // required — for data-id tracking
  x: 200, y: 150,       // required — center position
  nW: 38, nH: 28,       // optional — defaults to ctx.nW, ctx.nH
  t: 'dummy',           // optional — 'dummy' draws circle, else rect
}, {
  label: 'A',           // optional — text inside the node
  fill: '...',          // optional — override fill color
  stroke: '...',        // optional — override stroke color
  strokeW: 1.5,         // optional
  textSize: 11,         // optional
  textFill: '...',      // optional
})
```

---

### `ctx.edge(g, from, to, opts?)`

Straight line between two nodes. Auto-computes edge endpoints from node geometry.

```javascript
ctx.edge(eG,
  { id:'A', x, y, nW, nH },   // required — source node
  { id:'B', x, y, nW, nH },   // required — target node
  {
    stroke: ctx.conflict,     // optional — auto-resolves marker color
    strokeW: 2,               // optional — defaults to ctx.sw (1.9)
    dash: '5 4',              // optional — dasharray
    markerUrl: '...',         // optional — auto-resolved from stroke
    gap: 4,                   // optional — entry gap
  }
)
```

---

### `ctx.edgePath(g, from, to, opts?)`

L-shaped orthogonal path between two nodes.

```javascript
ctx.edgePath(eG,
  { id:'A', x, y, nW, nH },   // required
  { id:'B', x, y, nW, nH },   // required
  {
    stroke: ctx.dim,          // optional
    strokeW: 1.9,             // optional
    dash: '3 3',              // optional
  }
)
```

---

### `ctx.dummy(g, n, opts?)`

Circle with optional external label. For port dummies, segment endpoints, etc.

```javascript
ctx.dummy(oG, {
  id: 'd1',         // required — for data-id
  x: 300, y: 200,  // required — center
  r: 8,            // optional — defaults to ctx.dR
  fill: '#fff',    // optional — fill color
}, {
  textSize: 8,     // optional — set to 0 to hide label
  label: 'd^E',    // optional — text (defaults to n.id)
  labelSide: 'right',  // optional — left|right|top|bottom (default: left)
  labelGap: 8,     // optional — label distance from circle edge
  halo: true,      // optional — colored ring behind circle
  stroke: '...',   // optional
  strokeW: 1.2,    // optional
})
```

---

### `ctx.lBend(g, from, to, bendX, opts?)`

L-shaped path bending at x = bendX. Uses `opts.id` for data-id tracking.

```javascript
ctx.lBend(eG,
  { x:100, y:200 },    // required — from point
  { x:300, y:150 },    // required — to point
  250,                  // required — bend X coordinate
  {
    id: 'seg1',         // required — for data-id (otherwise won't animate)
    stroke: ctx.emph,   // optional
    strokeW: 2,         // optional
    dash: '3 3',        // optional
  }
)
```

---

### `ctx.compoundRect(g, rect, opts?)`

Rounded rectangle with optional label. For compound nodes / hierarchical containers.

```javascript
ctx.compoundRect(bg, {
  x: 100, y: 120,     // required — top-left
  w: 200, h: 180,     // required — size
  rx: 12,             // optional — corner radius (default 12)
}, {
  id: 'CA',           // optional — for data-id (default 'c')
  label: 'CA',        // optional — text in top-left corner
  fill: '...',        // optional — default blue-tinted
  stroke: '...',      // optional
  strokeW: 2,         // optional
  lc: '...',          // optional — label color
})
```

---

### `ctx.crossEdge(opts)`

High-level: draws a cross-compound edge. Computes port positions on compound walls automatically.

```javascript
const result = ctx.crossEdge({
  from: N.a1,              // required — { x, y }
  to: N.b1,                // required — { x, y }
  fromRect: CA,            // required — { x, y, w, h }
  toRect: CB,              // required — { x, y, w, h }
  mode: 'split',           // required — 'split' | 'restore' | 'direct'
  color: ctx.conflict,     // optional — defaults to emph green
  strokeW: 2,              // optional
  dash: '3 3',             // optional — dasharray for split mode
  id: 'ce',                // optional — base id for data-id (default 'ce')
  portInset: 26,           // optional — internal port distance from wall
  midOffset: 30,           // optional — mid segment extends past wall
})
// result.ports: { fromExt, toExt, fromInt, toInt }
```

**Modes**:
- `'split'` — 3 segments + 4 port dummies. Preprocessor view.
- `'restore'` — 1 continuous path + bend-point dots. Postprocessor view.
- `'direct'` — 1 straight line. Problem view.

---

## DOM labels (HTML overlay)

```javascript
ctx.domLabel(anchor, html, opts?)
```

Anchor to SVG position or element. KaTeX auto-detected (`$...$` / `$$...$$`).

```javascript
// Anchor to a point {x, y}:
ctx.domLabel({ x: 200, y: 100 }, 'Label text', {
  place: 'above',        // optional — above|below|left|right|center (default: above)
  gap: 8,               // optional — pixels in viewBox space
  style: {               // optional — CSS properties
    color: 'oklch(0.48 0.18 22)',
    fontSize: '12px',
    fontWeight: 600,
  },
})

// Anchor to a D3 selection (follows element):
ctx.domLabel(someSelection, 'Label')

// Anchor to a node rect (aligns to edge):
ctx.domLabel({ x, y, nW, nH }, 'Label', { place:'right' })
```

---

## Stepper

```javascript
// Read texts from <template id="t0">...<template id="tN">
const texts = ctx.pages(count);             // optional prefix — default 't'
const texts = ctx.pages(5, 'phase');       // reads #phase0..#phase4

// Wire stepper
ctx.go('.stepper button', {
  panel: '#panel-right',     // required — selector for text injection
  texts,                     // required — array of html strings
  draw: (s) => draw(() => phases(s)),  // required — called on step change
  start: 0,                  // optional — initial step (default 0)
})
```

---

## Rendering lifecycle

```javascript
ctx.update(fn, ms?)   // 'draw' — smooth transition of shared elements (default 500ms)
ctx.render(fn, ms?)    // full redraw with fade-in (default 400ms)

// Always use update() for multi-phase lessons.
// Use render() only for static single-view diagrams.
```

---

## Arrows

```javascript
ctx.arrows();  // required once after setup — creates 3 arrow markers

// marker(c) auto-resolves:
ctx.marker(ctx.conflict)  // → 'url(#a-R)' — red
ctx.marker(ctx.emph)      // → 'url(#a-G)' — green
ctx.marker(ctx.dim)       // → 'url(#a-dim)' — gray
```

---

## Layer helpers

```javascript
// Colored background strips at layer positions:
ctx.layerBg([y1, y2], {
  bgFill: 'oklch(0.90 0.02 155 / 0.12)',   // optional
  h: 52,                                    // optional — strip height
  rx: 8,                                    // optional — corner radius
})

// Horizontal separator lines between layers:
ctx.guides([y1, y2, y3], {
  x1: ctx.M + 20,       // optional
  x2: ctx.W - ctx.M - 20,  // optional
  stroke: '...',         // optional
})
```

---

## Raw SVG helpers (use sparingly)

```javascript
ctx.halo(g, cx, cy)              // highlight rect around node position
ctx.halo(g, cx, cy, { fill, stroke, strokeWidth, pad })  // optional overrides

ctx.label(g, x, y, text, opts?)  // SVG <text> element
// opts: { size, fill, anchor, weight, font }

ctx.eLabel(g, f, t, ratio, text, opts?)  // edge label at fraction t
// opts: { size, fill, bgFill, bgPad }

ctx.bbox(nodes) → { mx, my, Mx, My }     // compute bounding box
ctx.bboxRect(g, bounds, opts?)            // draw outlined rect
// opts: { fill, stroke, strokeW, dash, rx }
```

---

## Common pitfalls

1. **KaTeX no `defer`/`async`** — inline scripts run before deferred, so `window.katex` would be undefined.
2. **Text in `<template>`, not JS strings** — avoids Chinese + KaTeX escaping. Use `ctx.pages(N)`.
3. **Nodes must have `id`** — required for `data-id` matching and smooth transitions.
4. **`{x, y}` anchors for domLabel are points** — no need to add `nW:0, nH:0`.
5. **`edge()` and `edgePath()` are distinct** — don't switch between them for the same node pair; it breaks transitions.
6. **`bg` and `oG` fully cleared each phase** — only `nG` and `eG` track `data-id`.
7. **`crossEdge` draws into `oG` automatically** — no `_seenIds` needed.
8. **`lBend` requires `opts.id`** — without it, not tracked, fades out between phases.
9. **`ctx.arrows()` must be called once** — before any drawing that uses markers.
10. **`ctx.domLabel` must be called after svg is in DOM** — don't call in setup, call inside phase functions.
