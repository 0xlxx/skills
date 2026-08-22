# 并行协议（自包含；脚本在 scripts/，此处给全命令与内联等价）

> 这是本 skill 的并行执行契约：**worktree 隔离 + Agent 铁律 + tmux 守护派发 + 对抗审查闭环 + 拓扑合并**。
> 脚本: `scripts/setup-worktree.sh` / `scripts/dispatch-ccx.sh` / `scripts/check-gates.sh`（已复制进本 skill，不依赖外部目录）。

## 1. 铁律（所有 agent 无条件遵守）

```
❌ git stash / git reset / git checkout -f / git clean / git rebase
❌ 改 scope 外文件
❌ 改顺序相关归约（求和/遍历/排序顺序 = bit-exact 红线）
❌ 共享缓存返回可变对象（调用方原地改字段 → 别名污染）
❌ 缓存失效点不完整（结构变更必须走 setter 或精确枚举）
✅ 只允许 git add <具体文件> + git commit + 只读查询
✅ 双运行时验证（开发运行时 ≠ 目标运行时）
✅ 免分配/typed array/复用池/缓存优先；确需漂移 → 显式豁免授权 + 记录
```

## 2. worktree 隔离（第一优先级：多 agent 共享 checkout 必互踩）

> **前置（基于 HEAD，未提交/未跟踪内容不会进 worktree）**：
> 1. 先 `git commit` 门禁基建 + 简报 + OPTIMIZATION_CLASSES，再建 worktree；
> 2. 软链**全部**共享依赖，不只 node_modules——test-resources / oracle / bench-results(cache) /
>    本地 jar 等被 gitignore 的运行时资源（ELK 实测：漏软链 test-resources → 368 模型缺失；
>    漏 elk-java-debug/lib → 门禁 scandir ENOENT）。

```bash
# 脚本方式: 每簇一个 worktree + 分支 wt/<name>，软链共享依赖
scripts/setup-worktree.sh <repo> <cluster-name> \
  node_modules test-resources bench-results <其他被 gitignore 资源>   # 软链显示 untracked，禁止 git add .

# 等价内联:
git -C <repo> worktree add -b wt/<name> <repo>-wt-<name> HEAD
ln -sfn <repo>/node_modules <repo>-wt-<name>/node_modules
ln -sfn <repo>/test-resources <repo>-wt-<name>/test-resources   # monorepo 子包同理
```

## 3. 派发执行器（ccx 与 Codex 子代理二选一或混用；prompt 单源）

> **prompt 单源**：`scripts/cluster-prompt.sh` 生成执行器 prompt（ccx 与子代理共用同一文本；
> 子代理多一个 worktree 定位参数，因为子代理没有 --cwd）。UTF-8 locale 下变量用 `${var}` 花括号
> （`$var` 后紧跟中文会被 bash 吞进变量名）。

### 3a. ccx（tmux 守护，防 exec/PTY 回收，适合长耗时簇）

```bash
scripts/dispatch-ccx.sh <repo> "c1 c2 c3" <briefs-dir> \
  --budget "c1=15 c2=10" --timeout 14400   # 每簇预算 + 超时
scripts/dispatch-ccx.sh <repo> "c1" <briefs-dir> --dry-run  # 先看命令
```

ccx 参数速查（执行器 = Codex 主控 → 执行器桥接）：

```bash
ccx --cwd <worktree> --report --timeout 14400 --budget 15 '严格执行 <简报>'
ccx --resume <session_id> "继续，完成验证"   # 超时/中断后续跑
ccx --agent reviewer "只拿 git diff 审阅"    # 独立审阅者角色（不写代码）
```

- `--report` 强制结构化输出 `summary/files/verifications/problems/notes`，主线程好解析。
- 输出是**缓冲的**（收尾才写）→ 监控看进程 + 文件系统活动，不要盯日志。

### 3b. Codex 子代理（MCP 多代理，无 tmux 依赖，适合短簇/需频繁干预）

