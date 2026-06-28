# Skills Generation Information

This document contains information about how these skills are maintained and how to keep the skill inventory synchronized.

## Generation Details

**Generated at:**

- **Commit SHA**: `ed71c60`
- **Date**: 2026-06-28
- **Commit**: feat: add feature-dev skill, apply natural-mental-model to proposal

**Source documentation:**

- Project README: `/README.md`
- Skills are self-contained — each skill's `SKILL.md` is the authoritative source, not generated from external docs.

**Generation date**: 2026-06-26

## Structure

```
skills/
├── GENERATION.md               # This file
├── README.md                   # Project overview and skill index
│
├── api-design/                 # Active
│   ├── SKILL.md                # Main skill file
│   └── ANTIPATTERNS.md         # API design anti-patterns reference
├── ast-grep/                   # Active
│   ├── SKILL.md                # Main skill file
│   └── BENCHMARKS.md           # Token/time benchmarks across 7 repos
├── bug-clarify/                # Active
│   └── SKILL.md                # Main skill file
├── direct-readme/              # Active
│   ├── SKILL.md                # Main skill file
│   └── evals/
│       └── evals.json          # Evaluation dataset
├── essence-first/              # Active
│   └── SKILL.md                # Main skill file
├── feature-dev/                # Active
│   ├── SKILL.md                # Main skill file
│   └── TODO_TEMPLATE.md        # TODO.md template for step 3.3
├── intrinsic-design/           # Active
│   └── SKILL.md                # Main skill file
├── manifest/                   # Active
│   ├── SKILL.md                # Main skill file
│   └── TEMPLATE.md             # GENERATION.md template for step 4
├── teach/                       # Active
│   ├── SKILL.md                # Main skill file
│   ├── GLOSSARY-FORMAT.md      # Glossary document format
│   ├── KATEX.md                # KaTeX formula rendering setup
│   ├── LEARNING-RECORD-FORMAT.md # Learning record format
│   ├── LESSON-FORMAT.md        # Lesson production format (essence→layers→synthesis)
│   ├── MISSION-FORMAT.md       # Mission document format
│   ├── RESOURCES-FORMAT.md     # Resources document format
│   └── STYLES.md               # Teaching HTML defaults and intrinsic design
├── tourist/                    # Active
│   └── SKILL.md                # Main skill file
├── unit-test/                  # Active
│   └── SKILL.md                # Main skill file
│
├── proposal/                   # Draft skills (not yet active)
│   └── SKILL.proposal.md       # natural-mental-model — optimize skills with natural mental constraints
│
├── api-design-workspace/       # Evaluation workspace (not a skill)
│   └── iteration-*/            # Eval runs with grading, timing, outputs
├── direct-readme-workspace/    # Evaluation workspace (not a skill)
│   └── iteration-1/            # Eval runs with grading, timing, outputs
│
└── archived/                   # Deprecated / superseded skills
    ├── README.md
    ├── algorithm-port/         # SKILL.md
    ├── debug-optimize-lcp/     # SKILL.md + references/ (3 files)
    ├── fdd-dev/                # SKILL.md
    ├── fdd-pm/                 # SKILL.md
    ├── fdd-runner/             # SKILL.md
    ├── fdd-test/               # SKILL.md
    ├── fix/                    # SKILL.md + scripts/ (2 files)
    ├── handoff/                # SKILL.md
    ├── memory-leak-debugging/  # SKILL.md + references/ (2 files)
    ├── native-feel/            # SKILL.md + README.md + references/ (7) + checklists/ (2)
    ├── readme-direct/          # SKILL.md
    ├── take/                   # SKILL.md
    ├── troubleshooting/        # SKILL.md
	    ├── visual-teaching/       # SKILL.md + KATEX.md + STYLES.md (merged into teach)
    └── zhihu-answer/           # SKILL.md + references/ (1 file)
```

## Active Skills (11)

