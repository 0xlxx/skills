---
name: intrinsic-design
description: Intrinsic Web Design — content-driven CSS layout using intrinsic sizing, Grid, Flexbox, and fluid values without media queries. Use when the user asks about "responsive layout", "CSS layout", "intrinsic sizing", "content-driven design", "内在 Web 设计", "fluid layout", "Grid layout", "fit-content", "minmax", or wants to make a layout adapt to its content rather than fixed breakpoints.
---

<intrinsic-design>

<core-principle>
Content drives design — not the other way around. Don't measure a button from a mockup and set `width: 230px`. Use `width: max-content` and `min-width: 230px`. The content decides the size; the design sets the constraints. The web is a fluid medium — intrinsic sizing lets it behave like one.
</core-principle>

<rules>

### 1. Intrinsic sizing — let content determine size

`min-content`, `max-content`, `fit-content` replace fixed `width`/`height`. Each reads the content and sizes the box accordingly.

```
min-content  » narrowest possible width (longest word, largest image)
max-content  » widest possible width (no line breaks, full content extent)
fit-content  » respects container, stretches up to max-content
```

```css
/* ❌ fixed — breaks when content changes */
button { width: 230px; height: 60px; }

/* ✅ intrinsic — adapts to any content */
button { width: max-content; min-width: 230px; min-height: 60px; }

/* ✅ heading underline matches text width automatically */
h2 { width: fit-content; border-bottom: 2px solid; }

/* ✅ description never wider than the title above it */
.hero { width: min-content; }
.hero__title { width: max-content; }
```

`fit-content` is shorthand for `width: auto; min-width: min-content; max-width: max-content`.

### 2. Two-dimensional fluidity — Grid on both axes

Responsive Web Design gave us fluid columns. Intrinsic Web Design gives us fluid rows too. CSS Grid makes both axes fluid with `fr`, `auto`, `minmax()`, and intrinsic keywords.

```css
/* ❌ one-dimensional: only columns are flexible */
.layout { display: flex; flex-wrap: wrap; }

/* ✅ two-dimensional: rows AND columns fluid */
.layout {
    display: grid;
    grid-template-columns: min-content fit-content(24rem) minmax(0, 1fr);
    grid-template-rows: min-content minmax(0, 1fr) min-content;
}
```

`min-content` rows collapse to content height. `minmax(0, 1fr)` rows take remaining space. `fit-content(24rem)` columns have a preferred max but shrink when needed.

### 3. RAM — responsive without media queries

`repeat()` + `auto-fit`/`auto-fill` + `minmax()` = a grid that adds and removes columns as space changes. No `@media` required.

```css
/* ✅ cards that reflow automatically at any viewport width */
.cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100% - 2rem, 320px), 1fr));
    gap: 1rem;
}
```

`auto-fit` collapses empty tracks. `min()` ensures the minimum column size never overflows the container. This single rule replaces breakpoints at every device width.

### 4. Flexbox wrapping — the other media-query-free path

`flex-wrap: wrap` + `flex: 1 1 <basis>` creates layouts that reflow when items hit their minimum width.

```css
/* ✅ side-by-side on wide screens, stacked on narrow — no @media */
.card {
    display: flex;
    flex-wrap: wrap;
}
.card > * {
    flex: 1 1 280px; /* each child: grow, shrink, minimum 280px */
}
```

Combine with `clamp()` spacing and you get fully fluid layouts without a single breakpoint.

### 5. `clamp()`, `min()`, `max()` — fluid values everywhere

These functions replace fixed values and media query overrides. Apply them to font-size, padding, margin, gap, border-radius — any property that takes a length.

```css
/* ❌ breakpoint-driven */
h1 { font-size: 1rem; }
@media (min-width: 768px) { h1 { font-size: 2rem; } }
@media (min-width: 1200px) { h1 { font-size: 3rem; } }

/* ✅ fluid — single line, no breakpoints */
h1 { font-size: clamp(1rem, 4vw + 1rem, 3rem); }

/* ✅ spacing that scales with context */
:root {
    --gap: clamp(1rem, 3vmax, 2rem);
    --padding: clamp(1.5rem, 6vw, 3rem);
}

/* ✅ border-radius that vanishes on narrow screens */
.card {
    border-radius: clamp(0px, (100vw - 760px) * 1000, 8px);
}
```

`clamp(MIN, VAL, MAX)` returns VAL when it's between MIN and MAX, otherwise clamps to the nearest bound.

### 6. Content-driven spacing — gaps that breathe

Use the same intrinsic principles for spacing. Margins, padding, and gaps scale with the viewport or container without media queries.

```css
/* ✅ container-aware sidebar + content layout */
body {
    display: grid;
    grid-template-columns: fit-content(20ch) minmax(50%, 1fr);
    gap: clamp(1rem, 3vmax, 2rem);
}
```

The sidebar is at most `20ch` wide but shrinks to `min-content` when space is tight. The gap scales fluidly between `1rem` and `2rem`.

### 7. Container queries — component-level responsiveness

When viewport-based responsiveness isn't enough, `@container` lets a component respond to its own container's size.

```css
.card-container { container-type: inline-size; }

.card { border-radius: 0; }

@container (width > 700px) {
    .card { border-radius: 8px; }
}
```

Use sparingly — RAM and `clamp()` handle most cases. Container queries are for when a component's context differs from the viewport (e.g., a card in a narrow sidebar vs. a wide main column).

</rules>

<constraints>
- Never set a fixed `width`/`height` when `min-content`, `max-content`, or `fit-content` would work — fixed sizes break the moment content changes
- Don't reach for `@media` first — try RAM, flex-wrap, or `clamp()` before adding a breakpoint
- `fit-content` is invalid in Grid track definitions — use `fit-content(<length>)` instead
- Intrinsic sizing keywords can make images collapse to zero in Grid — wrap in `minmax(100px, min-content)` to prevent this
</constraints>

</intrinsic-design>
