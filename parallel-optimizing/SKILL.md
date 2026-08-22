---
name: parallel-optimizing
description: '行为等价下的并行算法优化工作流（parallel-porting 的优化版，面向 JS/TS 算法/库的性能与包体积优化）。Use when optimizing a verified JS/TS codebase for performance and bundle size while keeping behavior bit-exact (e.g. a 1:1 port that already passes oracle gates), running parallel multi-agent batches over independent algorithm hotspots, or adding perf-regression gates. Covers hotspot profiling, bench-driven optimization loops, bit-exact float gates with exemption registries, order-sensitivity classification, dual-runtime validation (bun/Chrome), tree-shaking bundle slimming, and topological merge. Trigger words: JS/TS 性能优化 / 算法优化 / 提速 / benchmark / perf / 逐算法优化 / 热点 / bundle 瘦身 / tree-shaking / 浮点门禁 / bit-exact / 性能回归 / 免分配 / typed array / 复用池。项目特化命令/基线/历史成果在项目内优化 SSOT 文件（见「项目文件约定」），不在 skill 里。'
---

# Parallel Optimizing（并行算法优化工作流）

> **适用范围**：本 skill 面向 **JS/TS 算法/库** 的性能与包体积优化（`bun`/`tsdown`/`rolldown`/`vitest` 工具链），编排假设为 **Codex/ccx 多 agent + git worktree**。
> 换语言/工具链/编排时：方法论与陷阱通用，但 `scripts/` 与门禁命令需按项目重写；项目特化实例在项目 `docs/optimization.md`，不在本 skill。

parallel-porting 的「优化版」：骨架（分片/并行/审查/合并/备注回流）复用，但 **SSOT 从「上游源码」换成「行为等价门禁 + 性能基线」**。
核心：**行为等价（bit-exact）是硬约束，性能/体积是目标**。先把规则定死，再让 agent 照规则优化，而不是各改各的。

> 本 SKILL.md 只含**项目无关的方法论 + 文件命名/位置/格式约定 + 模板**。
> **具体项目实例（基线数字、热点表、命令、陷阱实例、历史成果）放在项目里，不在 skill**：
> 执行时先按「项目文件约定」去项目找/建文件，读取历史成果再开工。

## 前置条件（不满足不要开始）

1. **行为等价 SSOT**：至少一条 bit-exact/对齐命令 + 当前基线数字（例：`<verify:bit-exact> N 覆盖` / `<verify:align> M/K exit 0` / `<regression> 0 失败`）。没有基线，任何优化产出都无法打分。
2. **性能基线**：模块级耗时表（如 `--phase`）+ 端到端 bench + bundle 大小（minify/gzip）。没有性能基线，无法判断优化是否有效。
3. **每轮循环**（每个簇内）：定位热点 → 提出假设（含顺序相关性分类）→ 修改 → 三层验证（bit-exact/结构/性质）→ bench 对比 → 备注回流。

## 项目文件约定（skill 只给命名/位置/格式；具体内容在项目里）

执行 skill 时，**先到项目里找这些文件读取历史成果**（存在即读，不存在则按模板新建）。
skill 的 `references/*.template` 只提供**格式规范**，不放任何具体基线/数字/实例。

| 文件（项目内位置） | 用途 | 格式来源 |
|---|---|---|
| `<包根>/docs/optimization.md` | **项目优化 SSOT**：门禁/性能/bundle 基线、命令速查、热点表、陷阱实例、历史记录、tag 约定 | 文本约定（见下） |
| `<包根>/OPTIMIZATION_CLASSES.tsv` | 优化分类表（模块↔热点↔顺序相关性↔状态） | `references/OPTIMIZATION_CLASSES.tsv.template` |
| `<包根>/docs/clusters/_COMMON.md` | 公共简报（方法/铁律/退出条件/汇报格式） | `references/cluster-brief.template.md` 的公共部分 |
| `<包根>/docs/clusters/<cluster>.md` | 每簇简报（6 要素 + 顺序相关性） | `references/cluster-brief.template.md` |
| `<包根>/docs/clusters/agent-remarks.md` | 备注回流登记册（R01…历史，逐条验证+处置） | `references/agent-remarks.template.md` |
| `<包根>/triage-registry.json` | 浮点豁免登记（exemptA/B/nonLayered） | 项目门禁脚本约定 |
| 门禁/bench 脚本 | `scripts/verify-*`、`perf-run.mjs`、`check-bench-regression.mjs` | 项目既有 |

**执行顺序**：读 `docs/optimization.md`（基线/命令/历史）→ 读 `OPTIMIZATION_CLASSES.tsv`（查表）→ 读 `agent-remarks.md`（历史备注/未处置清单）→ 新建簇简报 → 派发。

