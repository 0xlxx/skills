#!/usr/bin/env bash
# dispatch-ccx.sh — 并行派发 ccx 执行器（每簇一个独立 worktree，tmux 守护）。
#
# 用法:
#   dispatch-ccx.sh <repo> "<cluster1 cluster2 ...>" <briefs-dir> \
#       [--budget "a=15 b=10"] [--timeout 14400] [--dry-run]
#
# 参数:
#   repo         主仓库绝对路径
#   clusters     空格分隔的簇名列表（须已由 setup-worktree.sh 建好 worktree）
#   briefs-dir   簇简报目录（每个簇读取 <briefs-dir>/<name>.md）
#   --budget     每簇预算上限，格式 "name=USD"（默认 15）
#   --timeout    ccx 超时秒数（默认 14400 = 4h）
#   --dry-run    只打印要执行的命令，不实际运行
#
# 依赖: tmux、ccx（Codex 驱动 Claude Code 桥接）。输出经 tee 落 /tmp/ccx-<name>.log。
# 兼容性: 避免 bash 关联数组（macOS bash 3.2 不支持），用 name=value 对数组。

set -uo pipefail

repo="${1:?用法: dispatch-ccx.sh <repo> '<c1 c2 ...>' <briefs-dir> [--budget ...] [--timeout ...] [--dry-run]}"
clusters="${2:?缺少簇名列表}"
briefs="${3:?缺少简报目录}"
budget_arg=""; timeout=14400; dry=0
shift 3
while [[ $# -gt 0 ]]; do
  case "$1" in
    --budget) budget_arg="$2"; shift 2 ;;
    --timeout) timeout="$2"; shift 2 ;;
    --dry-run) dry=1; shift ;;
    *) echo "未知参数: $1" >&2; exit 1 ;;
  esac
done

# 解析预算对 "a=15 b=10" → 数组 "a=15" "b=10"
budget_pairs=()
if [[ -n "$budget_arg" ]]; then
  for kv in $(echo "$budget_arg" | tr ' ' '\n'); do
    [[ "$kv" == *=* ]] || { echo "预算格式应为 name=USD: $kv" >&2; exit 1; }
    budget_pairs+=("$kv")
  done
fi
budget_of() { # budget_of <name> → 输出 USD（默认 15）
  local n="$1" kv
  for kv in "${budget_pairs[@]:-}"; do
    [[ "${kv%%=*}" == "$n" ]] && { echo "${kv#*=}"; return; }
  done
  echo 15
}

parent="$(cd "$(dirname "$repo")" && pwd)"
repo_base="$(basename "$repo")"

for name in $clusters; do
  wt="$parent/${repo_base}-wt-${name}"
  brief="$briefs/$name.md"
  if [[ ! -f "$brief" ]]; then
    echo "警告: 简报不存在 $brief（跳过 $name）" >&2
    continue
  fi
  budget="$(budget_of "$name")"
  prompt="你是本簇执行器。严格执行 $brief 与 $(dirname "$brief")/_COMMON.md 的全部步骤（方法 / Scope 边界 / 铁律 / 退出条件 / 汇报格式）。完成后按模板汇报，并把你改动的具体文件 git add + git commit。不要跑变异测试。不要碰 Scope 之外的文件。某步卡住超过 2 分钟，记录问题继续推进或合理降级并注明。"
  cmd="cd '$wt' && ccx --cwd '$wt' --report --timeout $timeout --budget $budget '$prompt' 2>&1 | tee /tmp/ccx-$name.log"
  if [[ $dry -eq 1 ]]; then
    echo "[dry-run] tmux new-session -d -s ccx-$name \"$cmd\""
  else
    tmux new-session -d -s "ccx-$name" "$cmd"
    echo "已派发 ccx-$name (wt=$wt, budget=\$$budget, timeout=${timeout}s)"
  fi
done

if [[ $dry -eq 1 ]]; then
  echo "[dry-run] 完成。确认命令后去掉 --dry-run 执行。"
else
  echo "全部派发完成。查看: tmux ls | 存活: pgrep -fl 'claude -p' | 日志: /tmp/ccx-<name>.log"
fi
