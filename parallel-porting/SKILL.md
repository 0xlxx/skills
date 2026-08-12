---
name: parallel-porting
description: '大规模 1:1 移植 / 并行重构工作流（Bun Zig→Rust 方法论落地）。Use when porting a codebase or algorithm suite 1:1 from one language or implementation to another (e.g. Java→TypeScript, Zig→Rust), syncing algorithms across repos against a single source of truth (SSOT), or running parallel multi-agent batches over many independent defect clusters. Covers worktree sharding, adversarial review loops, machine-checkable exit gates, remark backflow, and topological merge. Trigger words: 移植 / port / 1:1 对齐 / SSOT / worktree 并行 / 对抗审查 / adversarial review / 簇集群 / MODULES.tsv / 机器可检查门禁 / Bun 方法论 / 备注回流。'
---

# Parallel Porting（并行移植工作流）

把「移植 + 并行多代理」做成可复现的流水线：**先花时间定规则，再让 agent 照规则抄，而不是各猜各的**。
核心思想来自 Bun Zig→Rust 移植（4 worktree × 16 agent、implementer + 2×adversarial reviewer + fixer、机器可检查退出条件）。
本 skill 已在 ELK Java 0.12.0 → TypeScript 项目验证：1.5 万行非 layered 算法拆 4 簇并行，40 分钟全部完成、逐簇合并、全量门禁不降。

## 前置条件（不满足不要开始）

1. **SSOT 单一事实源**：权威实现（源码/文档/二进制）路径明确，一切以它为准；有争议时以 SSOT 的测试/实际行为为准，不要自创解释。
2. **可验证基线**：至少一条差分/回归命令 + 当前基线数字（例：`verify` 348 全等 / `bdd` 337 / `oracle` 1036 / `696` 0 失败）。没有基线，任何并行产出都无法打分。
3. **每轮循环**（每个簇内）：读资料 → ast-grep 对比 → 测试先行（不变量）→ 回归 → 备注回流。

## 阶段 0 — 准备（一次性，主线程做）

1. 写 `PORTING.md` 移植宪法：命名规则、映射规则、已知陷阱（对齐 Bun 的 300 条 Zig→Rust 映射规则）。最难的问题先一次性解决，避免 N 个 agent 各自猜。
2. 建 `MODULES.tsv` 模块清单：`源类 ↔ 目标模块 ↔ 移植状态 ↔ 算法不变量 ↔ 测试文件`。并行 agent 先查表再动手（对齐 Bun 的 LIFETIMES.tsv）。模板见 `references/MODULES.tsv.template`。
3. 建语料与 oracle：用 SSOT 跑一批输入生成参考输出（oracle），目标侧做差分；语料无触发的算法要**自建触发语料**。
4. 分派基础设施：确认执行器可用（ccx / `claude -p` / 子代理）、机器核数、共享依赖目录（node_modules、lib、编译产物）。

## 阶段 1 — 任务分片（可枚举、可验证）

- 按**根因模块簇**分片（可枚举、可验证），不是"把项目变好"。每簇对应一批可跑命令能验证的改动。
- 簇间无文件重叠；共享文件（入口/分派文件）预先规划：要么主线程预改，要么接受合并时机械冲突。
- 每簇一份简报，必须含 6 要素（模板见 `references/cluster-brief.template.md`）：
  0. MODULES.tsv 行（动手前查表，不各自猜）
  1. 模型清单 + 当前 diff
  2. 已探明根因线索（含源文件/行号）
  3. Scope 边界（可碰/不可碰，避免簇间冲突）
  4. 方法（ast-grep 对比 → 实现 → BDD → verify）
  5. 退出条件（机器可检查）
- 依赖簇做拓扑排序：独立簇先并行，依赖簇后合。

## 阶段 2 — 并行执行（worktree 分片）

- 每簇独立 worktree + 分支（`scripts/setup-worktree.sh`），**禁止多 agent 共享同一 checkout**（必互踩）。
- 软链共享依赖（node_modules / lib / 编译产物），避免每簇重复安装；注意 symlink 会显示为 untracked，不要被 `git add .` 带进提交。
- **Agent 铁律**：
  - ❌ `git stash` / `git reset` / `git checkout -f` / `git clean` / `git rebase`
  - ❌ 改 scope 外文件
  - ✅ 只允许 `git add <具体文件>` + `git commit` + 只读查询