**优化 SSOT（docs/optimization.md）内容约定**（存在即维护，不存在即新建）：
- 门禁基线（bit-exact N 覆盖 / 对齐 M/K / 回归 / bench 数字 / bundle 字节）+ 重采样日期；
- 命令速查（模块耗时表 / 函数 profile / 双运行时 bench / 门禁 / 构建）；
- 热点表 + 各模块状态（✅ 已优化 / ⚠️ 驳回 / 待办）；
- 陷阱实例（项目特有，对应通用陷阱清单）；
- 历史记录（每批次成果 + `git tag` 约定：perf-baseline / perf-optimized）。

## 阶段 0 — 准备（一次性，主线程做）

1. 写 `OPTIMIZATION_CLASSES.tsv` 优化分类表：`模块 ↔ 热点占比 ↔ 优化类型 ↔ 顺序相关性 ↔ 共享状态风险 ↔ 验证命令`。并行 agent 先查表再动手。模板见 `references/OPTIMIZATION_CLASSES.tsv.template`。
2. **双基线固化**：
   - 正确性基线：bit-exact 覆盖（全等 N + 豁免 A + 豁免 B + 跳过 + 报错复刻）+ 对齐数 + 回归失败数；
   - 性能基线：各热点模块耗时 + 端到端 bench + bundle 字节（raw/gzip）。
3. 门禁工具就绪：bit-exact 脚本、对齐脚本、热点定位工具、bench、bundle 分析（具体命令见项目 `docs/optimization.md`）。
4. 分派基础设施：执行器（ccx / Codex 子代理，可混用，见阶段 2）、机器核数、共享依赖。
5. **打 baseline tag**：门禁/简报提交后、算法优化开始前 `git tag -a perf-baseline`；全部合并后打 `perf-optimized`。两点间就是可回溯、可对比的完整改动（`git diff perf-baseline perf-optimized`）。
6. **CI bench 回归门禁必列**（`check-bench-regression.mjs`）：对比 perf-run --bench 的 layout.mean，默认 +10% 阈值只拦变慢。不是「缺失则补」，是阶段 0 必需产出。

## 阶段 1 — 任务分片（可枚举、可验证）

- 按**热点算法簇**分片（可枚举、可验证），不是「把代码变快」。每簇对应一批可跑命令能验证的改动。
- 簇间无文件重叠；共享文件（入口/分派/图模型）预先规划：要么主线程预改，要么接受合并时机械冲突。
- 每簇一份简报，必须含 6 要素（模板见 `references/cluster-brief.template.md`）：
  0. OPTIMIZATION_CLASSES.tsv 行（动手前查表，不各自猜）
  1. 热点证据：模块耗时占比 + 函数级 profile 热点
  2. 优化假设：改什么、为什么快、预期收益（如 ≥20%）
  3. **顺序相关性分类**：本簇改动是否改变遍历/求和/排序顺序（改变 = 非 bit-exact 通道，需显式授权）
  4. Scope 边界（可碰/不可碰，避免簇间冲突）
  5. 方法 + 退出条件（机器可检查）
- 依赖簇做拓扑排序：独立簇（横切层/独立模块）先并行，依赖簇（跨模块重构）后合。

## 阶段 2 — 并行执行（worktree 分片）

- 每簇独立 worktree + 分支（本 skill 的 `scripts/setup-worktree.sh`），禁止多 agent 共享同一 checkout。
- **完整并行协议（铁律/派发/监控/审查/合并/汇报格式）见 `references/parallel-protocol.md`**。
- **worktree 前置**（基于 HEAD，未提交/未跟踪内容不会进去）：
  - 先提交「门禁基建 + 简报 + OPTIMIZATION_CLASSES」再建 worktree；
  - 软链**全部**共享依赖，不只 node_modules：test-resources / oracle / bench-results(cache) / 本地 jar 等被 gitignore 的运行时资源。漏一处 → 门禁跑不起来（ELK 实测：未软链 test-resources 时 368 模型缺失、elk-java-debug/lib 缺失）。
- **Agent 铁律**：
  - ❌ 改顺序相关归约（求和/遍历/排序顺序）——这是 bit-exact 红线；
  - ❌ 共享缓存返回可变对象（调用方原地改字段 → 别名污染 = 正确性 bug）；
  - ❌ 缓存失效点不完整（结构变更都要走 setter 或精确枚举失效点）；
  - ❌ `git stash` / `git reset` / `git checkout -f` / `git clean` / `git rebase`；
  - ❌ 改 scope 外文件；
  - ✅ 只允许 `git add <具体文件>` + `git commit` + 只读查询；
  - ✅ **双运行时/双环境验证**：开发运行时快不代表目标环境快，至少两个环境都要跑；
  - ✅ 免分配/typed array/复用池/缓存优先（不改变运算顺序 → 可保持 bit-exact）；确需漂移 → 显式豁免授权 + 记录。
