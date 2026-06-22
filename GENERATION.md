# Skills Generation Information

This document contains information about how these skills are maintained and how to keep the skill inventory synchronized.

## Generation Details

**Generated at:**

- **Commit SHA**: `15ac974fe8eb090d2bb88bf2ca101feaf4b0f82d`
- **Date**: 2026-06-22
- **Commit**: chore: add manifest skill, GENERATION.md, update README

**Source documentation:**

- Project README: `/README.md`
- Skills are self-contained — each skill's `SKILL.md` is the authoritative source, not generated from external docs.

**Generation date**: 2026-06-22

## Structure

```
skills/
├── GENERATION.md               # This file
├── README.md                   # Project overview and skill index
│
├── api-design/                 # Active
│   ├── SKILL.md                # Main skill file
│   └── ANTIPATTERNS.md         # API design anti-patterns reference
├── bug-clarify/                # Active
│   └── SKILL.md                # Main skill file
├── direct-readme/              # Active
│   ├── SKILL.md                # Main skill file
│   └── evals/
│       └── evals.json          # Evaluation dataset
├── essence-first/              # Active
│   └── SKILL.md                # Main skill file
├── manifest/                   # Active
│   └── SKILL.md                # Main skill file
├── tourist/                    # Active
│   └── SKILL.md                # Main skill file
├── visual-teaching/            # Active
│   └── SKILL.md                # Main skill file
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
    └── zhihu-answer/           # SKILL.md + references/ (1 file)
```

## Active Skills (7)

| Skill | Description | Files |
|-------|-------------|-------|
| `api-design` | API 设计指南——渐进式增强、框架无关、DX 优先、原子化。设计 API、评审接口、重构签名时使用。 | SKILL.md, ANTIPATTERNS.md |
| `bug-clarify` | 修复 bug 前强制澄清——追问现象、复现步骤、预期、严重性、回归风险，确认后才动手。 | SKILL.md |
| `direct-readme` | 编写或生成 GitHub 项目 README 文件，强调简单、直接、开箱即用。 | SKILL.md, evals/evals.json |
| `essence-first` | 本质先行——解释概念时先给上下文和一句话本质，再递进到细节。 | SKILL.md |
| `manifest` | 生成并维护 skills/GENERATION.md 溯源清单，追踪每个 skill 的来源、结构与更新流程。 | SKILL.md |
| `tourist` | 按 tourist 的优化哲学——降维、常数优先、最直接。性能优化、代码加速时使用。 | SKILL.md |
| `visual-teaching` | 创建可视化教学材料——课程、图解、参考资料。HTML 优先，本质先行，逐层拆解。 | SKILL.md |

## Archived Skills (14)

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
git diff --name-only 15ac974..HEAD -- '*/SKILL.md'

# See full diff of skill changes
git diff 15ac974..HEAD -- '*/SKILL.md'

# See commit log for skills
git log --oneline 15ac974..HEAD -- '*/SKILL.md'
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

---

Last updated: 2026-06-22
Current SHA: 15ac974
