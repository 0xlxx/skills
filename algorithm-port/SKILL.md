---
name: algorithm-port
description: 从参考实现（Java/C/Python）移植算法到 TypeScript。先读上游源码写形式化分析+不变量+边界情况，再写完整测试，最后用地道 TS 实现。适用于算法移植、布局算法、数学/CS 正确性关键场景。
---

# Algorithm Port — 形式化驱动移植

## 上下文继承

两个 agent 均通过 `inherit_context: true` 从编排者继承上下文，无需手动传递。

## Agent A（测试编写者）

执行 Phase 0→1→2。只读上游源码和形式化分析文档，不读实现代码。测试纯粹基于规约。

```
Phase 0:  Read upstream source     → Understand intent, not syntax
Phase 1:  Write formal analysis    → invariants, boundary cases
Phase 2:  Write all tests          → estimate → write → review → supplement → loop
```

## Agent B（实现者）

执行 Phase 3→4。读形式化分析文档，**不读测试**（避免被测试用例引导实现）。不读上游源码（避免被参考实现思维污染）。实现必须让测试变绿。

```
Phase 3:  Implement                → Idiomatic TS, map 1:1 to formal analysis
Phase 4:  build && test            → All green before done
```

> **Agent B 只在测试失败时才读对应的失败测试**，理解失败原因后修正实现。不浏览全部测试。

## Core principles

1. **Abstract naturally** — data structures reflect problem domain directly. Names align with paper terminology.
2. **Elegant & concise** — TS native capabilities (Map, iterators, generators, destructuring). No reference-implementation patterns (no getter/setter boilerplate, no factory class hierarchies, no inheritable API).
3. **Logically correct** — algorithm logic maps to upstream source 1:1, expressed in TS idiomatically. No simplification — behavior must be identical.
4. **Invariant-driven tests** — tests verify invariants hold, not hardcoded expected values. Test what must be true, not what a specific output should be.

## Phase 1 — Formal Analysis

Write `plans/pX-formal-analysis.md` containing:

### Required sections
1. **Algorithm description** — what it does, input/output, key insight
2. **Phases / stages** — step-by-step breakdown, referencing upstream source locations
3. **Invariants** — numbered table with proof sketch. Each invariant is a logical statement that must hold regardless of input
4. **Boundary cases** — empty input, single element, cycles, self-loops, disconnected components
5. **TS adaptation notes** — Java/C → TS mapping decisions (e.g. "Map<LNode, T> instead of T[] indexed by node.id")

## Phase 2 — Tests

### 预估

先根据「不变量 × 边界情况 + 边界外 case」预估合理数量。例如：5 个不变量，4 个边界情况，预期落在 15~25 个测试比较合理。太少说明遗漏，太多说明测试可以合并。

### 写测试

```ts
// tests/pX.test.ts
describe('Phase N: Algorithm Name', () => {
  it('I1: invariant description (boundary: empty)', () => { ... });
  it('I1: invariant description (boundary: single)', () => { ... });
  it('I2: ...', () => { ... });
});
```

### 原则
- **验证不变量，不验证硬编码值**。测试不写 `expect(result).toEqual([...])`，而写 `expect(holdsInvariant).toBe(true)` 或计算属性断言。
- 每个不变量 × 每个边界情况至少一个测试。
- 每个边界情况至少覆盖到。

### 循环审查

> 写完初稿 → 自查是否遗漏 → 补充 → 再查 → 直到自信

检查清单：
- 所有不变量都覆盖了？
- 所有边界情况都覆盖了？
- 不变量交叉组合覆盖了？
- 多组件/多阶段场景覆盖了？
- 退化输入（全相同、全不同、极值）覆盖了？

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
- 1:1 mapping to upstream source — no simplification, no omission
- Read upstream source **for intent**, not syntax
- Express in modern TS: use `Map`, `Set`, destructuring, optional chaining
- Split by semantic phases as separate functions
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

## 5. TS adaptation notes
- Pattern X → TS pattern Y
```

## Anti-patterns

- ❌ Copy-pasting reference implementation syntax into TS
- ❌ Writing tests after implementation
- ❌ Skipping formal analysis ("I understand it")
- ❌ Simplifying or omitting upstream behavior
- ❌ Tests that check hardcoded expected values instead of invariants
- ❌ Agent B reading all tests — only read on failure
- ❌ Over-abstracting: extract function to share 3 lines?
- ❌ Defensive code for unreachable states
- ❌ Comments that repeat code (use `// WHY non-obvious` only)
