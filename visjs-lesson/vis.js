// vis.js — D3-based visualization primitives for ELK lessons
// Load as: <script src="vis.js"></script>
// All functions access window.d3. Exposed as window.Vis.{fn}.

window.Vis = window.Vis || {};
const V = window.Vis;

// ── Geometry ──

V.len = (dx, dy) => Math.sqrt(dx * dx + dy * dy);

V.exitPt = (n, tx, ty, { nW = 38, nH = 28, dR = 8, gap = 0 } = {}) => {
  if (n.t === 'dummy') {
    const dx = tx - n.x, dy = ty - n.y, l = V.len(dx, dy);
    return { x: n.x + dx / l * dR, y: n.y + dy / l * dR };
  }
  const dy = ty - n.y;
  if (Math.abs(dy) > 10) return { x: n.x, y: n.y + Math.sign(dy) * (nH / 2) };
  return { x: n.x + Math.sign(tx - n.x) * (nW / 2), y: n.y };
};

V.entryPt = (n, fx, fy, { nW = 38, nH = 28, dR = 8, gap = 0 } = {}) => {
  if (n.t === 'dummy') {
    const dx = n.x - fx, dy = n.y - fy, l = V.len(dx, dy);
    return { x: n.x - dx / l * (dR + gap), y: n.y - dy / l * (dR + gap) };
  }
  const dy = n.y - fy;
  if (Math.abs(dy) > 10) return { x: n.x, y: n.y - Math.sign(dy) * (nH / 2 + gap) };
  return { x: n.x - Math.sign(n.x - fx) * (nW / 2 + gap), y: n.y };
};

// ── Drawing primitives ──

V.halo = (g, cx, cy, w, h, rx, {
  pad = 6,
  fill = 'oklch(0.92 0.015 75)',
  stroke = 'oklch(0.55 0.02 65 / 0.22)',
  strokeWidth = 1.5,
} = {}) => g.append('rect').attr('class','h')
  .attr('x', cx - w / 2 - pad).attr('y', cy - h / 2 - pad)
  .attr('width', w + pad * 2).attr('height', h + pad * 2)
  .attr('rx', rx + pad * 0.66)
  .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeWidth);

V.svgLabel = (g, x, y, text, opts = {}) => {
  const { size = 14, fill = 'oklch(0.25 0.02 60)', anchor = 'middle',
    weight = 700, font = 'JetBrains Mono,monospace', paintOrder = false } = opts;
  const el = g.append('text').attr('x', x).attr('y', y).attr('text-anchor', anchor)
    .style('font-family', font).style('font-size', size + 'px')
    .style('font-weight', weight).style('fill', fill).text(text);
  if (paintOrder) el.style('paint-order', 'stroke').style('stroke', '#fff').style('stroke-width', '3');
  return el;
};

// defineArrows(svg, opts) — create 3 color-coded markers, return { marker }
// marker(color) returns the matching marker URL for that edge color.
// sw property sets default stroke-width for dim/emph markers.
V.defineArrows = (svg, {
  sw = 1.9,
  redSw = sw,
  fills = {
    dim: 'oklch(0.55 0.02 65)',
    emph: 'oklch(0.50 0.10 155)',
    red: 'oklch(0.48 0.18 22)',
  },
  refX = 10, refY = 5,
} = {}) => {
  const markerW = id => id === 'a-R' ? redSw * 7.0 : sw * 7.0;
  const markerH = id => id === 'a-R' ? redSw * 7.0 : sw * 7.0;
  let defs = svg.select('defs');
  if (defs.empty()) defs = svg.append('defs');
  else defs.selectAll('marker').remove();
  const ids = { dim: 'a-dim', emph: 'a-G', red: 'a-R' };
  const swMap = { dim: sw, emph: sw, red: redSw };
  for (const [k, id] of Object.entries(ids)) {
    const mw = swMap[k] * 7.0;
    defs.append('marker')
      .attr('id', id).attr('viewBox', '0 0 12 10')
      .attr('refX', refX).attr('refY', refY)
      .attr('markerWidth', mw).attr('markerHeight', mw)
      .attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M0,0.5 L12,5 L0,9.5 Z').attr('fill', fills[k]);
  }
  const marker = (c) => {
    if (c === fills.emph) return `url(#${ids.emph})`;
    if (c === fills.red) return `url(#${ids.red})`;
    return `url(#${ids.dim})`;
  };
  return { marker };
};

