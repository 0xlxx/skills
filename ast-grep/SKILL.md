---
name: ast-grep
description: When exploring an unfamiliar codebase, searching for where symbols live, reading a file you haven't seen before, navigating imports/exports, or answering architecture questions — use ast-grep outline as a structural primitive before reaching for Read. Especially on repos above a few hundred files.
---

<ast-grep>

<core-principle>
`ast-grep outline` is a **structural primitive** — a cheap, local, AST-backed summary of what a file or directory contains: its functions, classes, imports, exports, and members. It fills the gap between finding a candidate file (Glob, Grep) and reading its implementation (Read).

No index. No cross-file analysis. No type resolution. Just tree-sitter parsing plus declarative extraction rules — fast enough to run every time you ask.
</core-principle>

<workflow>
## The standard pattern: locate → outline → read

When you need to understand code, don't jump from a Grep match straight to Read. Insert outline between them:

```
# 1. Locate candidates
Grep: "handlePayment" src/
Glob: src/**/*handler*

# 2. Outline to confirm the file has what you need
ast-grep outline src/payment/handler.ts

# 3. Now Read — but only the relevant parts
Read: src/payment/handler.ts (just the handlePayment function)
```

This saves tokens because you don't Read a 500-line file only to find it doesn't contain what you're after.
</workflow>

<commands>
## Outline by intent

Reach for the command that matches what you want to know:

| You want to know | Command |
|---|---|
| What does this file define? | `ast-grep outline file.ts` |
| What does this directory export? | `ast-grep outline src/` (defaults to exports view) |
| What's inside this class? | `ast-grep outline file.ts --match ClassName --view expanded` |
| What does this file import? | `ast-grep outline file.ts --items imports` |
| Where is this dependency imported? | `ast-grep outline src/ --items imports --match dependency-name` |
| Show me all function signatures | `ast-grep outline file.ts --type function --view signatures` |

For machine consumption, add `--json` or `--json=stream`.
</commands>

<rules>
## Rules

### 1. Outline precedes Read, never replaces it

outline tells you *what's there*; Read tells you *how it works*. Use outline to decide *whether* to read a file and *which parts*. After outlining, you still Read — but you Read precisely.

### 2. Size matters

On repos above ~500 files, outline almost always earns its keep (benchmarks show 12–67% token savings). On repos under ~100 files, skip it — direct Read is cheaper.

### 3. One outline, many Reads

When you need to read several parts of the same file, outline once first to map the layout, then Read each section you need. Don't outline again for the same file.

### 4. Fall back when outline is unavailable

If ast-grep isn't installed or < 0.44.0, approximate with Grep:
```
Grep: "^(export )?(class|function|struct|enum|interface) " file.ts
```

Install: `brew install ast-grep` (macOS) or `cargo install ast-grep` (any platform).
</rules>

<benchmarks>
## When outline pays off

Benchmarked across 7 repos (56 independent sessions), outline vs no-outline on architecture-level prompts:

| Repo | Files | Token Δ | Time Δ |
|---|---|---|---|
| VS Code | 11,370 | **−45%** | −12% |
| Django | 3,030 | **−67%** | −33% |
| OkHttp | 640 | **−40%** | −5% |
| Tokio | 779 | −12% | −3% |
| Excalidraw | 625 | −26% | ~even |
| Gin | 99 | +39% | +13% |
| Alamofire | 108 | ~even | +26% |

The crossover is around 200–500 files. Below that, outline adds overhead instead of saving it.
</benchmarks>

<limitations>
- Language coverage depends on bundled extractor rules — missing languages need contributed rule definitions
- Does not resolve types, follow references, or construct call graphs
- Member attachment is syntactic, not semantic (Rust `impl` methods may appear as top-level items)
- Alpha feature (0.44.0): JSON interface and custom language support still in development
</limitations>

</ast-grep>