- 派发执行器**二选一或混用**（prompt 单源：`scripts/cluster-prompt.sh`，ccx 与子代理共用同一份 prompt 文本）：
  - **ccx**（`scripts/dispatch-ccx.sh`）：tmux 守护 + 预算/超时控制，适合长耗时簇；
  - **Codex 子代理**（MCP `spawn_agent`）：fork_context=false + message=cluster-prompt 输出（含 worktree 定位），无 tmux 依赖、可直接 send_input 纠偏、结果在会话内。派发后 `wait_agent` 等待，**完成后 `close_agent` 释放线程**（否则「agent thread limit reached」）。
- 监控：ccx 看进程存活 + worktree 文件系统活动；子代理看 wait_agent 状态 + worktree git status。不要盯缓冲的输出日志。

## 阶段 3 — 对抗审查闭环（写的不审、审的不写）

```
implementer 提交 → 2× adversarial reviewer（只拿 git diff，假设代码是错的）
  → fixer 应用反馈 → 主线程 merge
```

- **强制触发**：implementer 提交后必须派 reviewer，主线程亲自审阅 ≠ 独立 reviewer（实测教训：主线程审阅会漏掉「共享视图破坏快照语义」这类契约脆弱点，独立 reviewer 用 fuzz 抓到了）。
- **reviewer 分工**（大改动 2 个，单文件 <50 行小改动可 1 个）：
  - reviewer A（静态）：只读 git diff，逐行核对顺序相关性/别名/失效点/契约，列问题清单；
  - reviewer B（独立复跑）：不信 implementer 自报，自己跑 bit-exact + 自写 fuzz + perf A/B，复现或排除问题。
- reviewer 只拿 `git diff`，不知道 implementer 的任何推理；逐条核对退出条件。
- 主线程 review 清单：diffstat 合理性、共享文件改动、红旗扫描（TODO / FIXME / `any` / `ts-ignore` / console.log）、**独立复跑**：
  - 行为等价：bit-exact 覆盖不降、豁免不超限、回归不新增；
  - 性能收益：bench 对比（目标模块提升 ≥ max(20%, 3×CV)，其余不降）；
  - 模式合规：顺序相关归约未改、共享缓存无别名、缓存失效点完整。
- **「需豁免」先做前提验证再决定**：很多被保守标记为「需 ELK 语义豁免」的优化，验证「不变式」后其实无需豁免（实测：BK 对齐边缓存因「BK 期间边集合/顺序不变」可直接做，无需豁免）。判断流程：先 grep 验证不变式 → 成立则直接做（位级等价）→ 不成立才走豁免授权。

## 阶段 4 — 备注回流（强制，每轮必做）

- 子代理汇报里的「备注/遗留/发现」不得只留在汇报里。
- 主线程**独立验证**（对照源码 / 跑测试 / 查现状）→ 登记 `agent-remarks.md`（模板见 `references/agent-remarks.template.md`）→ 回流计划：
  - 行为等价差异 → 立即修（走正常合并）；
  - 性能反直觉（bench 下降但代码看起来更好）→ 回退或单独调查；
  - 工具链问题 → 修脚本；
  - 待办 → 列入后续簇简报 + OPTIMIZATION_CLASSES.tsv。
- 每轮结束检查登记册：无「未处置」条目。

## 阶段 5 — 合并（拓扑 + 每合必测）

- 独立簇先合 → 依赖簇后合；冲突逐文件 resolve。
- **每合一个簇，跑一次全量门禁 + bench 对比，确认数字不降**。
- 共享文件冲突（所有簇都改同一图模型/入口）→ 机械合并保留两侧，主线程手工 resolve，禁止 `checkout --ours/theirs` 整文件覆盖。
- 合并后清理 worktree：`git worktree remove --force <path>`（先确认分支已合入）。

## 机器可检查退出条件（agent 不给自己打分）

| 关卡 | 命令 | 标准 |
|---|---|---|
| 簇级 | `<bit-exact 脚本> '<簇 glob>'` + `<热点定位> '<簇模块>'` | bit-exact 覆盖不降 + 目标模块提升 ≥ max(20%, 3×CV) |
| 全量 bit-exact | `<bit-exact 脚本>` | N 覆盖（全等 + 豁免 A/B + 跳过 + 报错复刻），exit 0 |
| 对齐 | `<对齐脚本>` | M/K 对齐，exit 0 |
| 回归 | `<diff-failures> collect-all && check` | 0 失败 |
| 性能 | `<perf-run --bench 30>`（warm n=200 中位数 + A/B 交错） | 目标提升 ≥ max(20%, 3×CV)，其余不降 |
| bundle | `<bun build --minify>` + gzip | ≤ 预算（项目 `docs/optimization.md` 里定） |