```text
# prompt 单源: build_cluster_prompt <briefs-dir> <cluster-name> <worktree>
# 派发: spawn_agent(fork_context=false, message=<prompt 输出>)
# 监控: wait_agent(targets=[...], timeout_ms=...)   # 超时后再 wait 或 send_input 追问
# 纠偏: send_input(target, message, interrupt=true)
# 收尾: close_agent(target)   # 必须！否则并发 spawn 报 "agent thread limit reached"
```

- 子代理无 `--cwd`，prompt 里明确「所有命令 exec_command workdir=<worktree>」。
- 子代理继承父模型；每簇一个子代理 = 一个独立 worktree，不共享状态。
- reviewer 也用子代理（见 §5），实现/审阅/复跑各自独立，互不知晓推理。

## 4. 监控

```bash
tmux ls                                  # 会话存活
pgrep -fl "claude -p"                    # 执行器进程
find <worktree> -newermt "10 minutes ago" | head   # 文件系统活动
tail /tmp/ccx-<name>.log                 # 只有收尾才有完整输出
```
# 子代理方式: wait_agent 状态 + worktree git status / git log 看是否提交

## 5. 对抗审查闭环（写的不审、审的不写）

```
implementer 提交 → 2× adversarial reviewer（只拿 git diff，假设代码是错的）
  → fixer 应用反馈 → 主线程 merge
```

- **强制触发**：主线程亲自审阅 ≠ 独立 reviewer。reviewer 只拿 `git diff`，不知道 implementer 推理。
- **分工**（大改动 2 个，单文件 <50 行可 1 个）：
  - reviewer A（静态）：逐行核对顺序相关性 / 别名 / 失效点 / 契约，列问题清单；
  - reviewer B（独立复跑）：自己跑 bit-exact + 自写 fuzz（构造 > 阈值的调用量 + 随机变更序列）+ perf A/B，
    复现或排除问题（实测抓出「共享视图破坏快照语义」「Uint8 stamp 256 环绕」这类主线程审阅会漏的坑）。
- 主线程 review 清单（独立复跑，不信自报）：
  1. diffstat 合理性 + 共享文件改动 + 红旗扫描（TODO / FIXME / `any` / `ts-ignore` / console.log）；
  2. 行为等价：bit-exact 覆盖不降、豁免不超限、回归不新增；
  3. 性能收益：bench 对比（目标提升 ≥ max(20%, 3×CV)，其余不降）；
  4. 模式合规：顺序相关归约未改、共享缓存无别名、缓存失效点完整。
- **「需豁免」先做前提验证**：grep 验证不变式（如「BK 期间无边增删/排序」）→ 成立则直接做（位级等价无需豁免）；
  不成立才走 triage-registry 豁免授权。避免把可安全做的优化误标「需豁免」阻塞。

## 5a. 测量协议（门禁判定一律按此）

- 模块级：同进程 **warm n=200 中位数 + 多轮 A/B 交错**（baseline 与优化版交替跑）；冷启动 `--phase` 单次噪声 ±5-10% 不可靠。
- 小模块（<5ms）CV 常 26-60%，3×CV 字面不可达 → 按 20% 下限 + 端到端不降判定。
- vitest bench `--outputJson` 非 TTY 下 samples 可能为空 → 以 `perf-run --bench 30` 为准。

## 6. 合并（拓扑 + 每合必测）

```bash
# 独立簇先合 → 依赖簇后合；每合一个跑一次全量门禁 + bench 对比，数字不降才继续
scripts/check-gates.sh <workdir> "bit-exact::<命令>" "对齐::<命令>" "回归::<命令>" "bench::<命令>"
# 共享文件冲突 → 机械合并保留两侧，主线程手工 resolve；禁止 checkout --ours/theirs 整文件覆盖
# 清理: git worktree remove --force <path>（先确认分支已合入）
```

## 7. 汇报格式（agent 必须遵守，防「声称完成」）

```
files:          改动的文件清单
verifications: 逐条退出条件的结果（命令 + 输出摘要 + exit code）
problems:      未满足项 / 卡点 / 降级说明
notes:         备注 / 遗留 / 新发现（会进备注回流登记册）
```