// ── SVG Canvas ──

V.createCanvas = (selector, width = 560, height = 400, margin = 48) => {
  const root = d3.select(selector);
  root.style('position', 'relative');
  const svg = root.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%').style('display', 'block');
  const lbl = root.append('div').attr('class', 'vis-labels')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', '100%').style('height', '100%').style('pointer-events', 'none');
  return {
    svg, root, lbl,
    bg: svg.append('g'), eG: svg.append('g'),
    nG: svg.append('g'), oG: svg.append('g'),
    W: width, H: height, M: margin,
  };
};

// ── DOM label (HTML overlay, supports KaTeX math) ──
// Anchor to SVG element or {x,y}. Returns D3 selection of the label div.
// Usage: ctx.domLabel(anchor, '$x^2$', { place:'right', gap:12 })
V.domLabel = (container, anchor, html, opts = {}) => {
  const svg = container.select('svg').node();
  if (!svg) return d3.select();
  const {
    offsetX = 0, offsetY = 0,
    place = 'above', gap = 8,
    className = 'vlbl', style = {},
  } = opts;

  // Resolve any anchor to { cx, cy, left, top, w, h }
  let b;
  if (anchor && typeof anchor.node === 'function') {
    const el = anchor.node();
    if (el && el.getBBox) { const bb = el.getBBox(); b = { left:bb.x, top:bb.y, w:bb.width, h:bb.height, cx:bb.x+bb.width/2, cy:bb.y+bb.height/2 }; }
  } else if (anchor && typeof anchor.getBBox === 'function') {
    const bb = anchor.getBBox(); b = { left:bb.x, top:bb.y, w:bb.width, h:bb.height, cx:bb.x+bb.width/2, cy:bb.y+bb.height/2 };
  } else if (anchor && 'x' in anchor) {
    const hw = (anchor.nW || anchor.w || 0) / 2;
    const hh = (anchor.nH || anchor.h || 0) / 2;
    const w = anchor.nW || anchor.w || 0;
    const h = anchor.nH || anchor.h || 0;
    if (anchor.r !== undefined) { b = { left:anchor.x-anchor.r, top:anchor.y-anchor.r, w:anchor.r*2, h:anchor.r*2, cx:anchor.x, cy:anchor.y }; }
    else { b = { left:anchor.x-hw, top:anchor.y-hh, w, h, cx:anchor.x, cy:anchor.y }; }
  } else {
    return d3.select();
  }

  const vb = svg.viewBox.baseVal;
  const gx = v => (v / vb.width) * 100;
  const gy = v => (v / vb.height) * 100;
  let left, top, tx = 'translate(-50%, -50%)';

  if (place === 'right')       { left = gx(b.left + b.w + gap); top = gy(b.cy); tx = 'translate(0%, -50%)'; }
  else if (place === 'left')    { left = gx(b.left - gap);       top = gy(b.cy); tx = 'translate(-100%, -50%)'; }
  else if (place === 'below')   { left = gx(b.cx); top = gy(b.top + b.h + gap); tx = 'translate(-50%, 0%)'; }
  else if (place === 'above')   { left = gx(b.cx); top = gy(b.top - gap);       tx = 'translate(-50%, -100%)'; }
  else                          { left = gx(b.cx); top = gy(b.cy); } // center

  let inner = html;
  if (typeof window !== 'undefined' && window.katex) {
    inner = html.replace(/\$\$([^$]+)\$\$/g, (_, m) =>
      window.katex.renderToString(m, { throwOnError: false, displayMode: true }));
    inner = inner.replace(/\$([^$]+)\$/g, (_, m) =>
      window.katex.renderToString(m, { throwOnError: false }));
  }

  const div = container.append('div')
    .attr('class', className).style('position', 'absolute').style('pointer-events', 'none')
    .style('left', (left + (offsetX / vb.width) * 100) + '%').style('top', (top + (offsetY / vb.height) * 100) + '%')
    .style('transform', tx).html(inner);
  for (const [k, v] of Object.entries(style)) div.style(k, v);
  return div;
};