agent 汇报必须结构化（files / verifications / problems / notes），逐条对照退出条件，未满足不得声称完成。

> **测量协议**（门禁判定一律按此，冷启动 `--phase` 单次噪声 ±5-10% 不可靠）：
> - 模块级：同进程 warm n=200 中位数 + 多轮 A/B 交错（baseline 与优化版交替跑消 GC/后台噪声）；
> - 小模块（<5ms）CV 常达 26-60%，3×CV 字面不可达 → 按 20% 下限 + 端到端不降判定；
> - vitest bench 的 `--outputJson` 在非 TTY 下 `samples` 可能为空（vitest 4 已知），**以 perf-run --bench 为准**。

## 陷阱清单（通用机制；项目实例见项目 `docs/optimization.md` + `docs/clusters/agent-remarks.md`）

1. **浮点顺序漂移是头号红线**：求和/归约/排序顺序一改，bit-exact 模型翻成 non-exact → 门禁拦截。免分配/缓存/typed array 不改变顺序（安全）；确需改 → 补偿求和 + 显式豁免授权。
2. **swap-remove 改变元素顺序**：按序累加的归约是顺序相关的；swap-remove/重排只允许在顺序无关场景（先读代码确认）。
3. **别名污染**：共享缓存返回可变对象，调用方原地改字段会污染所有持有者。缓存必须返回副本或文档化「只读」。
4. **缓存失效点分散**：index/视图缓存依赖结构变更全部走 setter；漏一处即静默错位。加「随机操作序列 + 缓存一致性 fuzz」。
5. **开发运行时 ≠ 目标运行时**：bun(JSC) 快不代表 Chrome(V8) 快；优化在目标环境复验，typed array 跨环境都受益、优先。
6. **bench 方差**：同图重复采样先定 CV；阈值 = max(20%, 3×CV)，否则门禁误杀/误放。
7. **微优化陷阱**：<20% 提升不值得（阈值门禁）；优先修占比最高的模块（热点排序）。
8. **bundle tree-shaking 语义 bundler 相关**：一个打包器的原型 ≠ 目标打包器；side-effect 注册（import 触发 register）在保守打包器下可能全保留——先建「只 import 子入口的 consumer 构建」确认，再动注册表（consumer 构建方法见项目 `docs/optimization.md`）。
9. **豁免清单过期**：豁免登记（registry）需 hash 键控；豁免项变 bit-exact → 提示移除；超限 → 失败；登记排除项被比较 → 失败。
10. **多 agent 共享 checkout 必互踩** → worktree 隔离第一优先级；后台任务被回收 → tmux 守护。
11. **共享文件冲突** → 机械合并保留两侧；每合一个跑全量。
12. **结构化工汇报**防「声称完成」；主线程独立复跑关键验证。
13. **结构性早退/短路是第二类位级等价改动**（顺序相关性之外）：空路由区直接返回 0、无依赖跳过断环——改变控制流但位级等价。必须论证「零副作用前提」（空集/无依赖时不消费 random、不写全局），并加计数插桩确认。不可只当普通「顺序无关」优化。
14. **共享层不要 import 完整入口**（tree-shake 杀手）：共享模块若从入口文件引符号，会形成 `shared→index→public→api→register-all` 循环链，导致子入口 tree-shake 失效。共享层只 import 具体模块（以本项目实际架构为例，见项目 `docs/optimization.md`）。
15. **发布构建的 define 差异**：bun 的 `--define` 不支持 `process.env.X` 成员表达式（无效）；tsdown/rolldown 的 define 支持。发布产物（dist）也要冒烟验证（tree-shake + define + minify 后完整/子入口各跑一次），不只 consumer 源码冒烟。
16. **子代理线程上限**：完成/关闭前 `close_agent`，否则并发 spawn 报「agent thread limit reached」。

## 工具链与资源

- 本 skill 自带 `scripts/`（`setup-worktree.sh` / `dispatch-ccx.sh` / `cluster-prompt.sh` / `check-gates.sh`，自包含）；`cluster-prompt.sh` 是 ccx 与 Codex 子代理的 prompt 单源（含 worktree 定位，UTF-8 下用 `${var}` 花括号）；并行协议见 `references/parallel-protocol.md`。
- `references/OPTIMIZATION_CLASSES.tsv.template` — 优化分类表模板
- `references/cluster-brief.template.md` — 优化簇简报模板（6 要素 + 顺序相关性）
- `references/agent-remarks.template.md` — 备注登记册模板
- 项目实例文件（**不在 skill，在项目里**）：`docs/optimization.md` / `OPTIMIZATION_CLASSES.tsv` / `docs/clusters/*.md` / `docs/clusters/agent-remarks.md` — 命名/位置/格式见上文「项目文件约定」。
