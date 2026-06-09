---
name: formalism-driven-dev
description: Formal-analysis-driven algorithm implementation from Java source to TypeScript. Deep-read upstream source (e.g. ELK), write formal analysis with invariants and boundary cases, write exhaustive tests, then implement in idiomatic TS. Use when rewriting/porting algorithms, implementing graph layouts, or any correctness-critical math/CS algorithms ported from reference implementations.
---

# Formalism-Driven Development

## Quick start

两个独立 agent 执行：

**Agent A（测试编写者）**执行 Phase 0→1→2。只读上游源码和形式化分析文档，不读实现代码。根据规约写测试，不知道实现会怎么写。

**Agent B（实现者）**执行 Phase 3→4。读形式化分析文档和已有测试，不读上游源码（避免被 Java 思维污染）。实现必须让测试变绿。

```
Agent A:
  Phase 0:  Read upstream source  → Understand intent, not syntax
  Phase 1:  Write formal analysis → invariants, boundary cases, simplification decisions
  Phase 2:  Write all tests       → Full branch coverage, review gaps, supplement

Agent B（Agent A 完成后才启动）:
  Phase 3:  Implement             → Idiomatic TS, map to formal analysis
  Phase 4:  build && test         → All green before next phase
```

> 关键：Agent B 只读形式化分析文档和测试，不接触上游源码。Agent A 不知道实现细节，测试纯粹基于规约。两组分离确保测试不是对实现的镜像，而是对规约的独立验证。

## Core principles

1. **Abstract naturally** — data structures reflect problem domain directly. Names align with paper terminology.
2. **Elegant & concise** — TS native capabilities (Map, iterators, generators, destructuring). No Java patterns (no getter/setter boilerplate, no factory class hierarchies, no inheritable API).
3. **Logically correct** — algorithm logic maps to upstream source line-by-line, but expressed in TS idiomatically. TDD with full branch coverage.

## Phase 1 — Formal Analysis

Write `plans/pX-formal-analysis.md` containing:

### Required sections
1. **Algorithm description** — what it does, input/output, key insight
2. **Phases / stages** — step-by-step breakdown
3. **Invariants** — numbered table with proof sketch
4. **Boundary cases** — empty input, single element, cycles, self-loops, disconnected components
5. **Simplification decisions** — what upstream complexity is omitted and why (e.g. "omit hierarchical handling — single flat graph only for now")
6. **TS adaptation notes** — Java → TS mapping decisions (e.g. "Map<LNode, T> instead of T[] indexed by node.id")

### Test estimate
Include an initial test count estimate based on invariants × boundary cases + edge cases.

## Phase 2 — Tests

### Structure
```ts
// tests/pX.test.ts
describe('Phase N: Algorithm Name', () => {
  it('T01: scenario description', () => { ... });
  it('T02: ...', () => { ... });
});
```

### Coverage requirements
- Every invariant from formal analysis gets at least one test
- Every boundary case gets a test
- Edge cases: self-loops, disconnected components, reversed edges, singular nodes, empty input
- After initial writing, **review for gaps** — check:
  - Are all branches covered?
  - Are multi-component cases tested?
  - Are degenerate inputs (all same, all different, max values) tested?
  - Are multi-edge cases tested?

### Iterative refinement
> Write → Review → Supplement → Loop until confident

## Phase 3 — Implementation

### File structure
```ts
// src/pX-algorithm-name.ts
/**
 * Brief: what this module does.
 *
 * Algorithm:
 *   1. Step one
 *   2. Step two
 *
 * TS adaptation:
 *   - Design decision 1
 *   - Design decision 2
 */

export function mainEntry(/* ... */): void { ... }
```

### Mapping rules
- Read ELK Java source **for intent**, not syntax
- Express in modern TS (2026): use `Map`, `Set`, destructuring, optional chaining
- Split by semantic phases as separate functions (not one giant class method)
- No unnecessary abstractions — prefer inline transformations over extract functions

## Phase 4 — Verify

```bash
pnpm build && pnpm test
```

## Template: formal analysis document

```md
# PX Algorithm Name — 形式化分析

## 1. Core algorithm
[1-2 sentences about what it does and key insight]

## 2. Phases
### Phase A: ...
[Step-by-step, referencing upstream code inline numbers or procedure names]

## 3. Invariants
| # | Invariant | Proof |
|---|-----------|-------|
| I1| ...       | ...   |

## 4. Boundary cases
- empty input → ...
- single element → ...
- ...

## 5. Simplification decisions
| Upstream (ELK) | GGN | Reason |
|----------------|-----|--------|
| ...            | ... | ...    |

## 6. TS adaptation notes
- Java pattern X → TS pattern Y
```

## Anti-patterns

- ❌ Copy-pasting Java syntax into TS
- ❌ Writing tests after implementation
- ❌ Skipping formal analysis ("I understand it")
- ❌ Over-abstracting: extract function to share 3 lines?
- ❌ Defensive code for unreachable states
- ❌ Comments that repeat code (use `// WHY non-obvious` only)