V.katexify = (html) => {
  if (typeof window === 'undefined' || !window.katex) return html;
  let out = html;
  out = out.replace(/\$\$([^$]+)\$\$/g, (_, m) =>
    window.katex.renderToString(m, { throwOnError: false, displayMode: true }));
  out = out.replace(/\$([^$]+)\$/g, (_, m) =>
    window.katex.renderToString(m, { throwOnError: false }));
  return out;
};

V.createLayerGuides = (bg, layers, { x1 = 68, x2, stroke = 'oklch(0.60 0.03 75 / 0.35)', strokeWidth = 1, dasharray = '4 6' } = {}) => {
  const xr = x2 ?? 492;
  for (let i = 1; i < layers.length; i++) {
    const y = (layers[i - 1] + layers[i]) / 2;
    bg.append('line').attr('class', 'ly')
      .attr('x1', x1).attr('x2', xr).attr('y1', y).attr('y2', y)
      .attr('stroke', stroke).attr('stroke-width', strokeWidth).attr('stroke-dasharray', dasharray);
  }
};

// ── Node & edge drawing ──

// drawNodeContent(g, n, opts) — draw shape + text into existing group (no outer <g>)
V.drawNodeContent = (g, n, {
  nW = 38, nH = 28, dR = 8, rx = 6,
  fill = 'oklch(0.92 0.015 75)', stroke = 'oklch(0.55 0.02 65)',
  strokeW = 1.2, textSize = 11, textFill = 'oklch(0.25 0.02 60)',
  weight = 600, font = 'JetBrains Mono,monospace', text,
} = {}) => {
  if (n.t === 'dummy') {
    g.append('circle').attr('class','shp').attr('cx', n.x).attr('cy', n.y).attr('r', dR)
      .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeW);
  } else {
    g.append('rect').attr('class','shp').attr('x', n.x - nW / 2).attr('y', n.y - nH / 2)
      .attr('width', nW).attr('height', nH).attr('rx', rx)
      .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeW);
  }
  if (textSize > 0) {
    g.append('text').attr('x', n.x).attr('y', n.y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .style('font-family', font).style('font-size', textSize + 'px')
      .style('font-weight', weight).style('fill', textFill).text(text ?? n.id);
  }
};

V.drawNode = (g, n, opts = {}) => {
  const grp = g.append('g').attr('data-id', n.id || '');
  V.drawNodeContent(grp, n, opts);
  return grp;
};

// drawDummy(g, n, opts) — dummy node: halo + circle + external label
V.drawDummy = (g, n, {
  dR = 8, pad = 4,
  fill = n.fill || '#fff', stroke = 'oklch(0.55 0.02 65)', strokeW = 1.2,
  textSize = 12, textFill = 'oklch(0.25 0.02 60)', weight = 700,
  labelSide = 'left', labelGap = 8,
  halo: showHalo = false, haloFill = 'oklch(0.72 0.08 155 / 0.12)',
  haloStroke = 'oklch(0.62 0.10 155 / 0.22)', haloStrokeW = 1.5,
  text = n.label || n.id,
} = {}) => {
  const grp = g.append('g').attr('data-id', n.id || '');
  if (showHalo) {
    grp.append('circle').attr('class', 'h').attr('cx', n.x).attr('cy', n.y).attr('r', dR + pad)
      .attr('fill', haloFill).attr('stroke', haloStroke).attr('stroke-width', haloStrokeW);
  }
  grp.append('circle').attr('class','shp').attr('cx', n.x).attr('cy', n.y).attr('r', dR)
    .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeW);
  if (textSize > 0) {
    const anchor = labelSide === 'left' ? 'end' : labelSide === 'right' ? 'start' : 'middle';
    const dx = labelSide === 'left' ? -(dR + labelGap) : labelSide === 'right' ? (dR + labelGap) : 0;
    const dy = labelSide === 'top' ? -(dR + labelGap) : labelSide === 'bottom' ? (dR + labelGap) : 0;
    V.svgLabel(grp, n.x + dx, n.y + dy + (labelSide === 'left' || labelSide === 'right' ? 5 : 0),
      text, { size: textSize, fill: textFill, weight, anchor });
  }
  return grp;
};