| Skill | Description | Files |
|-------|-------------|-------|
| `api-design` | API 设计指南——渐进式增强、框架无关、DX 优先、原子化。设计新 API、评审接口时使用。不涵盖向后兼容。 | SKILL.md, ANTIPATTERNS.md |
| `ast-grep` | 使用 ast-grep outline 在读取文件前先了解其结构——声明、导入、导出、成员。探索代码库、定位符号、理解文件形态时使用。 | SKILL.md, BENCHMARKS.md |
| `bug-clarify` | 修复 bug 前强制澄清——追问现象、复现步骤、预期、严重性、回归风险，确认后才动手。 | SKILL.md |
| `direct-readme` | 编写或生成 GitHub 项目 README 文件——开门见山，开箱即用。 | SKILL.md, evals/evals.json |
| `essence-first` | 本质先行——从定锚点到递进理解，用四层结构帮读者搭建认知模型。解释概念、对比事物时使用。 | SKILL.md |
| `feature-dev` | 递阶控制 + DAG 驱动的功能实现流程——从设计方案到逐节点实现再到归档。开始新功能、新模块时手动调用。 | SKILL.md, TODO_TEMPLATE.md |
| `intrinsic-design` | Intrinsic Web Design — content-driven CSS layout using intrinsic sizing, Grid, Flexbox, and fluid values without media queries. | SKILL.md |
| `manifest` | 生成并维护 skills/GENERATION.md 溯源清单，追踪每个 skill 的来源、结构与更新流程。 | SKILL.md, TEMPLATE.md |
| `teach` | 在工作区内教授用户一项新技能或概念——使命驱动，最近发展区选课，多文件 HTML 课程。 | SKILL.md, GLOSSARY-FORMAT.md, KATEX.md, LEARNING-RECORD-FORMAT.md, LESSON-FORMAT.md, MISSION-FORMAT.md, RESOURCES-FORMAT.md, STYLES.md |
| `tourist` | 按 tourist 的优化哲学——降维、常数优先、最直接。性能优化、代码加速时使用。 | SKILL.md |
| `unit-test` | 编写优秀的单元测试——FIRST、AAA、Right-BICEP。写单测、加测试、评审测试时使用。 | SKILL.md |

## Archived Skills (15)

Skills in `archived/` are no longer actively maintained but preserved for reference.

| Skill | Description | Notable Files |
|-------|-------------|---------------|
| `algorithm-port` | 从参考实现（Java/C/Python）移植算法到 TypeScript，先形式化分析再实现。 | SKILL.md |
| `debug-optimize-lcp` | Chrome DevTools 驱动的 LCP 性能诊断与优化。 | SKILL.md, references/ (3) |
| `fdd-dev` | 根据需求规约实现功能，与 fdd-test 并行。 | SKILL.md |
| `fdd-pm` | 定义开发需求、范围与验收标准，输出规约文档。 | SKILL.md |
| `fdd-runner` | FDD 工作流编排，按流程串行调度子 agent。 | SKILL.md |
| `fdd-test` | 根据需求规约编写测试，与 fdd-dev 并行。 | SKILL.md |
| `fix` | 前端 bug 的复现→诊断→修复→验证闭环。 | SKILL.md, scripts/ (2) |
| `handoff` | 将当前对话压缩为 handoff 文档供另一 agent 接手。 | SKILL.md |
| `memory-leak-debugging` | JavaScript/Node.js 内存泄漏诊断，含 memlab 集成。 | SKILL.md, references/ (2) |
| `native-feel` | 跨平台桌面应用原生感设计指南——macOS + Windows，快速启动、原生窗口、原生输入。 | SKILL.md, README.md, references/ (7), checklists/ (2) |
| `readme-direct` | 编写和审查直击要点的 README 文件。 | SKILL.md |
| `take` | 从 handoff 文档恢复上一会话继续工作。 | SKILL.md |
| `troubleshooting` | Chrome DevTools MCP 连接与 target 问题排查。 | SKILL.md |
| `visual-teaching` | 创建可视化教学材料——HTML 优先，本质先行，逐层拆解，内在响应式。已合并到 teach。 | SKILL.md, KATEX.md, STYLES.md |
| `zhihu-answer` | 以用户语气起草知乎回答，基于知识库和高赞回答。 | SKILL.md, references/ (1) |

