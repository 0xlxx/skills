# Skills Generation Information

This document tracks how learnvis skills are generated and kept in sync with the source.

## Generation Details

**Generated from source at:**

- **Commit SHA**: `26c2086`
- **Date**: 2026-06-14
- **Source**: `vis/` source modules (index.ts, types.ts, math.ts, graph.ts, layout.ts, stage.ts, frame.ts, mixins.ts, renderer/svg.ts, primitives.ts, themes.ts, tokens.ts, color.ts)
- **Tooling**: `scripts/postinstall.mjs` — multi-platform skill symlink (Claude Code, Codex, Pi, OpenCode)

## Structure

```
skills/learnvis/               # SSOT — project source
├── GENERATION.md              # This file
├── README.md                  # agentskills.io metadata
├── SKILL.md                   # Main skill file: API tables + quick reference
├── assets/                    # Built artifacts bundled with skill
│   └── learnvis.iife.js       # IIFE build (auto-copied from dist/)
└── references/                # Domain-specific reference docs (7 files)
    ├── api-math.md            # Math primitives API
    ├── api-graph.md           # Graph theory primitives API
    ├── api-layout.md          # Layout primitives API (node/block/port/edge/layer/enclosure)
    ├── api-common.md          # Shared utilities (card, tag, callout)
    ├── api-controlflow.md     # Lifecycle & control flow API
    ├── api-atomic.md          # Low-level atomic API
    └── guide-standalone.md    # Standalone HTML usage (CDN, minimal template)
```

## File Naming Convention

Files are prefixed by category:

- `api-*` — Domain API reference docs (one per domain)
- `guide-*` — Getting started guides (future)
- `reference-*` — Theme config, marker config (future)

## How to Update Skills

When source API changes:

### 1. Check for API Changes

```bash
# Review changed source files
git diff HEAD -- vis/

# Focus on exported function signatures and type changes
```

### 2. Update Process

**For new methods/params:**
- Update the relevant `api-*.md` reference file
- Add entry to the domain table in `SKILL.md`

**For new domains:**
- Add `api-<domain>.md` in `references/`
- Add a new section to `SKILL.md` with API table

**For deleted APIs:**
- Remove from `api-*.md` and `SKILL.md`
- If an entire domain is removed, delete the reference file

**For theme/marker changes:**
- Add `reference-*.md` files for configuration reference

### 3. Update Checklist

- [ ] Verify exported API signatures match source
- [ ] Update affected `api-*.md` files
- [ ] Update `SKILL.md` tables
- [ ] Update this `GENERATION.md` with date/SHA
- [ ] Run `pnpm build && pnpm test` to verify nothing broke
- [ ] Run `pnpm build:skill` to sync to skills repo (`../skills/`)

## Key Architecture Notes (current)

- **EntityId** — branded type `string & { [EntityIdBrand]: true }`, constructed via `eid(prefix, id)` from `vis/types.ts`
- **FrameManager** — ECS-style: `begin() → declare(id, state) → commit({ ms?, animate? })`
- **Renderer** — Strategy pattern, SVGRenderer in `vis/renderer/svg.ts`
- **Color pipeline** — oklch theme tokens → `resolveColor()` → `svgColor()` converts to hex at render boundary
- **Mixins** — Composable fluent builders (Hejlsberg pattern): `coreNodeMixin`, `mixColor`, `mixStrokeW`, `mixOpacity`, `mixLabel`, etc.
- **CoreNode** — `coreNodeMixin(eid, fm, p)` shared across all domains (color, strokeW, fill, opacity, size, label, moveTo)
- **elements.ts** — DELETED. `zone`, `dot`, `arrow`, `line`, `path` no longer exist. Use `math` or `layout` primitives instead.

## Style Guidelines

- Each reference file covers ONE domain
- API tables use columns: Signature | Description
- Common patterns shown as concise code blocks
- No redundant information between SKILL.md and references
- SKILL.md has quick-lookup tables; references have full details + examples

## Version History

| Date       | Changes                                              |
|------------|------------------------------------------------------|
| 2026-06-14 | Added guide-standalone.md (CDN + HTML template), SKILL.md standalone section, 6→7 references |
| 2026-06-14 | Full skill refresh: all 6 reference files updated, SKILL.md layout section, README.md rewritten, segment a/b render fix, layer dual-style, postinstall multi-platform |
| 2026-06-14 | Major: elements.ts deleted, layout API (node/block/port/edge/layer/enclosure), CoreNode mixin unified labels, layer style: band/swimlane, EntityId branded type, oklch→hex color pipeline, labelPlace on regions |
| 2026-06-13 | Added `using` syntax support, `AgentStage extends Disposable`, polyfill |

---

Last updated: 2026-06-14