V.drawEdgeLine = (g, from, to, {
  nW = 38, nH = 28, dR = 8, gap = 4,
  stroke = 'oklch(0.55 0.02 65)', strokeW = 1.9,
  dash = '', markerUrl = '',
} = {}) => {
  const ep = V.exitPt(from, to.x, to.y, { nW, nH, dR });
  const ip = V.entryPt(to, from.x, from.y, { nW, nH, dR, gap });
  return g.append('line').attr('data-id', (from.id||'') + '→' + (to.id||''))
    .attr('x1', ep.x).attr('y1', ep.y).attr('x2', ip.x).attr('y2', ip.y)
    .attr('stroke', stroke).attr('stroke-width', strokeW).attr('stroke-dasharray', dash)
    .attr('stroke-linecap', 'round').attr('marker-end', markerUrl);
};

V.drawEdgePath = (g, from, to, {
  nW = 38, nH = 28, dR = 8, gap = 4,
  stroke = 'oklch(0.55 0.02 65)', strokeW = 1.9,
  dash = '', markerUrl = '',
} = {}) => {
  const ep = V.exitPt(from, to.x, to.y, { nW, nH, dR });
  const ip = V.entryPt(to, from.x, from.y, { nW, nH, dR, gap });
  const my = ep.y + (ip.y - ep.y) / 2;
  return g.append('path').attr('data-id', (from.id||'') + '→' + (to.id||''))
    .attr('d', `M${ep.x},${ep.y} L${ep.x},${my} L${ip.x},${my} L${ip.x},${ip.y}`)
    .attr('stroke', stroke).attr('stroke-width', strokeW).attr('fill', 'none')
    .attr('stroke-dasharray', dash).attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round').attr('marker-end', markerUrl);
};

// getBounds(nodes, opts) — returns { mx, my, Mx, My } bounding box around nodes
V.getBounds = (nodes, {
  nW = 38, nH = 28, dR = 8, pad = 8,
} = {}) => {
  if (!nodes.length) return null;
  const xs = nodes.map(n => n.x - (n.t === 'dummy' ? dR : nW / 2));
  const xe = nodes.map(n => n.x + (n.t === 'dummy' ? dR : nW / 2));
  const ys = nodes.map(n => n.y - (n.t === 'dummy' ? dR : nH / 2));
  const ye = nodes.map(n => n.y + (n.t === 'dummy' ? dR : nH / 2));
  return {
    mx: Math.min(...xs) - pad, Mx: Math.max(...xe) + pad,
    my: Math.min(...ys) - pad, My: Math.max(...ye) + pad,
  };
};

// boundBox(g, bounds, opts) — draw rect from bounds (use with getBounds)
V.boundBox = (g, { mx, my, Mx, My }, {
  rx = 10,
  fill = 'oklch(0.60 0.08 155 / 0.08)', stroke = 'oklch(0.50 0.10 155)',
  strokeW = 2, dash = '5 3',
} = {}) => g.append('rect').attr('x', mx).attr('y', my)
  .attr('width', Mx - mx).attr('height', My - my)
  .attr('rx', rx).attr('fill', fill).attr('stroke', stroke)
  .attr('stroke-width', strokeW).attr('stroke-dasharray', dash);

// compoundRect(g, rect, opts) — rounded rect with optional label
V.compoundRect = (g, { x, y, w, h, rx = 12 }, {
  fill = 'oklch(0.92 0.01 250 / 0.15)',
  stroke = 'oklch(0.65 0.04 250 / 0.8)',
  strokeW = 2, id = 'c', label, ls = 14, lc = 'oklch(0.50 0.05 250)',
} = {}) => {
  g.append('rect').attr('data-id', `compound-${id}`)
    .attr('x', x).attr('y', y).attr('width', w).attr('height', h)
    .attr('rx', rx).attr('ry', rx).attr('fill', fill).attr('stroke', stroke)
    .attr('stroke-width', strokeW);
  if (label) V.svgLabel(g, x + ls, y + 22, label, { size: 13, fill: lc });
};

// lBend(g, from, to, bendX, opts) — L-shaped path bending at x=bendX
V.lBend = (g, from, to, bendX, {
  stroke = 'oklch(0.55 0.02 65)', strokeW = 1.9, dash = '', id = 'e',
  markerUrl, marker,
} = {}) => {
  const d = `M${from.x},${from.y} L${bendX},${from.y} L${bendX},${to.y} L${to.x},${to.y}`;
  if (marker && !markerUrl) markerUrl = marker(stroke);
  g.selectAll(`[data-id="${id}"]`).remove();
  return g.append('path').attr('data-id', id)
    .attr('d', d).attr('fill', 'none').attr('stroke', stroke).attr('stroke-width', strokeW)
    .attr('stroke-dasharray', dash || 'none')
    .attr('marker-end', markerUrl || null)
    .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
};

