---
name: visjs-lesson
description: Guideline for creating interactive D3-based algorithm/data-structure/CS lessons using vis.js. Use when building or editing any tutorial that uses HTML + SVG visualizations, or when user asks to create visual course content with vis.js.
---

# The key instruction

**Do not write raw d3 unless absolutely necessary.**

**Do not pass optional params unless you need to override the default.** Every drawing function has sensible defaults — color, stroke width, size, font. Only pass what you intend to change.

This skill bundles `vis.js` and `theme.css` — read them before writing any lesson code. The API reference is in [REFERENCE.md](REFERENCE.md).

# vis.js lesson authoring

## Skeleton

Copy this when creating a new lesson. Everything below `// go` is user-configurable.

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>L0000: Title</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="theme.css" />
    <style>
      * { box-sizing: border-box; }
      body { background: var(--bg); color: var(--text); font-family: var(--font); margin: 0; padding: 2rem 1.5rem; display: flex; justify-content: center; line-height: 1.6; }
      .page { max-width: 820px; width: 100%; }
      .nav { display: flex; gap: 1rem; margin-bottom: 0.6rem; font-size: 0.82rem; flex-wrap: wrap; }
      .nav a { color: var(--blue); text-decoration: none; }
      h1 { font-size: 1.4rem; font-weight: 700; margin: 0 0 0.1rem; }
      .sub { color: var(--text-muted); font-size: 0.82rem; margin-bottom: 0.8rem; }
      .stepper { display: flex; gap: 0.35rem; margin-bottom: 0.8rem; flex-wrap: wrap; }
      .stepper button { padding: 0.35rem 0.75rem; border: 1px solid var(--border); border-radius: 6px; background: var(--card); color: var(--text); cursor: pointer; font-family: var(--font); font-size: 0.78rem; }
      .stepper button.active { background: var(--blue); color: #fff; border-color: var(--blue); }
      .viz { margin: 0.8rem 0 1rem; }
      #d3-stage { width: 100%; max-width: 780px; aspect-ratio: 780/400; background: var(--card); border: 1px solid var(--border); border-radius: 10px; display: block; }
      .notes { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 1rem 1.2rem; font-size: 0.88rem; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="nav">← <a href="...">prev</a> → <a href="...">next</a></div>
      <h1>L0000: Title</h1>
      <p class="sub">Subtitle</p>
      <div class="stepper">
        <button class="active">① Step</button>
        <button>② Step</button>
      </div>
      <div class="viz"><div id="d3-stage"></div></div>
      <div class="notes" id="panel-right"></div>
      <template id="t0"><h3>Step 0</h3><p>Explanation in Chinese. Can include <code>code</code> and <b>bold</b>.</p></template>
      <template id="t1"><h3>Step 1</h3><p>More explanation.</p></template>
    </div>

    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="vis.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script>
const W = 780, H = 400, MARG = 40;
const ctx = Vis.setup('#d3-stage', W, H, MARG);
const { bg, nG, node, domLabel, compoundRect, update: draw, arrows } = ctx;
arrows();

function phases(s) { /* drawing logic per step */ }

ctx.go('.stepper button', {
  panel: '#panel-right',
  texts: ctx.pages(N),
  draw: (s) => draw(() => phases(s)),
});
    </script>
  </body>
</html>
```

## ctx API reference

See [REFERENCE.md](REFERENCE.md) for the full API catalog.