- 派发执行器（`scripts/dispatch-ccx.sh`）：`ccx --cwd <worktree> --report --timeout 大 --budget N "读简报，严格执行"`。
  - **tmux 守护 + 日志落盘**（后台进程会被 exec/PTY 会话回收杀掉，tmux 不会）。
  - 每个执行器给预算上限（safety net）与超时；超时用 `--resume` 续跑。
- 监控：进程存活 + worktree 文件系统活动（`git status` / `find -newermt`）。**ccx 输出是缓冲的**（收尾才写日志），不要靠日志判断进度。

## 阶段 3 — 对抗审查闭环（写的不审、审的不写）

```
implementer 提交 → 2× adversarial reviewer（只拿 git diff，假设代码是错的）
  → fixer 应用反馈 → 主线程 merge
```

- reviewer 只拿 `git diff`，不知道 implementer 的任何推理；按该簇退出条件逐条核对。
- 主线程 review 清单：diffstat 合理性、共享文件改动、红旗扫描（TODO / FIXME / `any` / `ts-ignore` / `console.log`）、簇级差分**独立复跑**。

## 阶段 4 — 备注回流（强制，每轮必做）

- 子代理汇报里的「备注/遗留/发现」**不得只留在汇报里**。
- 主线程**独立验证**（对照 SSOT 源码 / 跑测试 / 查现状）→ 登记 `agent-remarks.md`（模板见 `references/agent-remarks.template.md`）→ 回流计划：
  - 代码级差异 → 立即修（走正常合并）
  - 工具链问题 → 修脚本
  - 待办 → 列入后续簇简报 + MODULES.tsv
- 每轮结束检查登记册：无「未处置」条目。

## 阶段 5 — 合并（拓扑 + 每合必测）

- 独立簇先合 → 依赖簇后合；冲突逐文件 resolve。
- **每合一个簇，跑一次全量门禁，确认数字不降**。
- 共享文件冲突（所有簇都改同一分派文件）→ 机械合并：保留每簇的集合/分支，主线程手工 resolve，禁止 `checkout --ours/theirs` 整文件覆盖。
- 合并后清理 worktree：`git worktree remove --force <path>`（先确认分支已合入）。

## 机器可检查退出条件（agent 不给自己打分）

| 关卡 | 命令 | 标准 |
|---|---|---|
| 簇级 | `<verify 脚本> '<簇模型 glob>'` | 全等（容差 ε，如 1e-3） |
| 全量 | `<verify 脚本>` | ≥ 基线且不降 |
| 单测/BDD | `vitest run tests/bdd` | 全过 |
| oracle | `vitest run <oracle>` | 全过 |
| 回归 | `<diff-failures> collect-all && check` | 0 失败 |

agent 汇报必须结构化（files / verifications / problems / notes），逐条对照退出条件，未满足不得声称完成。

## 陷阱清单（实战踩坑）

1. 多 agent 共享同一 checkout 必互踩（一个 stash 一个 pop 互相毁）→ **worktree 隔离是第一优先级**。
2. 后台任务被 exec/PTY 会话回收杀掉 → tmux / setsid 守护。
3. 执行器输出缓冲（收尾才写日志）→ 用进程存活 + 文件系统活动监控，不要盯日志。
4. 变异测试进日常循环太慢 → 作为**周期性门禁**，不是每次改动的验证循环。
5. harness 强制 root 算法/选项 → 自建语料必须把目标算法写在**子节点**（root 的算法可能被强制覆盖，测不到目标）。
6. 元数据默认值（melk / 配置文件）可能 ≠ 代码 switch default → 以 SSOT **实际行为**（jar / 二进制输出）为准。
7. 语言语义差异：JS number 只有 53 位（位压缩用 BigInt）、HashSet/Map 迭代序（需模拟源语言容器序）等。
8. bug-for-bug：源实现 bug 也要 1:1 保留（差分实证），不要"顺手修"。
9. 共享文件冲突 → 机械合并保留两侧；每合一个跑全量。
10. 结构化工汇报（files/verifications/problems/notes）防"声称完成"；主线程独立复跑关键验证。

## 工具链与资源

- `scripts/setup-worktree.sh` — 建 worktree + 软链共享依赖（参数化）
- `scripts/dispatch-ccx.sh` — tmux 守护并行派发 ccx 执行器（参数化）
- `scripts/check-gates.sh` — 全部门禁汇总模板（参数化）
- `references/ccx-cheatsheet.md` — ccx / claude CLI 参数速查
- `references/MODULES.tsv.template` — 模块清单模板
- `references/cluster-brief.template.md` — 簇简报模板（6 要素）
- `references/agent-remarks.template.md` — 备注登记册模板