// edgeLabel(g, from, to, t, text, opts) — label at fraction t along a straight edge
V.edgeLabel = (g, from, to, t, text, {
  size = 12, fill = 'oklch(0.25 0.02 60)', weight = 600,
  bgFill = 'oklch(0.70 0.06 155 / 0.18)', bgPad = 6, bgWidth,
  anchor = 'middle',
} = {}) => {
  const lx = from.x + (to.x - from.x) * t;
  const ly = from.y + (to.y - from.y) * t;
  const tw = bgWidth ?? (text.length * size * 0.6 + bgPad * 2);
  g.append('rect').attr('x', lx - tw / 2).attr('y', ly - size / 2 - bgPad / 2)
    .attr('width', tw).attr('height', size + bgPad).attr('rx', 4).attr('fill', bgFill);
  return V.svgLabel(g, lx, ly + 1, text, { size, fill, weight, anchor });
};

// ── Stepper — universal phase navigation ──
V.stepper = (selector, { panel, texts = [], draw, start = 0 } = {}) => {
  const btns = document.querySelectorAll(selector);
  const show = (s) => {
    btns.forEach((b, i) => b.classList.toggle('active', i === s));
    if (panel) {
      const el = document.querySelector(panel);
      if (el && texts[s] !== undefined) el.innerHTML = V.katexify(texts[s]);
    }
    if (draw) draw(s);
  };
  btns.forEach((b, i) => b.addEventListener('click', () => show(i)));
  show(start);
  return { go: show };
};

// Read texts from <template id="t0">...<template id="tN">
V.pages = (count, prefix = 't') =>
  Array.from({ length: count }, (_, i) =>
    document.getElementById(prefix + i)?.innerHTML || '');

// ── Cross-compound edge ───────────────────────────────────────────
// Draws an edge that crosses from one compound to another.
// Modes:
//   'split'   — 3 segments (L-bend inside from, mid crossing, L-bend inside to) + 4 port dummies
//   'restore' — 1 continuous path with bend-point dots
//   'direct'  — 1 straight line node-to-node (ignoring compound walls)
V.crossEdge = (g, {
  from, to, fromRect, toRect,
  color = 'oklch(0.50 0.10 155)', strokeW = 2, dash = '',
  mode = 'split', marker,
  dR = 8, portInset = 26, midOffset = 30, bendInset = 14,
  portFill, portStroke,
  id = 'ce',
} = {}) => {
  const m = (c) => marker ? marker(c) : '';
  const wallR = fromRect.x + fromRect.w;
  const wallL = toRect.x;

  // Port positions
  const ports = {
    fromExt: { x: wallR, y: from.y },      // external on fromRect right wall
    toExt:   { x: wallL, y: to.y },          // external on toRect left wall
    fromInt: { x: wallR - portInset, y: from.y },
    toInt:   { x: wallL + portInset, y: to.y },
  };

  if (mode === 'direct') {
    g.append('line').attr('data-id', id)
      .attr('x1', from.x).attr('y1', from.y).attr('x2', to.x).attr('y2', to.y)
      .attr('stroke', color).attr('stroke-width', strokeW)
      .attr('stroke-dasharray', dash || 'none').attr('marker-end', m(color));
    return { ports: null };
  }

  if (mode === 'split') {
    const pf = portFill || 'oklch(0.54 0.05 300 / 0.7)';
    const ps = portStroke || color;
    // External ports on walls
    [ports.fromExt, ports.toExt].forEach((p, i) =>
      g.append('circle').attr('data-id', `${id}-p${i}`).attr('cx', p.x).attr('cy', p.y)
        .attr('r', dR).attr('fill', color).attr('stroke', ps).attr('stroke-width', 1.2));
    // Internal ports inside compounds
    [ports.fromInt, ports.toInt].forEach((p, i) =>
      g.append('circle').attr('data-id', `${id}-p${i+2}`).attr('cx', p.x).attr('cy', p.y)
        .attr('r', dR).attr('fill', pf).attr('stroke', ps).attr('stroke-width', 1.2));
  }

  if (mode === 'split' || mode === 'restore') {
    const bx1 = wallR - bendInset;
    const bx2 = wallL + bendInset;
    const my = (from.y + to.y) / 2;

    if (mode === 'split') {
      const opt = (sId, dStr, dd) => g.append('path').attr('data-id', sId)
        .attr('fill', 'none').attr('stroke', color).attr('stroke-width', strokeW)
        .attr('stroke-dasharray', dStr).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');

      // s1: from → fromInt (L-bend at bx1)
      opt(`${id}-s1`, dash || '3 3').attr('d', `M${from.x},${from.y} L${bx1},${from.y} L${bx1},${ports.fromInt.y} L${ports.fromInt.x},${ports.fromInt.y}`);
      // s2: fromExt → toExt (mid crossing with Y-shift)
      opt(`${id}-s2`, dash || '5 4').attr('d', `M${ports.fromExt.x},${ports.fromExt.y} L${wallR+midOffset},${ports.fromExt.y} L${wallR+midOffset},${my} L${wallL-midOffset},${my} L${wallL-midOffset},${ports.toExt.y} L${ports.toExt.x},${ports.toExt.y}`).attr('marker-end', m(color));
      // s3: toInt → to
      opt(`${id}-s3`, dash || '3 3').attr('d', `M${ports.toInt.x},${ports.toInt.y} L${bx2},${ports.toInt.y} L${bx2},${to.y} L${to.x},${to.y}`);
    } else {
      // restore: 1 continuous path
      const d = `M${from.x},${from.y} L${bx1},${from.y} L${bx1},${my} L${bx2},${my} L${bx2},${to.y} L${to.x},${to.y}`;
      g.append('path').attr('data-id', id).attr('d', d)
        .attr('fill', 'none').attr('stroke', color).attr('stroke-width', strokeW * 1.4)
        .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round').attr('marker-end', m(color));
      // Bend-point dots
      [bx1, bx2, wallR + midOffset, wallL - midOffset].forEach(bx =>
        g.append('circle').attr('cx', bx).attr('cy', my).attr('r', 2.2).attr('fill', color));
    }
  }

  return { ports };
};

