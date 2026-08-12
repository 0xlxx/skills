#!/usr/bin/env bash
# setup-worktree.sh — 为并行移植簇创建独立 worktree + 软链共享依赖。
#
# 用法:
#   setup-worktree.sh <repo> <cluster-name> [<rel-symlink-dir>...]
#
# 参数:
#   repo            主仓库绝对路径（git 仓库根）
#   cluster-name    簇名 → worktree 目录 <parent>/<repo-basename>-wt-<name>，分支 wt/<name>
#   rel-symlink-dir 相对 repo 的目录，软链到 worktree（默认 node_modules）
#
# 示例:
#   setup-worktree.sh /Users/me/proj mrtree \
#     node_modules packages/pkg/node_modules packages/pkg/scripts/lib
#
# 注意:
#   - 软链会显示为 untracked；告诉 agent 只 `git add <具体文件>`，不要 `git add .`。
#   - 禁止在 worktree 内跑 git stash/reset/checkout -f/clean/rebase。

set -euo pipefail

repo="${1:?用法: setup-worktree.sh <repo> <cluster-name> [rel-symlink-dir...]}"
name="${2:?缺少 cluster-name}"

if [[ ! -d "$repo/.git" && ! -f "$repo/.git" ]]; then
  echo "错误: $repo 不是 git 仓库" >&2; exit 1
fi

parent="$(cd "$(dirname "$repo")" && pwd)"
repo_base="$(basename "$repo")"
wt="$parent/${repo_base}-wt-${name}"
branch="wt/${name}"

if git -C "$repo" worktree list | grep -q "^$wt "; then
  echo "worktree 已存在: $wt"
else
  git -C "$repo" worktree add -b "$branch" "$wt" HEAD
  echo "worktree 已创建: $wt (分支 $branch)"
fi

shift 2
dirs=("$@")
if [[ ${#dirs[@]} -eq 0 ]]; then dirs=(node_modules); fi

for rel in "${dirs[@]}"; do
  src="$repo/$rel"; dst="$wt/$rel"
  if [[ ! -e "$src" ]]; then
    echo "跳过（源不存在）: $src" >&2; continue
  fi
  mkdir -p "$(dirname "$dst")"
  ln -sfn "$src" "$dst"
  echo "软链: $dst -> $src"
done

echo "完成。接下来: 把簇简报放入 $wt/docs/clusters/ 并派发执行器 (scripts/dispatch-ccx.sh)"
