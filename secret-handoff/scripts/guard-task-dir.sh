#!/usr/bin/env bash
# guard-task-dir.sh — 校验「一个任务 = 一条命令」用的临时目录，并在当前 shell 装好 cleanup trap。
#
# 必须 **source**（不能直接执行）：
#   . "$SKILL_DIR/scripts/guard-task-dir.sh" "<user-provided dir>" || exit 1
#
# 成功后：TASK_DIR = 规范化后的目录；退出/失败时整目录清空（含自己额外创建的文件——
# 列举文件名的白名单必漏，曾把明文遗留在同目录的 pwform 里）。
#
# 这是唯一实现来源：SKILL.md §3 与 references/*.md 都引用本脚本，避免逐处复制导致漂移。

if [ -n "${BASH_SOURCE[0]:-}" ] && [ "${BASH_SOURCE[0]}" = "$0" ]; then
  echo "guard: source this file, do not execute it" >&2; exit 1
fi

[ -n "${1:-}" ] || { echo "guard: refuse: empty DIR argument" >&2; return 1; }
_cand="${1}"
_cand="${_cand%/}"                                    # 去尾斜杠：否则 [ -L ] 会跟随 symlink
if [ -f "$_cand" ]; then                              # 只有这两种文件名允许归一到父目录
  case "$(basename "$_cand")" in
    token|bw_session) _cand="$(dirname "$_cand")" ;;
    *) echo "guard: refuse: not a handoff file" >&2; return 1 ;;
  esac
fi
[ -L "$_cand" ] && { echo "guard: refuse: $_cand is a symlink" >&2; return 1; }
TASK_DIR="$(cd -P "$_cand" 2>/dev/null && pwd -P)" || { echo "guard: refuse: $_cand is not a directory" >&2; return 1; }
case "$(basename "$TASK_DIR")" in secret-handoff.*) ;; *) echo "guard: refuse: not a secret-handoff.* task dir" >&2; return 1 ;; esac
[ -d "$TASK_DIR" ] && [ ! -L "$TASK_DIR" ] && [ -O "$TASK_DIR" ] || { echo "guard: refuse: must be a directory you own" >&2; return 1; }
_perms="$(stat -f %Lp "$TASK_DIR" 2>/dev/null || stat -c %a "$TASK_DIR" 2>/dev/null || echo '?')"
[ "$_perms" = "700" ] || { echo "guard: refuse: must be 0700 (got ${_perms})" >&2; return 1; }
[ -O "$TASK_DIR/.secret-handoff" ] || { echo "guard: refuse: no handoff marker in $TASK_DIR" >&2; return 1; }
_parent="$(dirname "$TASK_DIR")"
[ -O "$_parent" ] || [ -k "$_parent" ] || { echo "guard: refuse: parent is neither yours nor sticky" >&2; return 1; }
_dev="$(stat -f %d "$TASK_DIR" 2>/dev/null || stat -c %d "$TASK_DIR" 2>/dev/null)"
_pdev="$(stat -f %d "$_parent" 2>/dev/null || stat -c %d "$_parent" 2>/dev/null)"
[ -n "$_dev" ] && [ "$_dev" = "$_pdev" ] || { echo "guard: refuse: $TASK_DIR looks like a mountpoint" >&2; return 1; }

# 以上全部成立才整目录清空；失败要显式报错，不能静默宣告「已清理」
cleanup() {
  find "$TASK_DIR" -xdev -mindepth 1 -depth -delete 2>/dev/null   # -xdev: 不跨挂载点删数据
  rmdir "$TASK_DIR" 2>/dev/null
  [ -e "$TASK_DIR" ] && echo "guard: cleanup failed: $TASK_DIR still exists" >&2
}
trap cleanup EXIT INT TERM
export TASK_DIR