// ── Setup — one-call bundle: canvas + arrows + layers + bound helpers ──
// Returns a flat ctx with all config + all bound functions.
// Use: const ctx = Vis.setup('#d3-stage'); ctx.node(nG, n); ctx.edge(eG, f, t);
V.setup = (selector, width = 560, height = 400, margin = 48, {
  geom: { nW = 38, nH = 28, dR = 8, rx = 6, gap = 4 } = {},
  colors: { dim = 'oklch(0.55 0.02 65)', emph = 'oklch(0.50 0.10 155)', red = 'oklch(0.48 0.18 22)', fill = 'oklch(0.92 0.015 75)' } = {},
  edge: { sw = 1.9, redSw = sw } = {},
} = {}) => {
  const C = V.createCanvas(selector, width, height, margin);
  const { marker } = V.defineArrows(C.svg, { sw, redSw, fills: { dim, emph, red } });

  // flat config — use raw defaults directly
  let _tr = null, _seenIds = null;

  const makeTransition = (ms = 400) => d3.transition().duration(ms).ease(d3.easeCubicInOut);
  const defTr = () => makeTransition(250); // default transition for auto-animate

  // render(fn, ms) — full redraw: clear + fade-in
  const render = (fn, ms = 400) => {
    _clear();
    _tr = makeTransition(ms);
    fn();
    _tr = null;
  };

  // update(fn, ms) — smooth: transition existing elements, add new, remove stale
  const update = (fn, ms = 500) => {
    _tr = makeTransition(ms);
    _seenIds = new Set();
    C.bg.selectAll('*').remove();
    C.oG.selectAll('*').remove();
    C.root.selectAll('.vlbl').remove();
    fn();
    [C.nG, C.eG].forEach(g => {
      g.selectAll('[data-id]').filter(function () {
        return !_seenIds.has(this.getAttribute('data-id'));
      }).interrupt().transition(_tr).attr('opacity', 0).remove();
    });
    _tr = null; _seenIds = null;
  };

  const fadeIn = (sel) => sel.attr('opacity', 0).transition(_tr || defTr()).attr('opacity', 1);

  // node — smooth transitions always on; _tr overrides timing if set
  const node = (g, n, o = {}) => {
    if (_seenIds) _seenIds.add(n.id);
    const exist = g.select(`[data-id="${n.id}"]`);
    if (!exist.empty()) {
      const tr = _tr || defTr();
      const shape = exist.select('.shp');
      if (shape.node()) {
        const isCircle = shape.node().tagName === 'circle';
        let t = shape.interrupt().transition(tr);
        if (isCircle) t = t.attr('cx', n.x).attr('cy', n.y);
        else t = t.attr('x', n.x - nW / 2).attr('y', n.y - nH / 2);
        if (o.stroke) t = t.attr('stroke', o.stroke);
        if (o.fill) t = t.attr('fill', o.fill);
        if (o.strokeW) t = t.attr('stroke-width', o.strokeW);
      }
      exist.select('text').interrupt().transition(tr).attr('x', n.x).attr('y', n.y);
      return exist;
    }
    g.selectAll(`[data-id="${n.id}"]`).remove();
    const grp = g.append('g').attr('data-id', n.id);
    V.drawNodeContent(grp, n, { nW, nH, dR, rx, ...o });
    return fadeIn(grp);
  };
  node.dim  = (g, n, o) => node(g, n, { fill: dim, ...o });
  node.emph = (g, n, o) => node(g, n, { fill: emph, ...o });
  node.r    = (g, n, o) => node(g, n, { fill: red, stroke: red, ...o });

  // edge — smooth transitions always on
  const edge = (g, f, t, o = {}) => {
    const eid = (f.id || '') + '→' + (t.id || '');
    if (_seenIds) _seenIds.add(eid);
    const opts = { nW, nH, dR, gap, strokeW: sw, ...o };
    if (!opts.markerUrl) opts.markerUrl = marker(opts.stroke || dim);
    const ep = V.exitPt(f, t.x, t.y, { nW, nH, dR });
    const ip = V.entryPt(t, f.x, f.y, { nW, nH, dR, gap });

    let exist = g.select(`[data-id="${eid}"]`);
    if (!exist.empty() && exist.node().tagName !== 'line') { exist.remove(); exist = g.select(); }
    if (!exist.empty()) {
      const tr = _tr || defTr();
      exist.interrupt().transition(tr)
        .attr('x1', ep.x).attr('y1', ep.y).attr('x2', ip.x).attr('y2', ip.y)
        .attr('stroke', opts.stroke).attr('stroke-width', opts.strokeW)
        .attr('stroke-dasharray', opts.dash || '').attr('marker-end', opts.markerUrl);
      return exist;
    }
    g.selectAll(`[data-id="${eid}"]`).remove();
    const el = g.append('line').attr('data-id', eid).attr('stroke-linecap', 'round')
      .attr('x1', ep.x).attr('y1', ep.y).attr('x2', ip.x).attr('y2', ip.y)
      .attr('stroke', opts.stroke).attr('stroke-width', opts.strokeW)
      .attr('stroke-dasharray', opts.dash || '').attr('marker-end', opts.markerUrl);
    return fadeIn(el);
  };

  const edgePath = (g, f, t, o = {}) => {
    const eid = (f.id || '') + '→' + (t.id || '');
    if (_seenIds) _seenIds.add(eid);
    const opts = { nW, nH, dR, gap, strokeW: sw, ...o };
    if (!opts.markerUrl) opts.markerUrl = marker(opts.stroke || dim);
    const ep = V.exitPt(f, t.x, t.y, { nW, nH, dR });
    const ip = V.entryPt(t, f.x, f.y, { nW, nH, dR, gap });
    const my = ep.y + (ip.y - ep.y) / 2;
    const d = `M${ep.x},${ep.y} L${ep.x},${my} L${ip.x},${my} L${ip.x},${ip.y}`;

    let exist = g.select(`[data-id="${eid}"]`);
    if (!exist.empty() && exist.node().tagName !== 'path') { exist.remove(); exist = g.select(); }
    if (!exist.empty()) {
      const tr = _tr || defTr();
      exist.interrupt().transition(tr)
        .attr('d', d).attr('stroke', opts.stroke).attr('stroke-width', opts.strokeW)
        .attr('stroke-dasharray', opts.dash || '').attr('marker-end', opts.markerUrl);
      return exist;
    }
    g.selectAll(`[data-id="${eid}"]`).remove();
    const el = g.append('path').attr('data-id', eid).attr('fill', 'none')
      .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
      .attr('d', d).attr('stroke', opts.stroke).attr('stroke-width', opts.strokeW)
      .attr('stroke-dasharray', opts.dash || '').attr('marker-end', opts.markerUrl);
    return fadeIn(el);
  };

  const halo = (g, cx, cy, o = {}) => fadeIn(V.halo(g, cx, cy, nW, nH, rx, o));

  const dummy = (g, n, o = {}) => {
    if (_seenIds) _seenIds.add(n.id);
    const exist = g.select(`[data-id="${n.id}"]`);
    if (!exist.empty()) {
      const tr = _tr || (_seenIds ? defTr() : null);
      if (tr) {
        let t = exist.select('.shp').transition(tr).attr('cx', n.x).attr('cy', n.y);
        if (o.fill || n.fill) t = t.attr('fill', o.fill || n.fill);
        if (o.stroke) t = t.attr('stroke', o.stroke);
        if (o.strokeW) t = t.attr('stroke-width', o.strokeW);
        const ls = o.labelSide || 'left', lg = o.labelGap ?? 8;
        const tx = ls === 'left' ? n.x - (dR + lg) : ls === 'right' ? n.x + (dR + lg) : n.x;
        const ty = (ls === 'left' || ls === 'right') ? n.y + 5 : n.y;
        exist.select('text').transition(tr).attr('x', tx).attr('y', ty);
      }
      return exist;
    }
    g.selectAll(`[data-id="${n.id}"]`).remove();
    return fadeIn(V.drawDummy(g, n, { dR, ...o }));
  };
  const bbox = (nodes, o = {}) => V.getBounds(nodes, { nW, nH, dR, ...o });
  const bboxRect = (g, b, o = {}) => V.boundBox(g, b, o);
  const compoundRect = (g, rect, o) => V.compoundRect(g, rect, o);
  const lBend = (g, from, to, bx, o) => {
    if (_seenIds && o.id) _seenIds.add(o.id);
    return V.lBend(g, from, to, bx, { marker, ...o });
  };
  const crossEdge = (o = {}) => V.crossEdge(C.oG, { marker, dR, ...o });
  const label = (g, x, y, text, o = {}) => V.svgLabel(g, x, y, text, o);
  const domLabel = (anchor, html, o = {}) => V.domLabel(C.root, anchor, html, o);
  const katexify = (html) => V.katexify(html);
  const eLabel = (g, f, t, p, text, o = {}) => V.edgeLabel(g, f, t, p, text, o);
  const arrows = (o = {}) => V.defineArrows(C.svg, { sw, redSw, fills: { dim, emph, red }, ...o });
  const guides = (layers, o = {}) => V.createLayerGuides(C.bg, layers, { x1: margin + 20, x2: width - margin - 20, ...o });
  const layerBg = (layers, { h = 52, bgFill = 'oklch(0.90 0.02 155 / 0.12)', rx = 8 } = {}) => {
    layers.forEach(y => C.bg.append('rect').attr('class', 'ly')
      .attr('x', margin).attr('y', y - h / 2).attr('width', width - margin * 2).attr('height', h)
      .attr('fill', bgFill).attr('rx', rx));
  };
  const _clear = (sel) => {
    C.bg.selectAll(sel || '*').remove();
    C.eG.selectAll('*').remove();
    C.nG.selectAll('*').remove();
    C.oG.selectAll('*').remove();
    C.root.selectAll('.vlbl').remove();
  };

  return {
    // canvas
    svg: C.svg, root: C.root, lbl: C.lbl, bg: C.bg, eG: C.eG, nG: C.nG, oG: C.oG, W: C.W, H: C.H, M: C.M,
    // config
    nW, nH, dR, rx, gap,
    dim, emph, conflict: red, fill,
    // markers
    marker: marker,
    // bound drawing
    node, edge, edgePath, halo, dummy, bbox, bboxRect, compoundRect, lBend, crossEdge, label, eLabel, domLabel, katexify,
    // lifecycle (clear kept internal; use render/update for animated redraws)
    render, update, guides, layerBg, arrows, transition: makeTransition,
    go: (s, o) => V.stepper(s, o), pages: V.pages,
    // raw geometry (for advanced use)
    exitPt: V.exitPt, entryPt: V.entryPt,
  };
};
