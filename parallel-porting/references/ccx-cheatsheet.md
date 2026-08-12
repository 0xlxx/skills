# ccx / claude CLI 速查（并行执行器）

## ccx（Codex 主控 → Claude Code 执行器桥接，~/.ai-dev/ccx）

```bash
ccx "任务"                                    # 一次性任务（默认 executor 角色）
ccx --cwd <worktree> --report "任务"           # ★ 在指定 worktree 内执行 + 结构化报告
ccx --stream "长任务"                          # 实时事件流（thinking/tool_use/result）
ccx --budget 5 --report "..."                 # 成本封顶（safety net）
ccx --timeout 14400 --report "..."            # 超时秒数（默认 1200s=20min，大任务必须调大）
ccx --resume <session_id> "继续，完成验证"     # 超时/中断后续跑
ccx --agent reviewer "审阅方案 X"              # 独立审阅者角色（不写代码）
```

- `--report`：强制结构化输出 `summary/files/verifications/problems/notes`，主线程好解析。
- 输出是**缓冲的**（ccx 收尾才写 stdout/日志）——监控进度看进程 + 文件系统活动，不要盯日志。
- 后台任务必须 **tmux 守护**（`tmux new-session -d -s <name> "cd <wt> && ccx ... | tee log"`），否则被 exec/PTY 会话回收杀掉。
- 模型策略：干活统一 flash（deepseek-v4-flash）；视觉审阅用 gpt-5.6-luna 子代理，不走 cc。

## claude CLI（裸调用）

```bash
claude -p --dangerously-skip-permissions --output-format json \
  --json-schema '{"type":"object",...}' "任务"
```

## 并行派发模板

```bash
declare -A BUDGET=( [clusterA]=15 [clusterB]=10 )
for name in clusterA clusterB; do
  wt="/path/to/repo-wt-$name"
  tmux new-session -d -s "ccx-$name" \
    "cd $wt && ccx --cwd '$wt' --report --timeout 14400 --budget ${BUDGET[$name]} '严格执行 $wt/docs/clusters/$name.md' 2>&1 | tee /tmp/ccx-$name.log"
done
tmux ls          # 查看会话
pgrep -fl "claude -p"   # 确认执行器存活
```