## File Naming Convention

Skills follow a flat structure — the primary file is always `SKILL.md`. Optional companion files:

- `README.md` — user-facing skill documentation (rare, only `native-feel`)
- `ANTIPATTERNS.md` — design anti-patterns reference (`api-design`)
- `references/*.md` — detailed reference material disclosed behind context pointers
- `checklists/*.md` — decision trees or readiness checklists (`native-feel`)
- `scripts/*` — executable templates (`fix`)
- `evals/` — evaluation datasets and grading configs (`direct-readme`)

Eval workspaces use `*-workspace/` naming with `iteration-N/` subdirectories containing `eval_metadata.json`, `grading.json`, `timing.json`, and `outputs/`.

## How to Update Skills

This project's skills are self-contained — each `SKILL.md` is the authoritative source, not generated from external docs. Skills evolve through direct editing, not regeneration from upstream documentation.

### 1. Check What Changed

```bash
# List skills modified since last generation
git diff --name-only b44918f..HEAD -- '*/SKILL.md'

# See full diff of skill changes
git diff b44918f..HEAD -- '*/SKILL.md'

# See commit log for skills
git log --oneline b44918f..HEAD -- '*/SKILL.md'
```

### 2. Update Process

**Skill added:**
- Add row to Active Skills table above
- Update Structure tree
- If it has reference files, list them with descriptions

**Skill modified:**
- Update description if changed
- Update file list if companions added/removed

**Skill archived:**
- Move from Active Skills to Archived Skills table
- Update Structure tree

**Skill deleted:**
- Remove from all tables and Structure tree

### 3. Update Checklist

- [ ] Review `git diff --name-only <last-sha>..HEAD -- '*/SKILL.md'`
- [ ] Update Active Skills table for added/modified skills
- [ ] Update Archived Skills table for archived skills
- [ ] Update Structure tree
- [ ] Update this `GENERATION.md` with new SHA and date
- [ ] Append entry to Version History

## Style Guidelines

- Skills use Chinese descriptions for Chinese-speaking audience
- Each skill's `SKILL.md` is self-contained with frontmatter (`name`, `description`)
- Model-invoked skills keep a `description` with trigger phrases; user-invoked skills set `disable-model-invocation: true`
- Reference files are disclosed behind context pointers, not inlined in SKILL.md

## Version History

| Date       | SHA      | Changes |
|------------|----------|---------|
| 2026-06-22 | 636c543  | Initial GENERATION.md — 5 active skills, 14 archived, 2 eval workspaces |
| 2026-06-22 | 15ac974  | Add tourist and visual-teaching — 7 active skills |
| 2026-06-23 | 14961d0  | Add unit-test — 8 active skills |
| 2026-06-23 | 08de9cd  | Fix manifest step 0 workspace check branching |
| 2026-06-23 | —        | Add ast-grep — 9 active skills |
| 2026-06-25 | fde5ffe  | Add intrinsic-design — 10 active skills |
| 2026-06-26 | 97ed97f  | Refine 6 skills with writing-great-skills methodology |
| 2026-06-26 | 67552ee  | Refine api-design (no back-compat), visual-teaching (responsive), essence-first (four-layer + 递进理解) |
| 2026-06-27 | b44918f  | Merge visual-teaching into teach (8 files), archive visual-teaching, add natural-mental-model proposal |
| 2026-06-28 | ed71c60  | Add feature-dev (递阶控制 + DAG), apply natural-mental-model self-consistency to proposal |

---

Last updated: 2026-06-28
Current SHA: ed71c60
