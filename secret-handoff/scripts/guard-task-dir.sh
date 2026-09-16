#!/usr/bin/env bash
# guard-task-dir.sh — 校验「一个任务 = 一条命令」用的临时目录，并在当前 shell 装好 cleanup trap。
#
# 必须 **在 scrubbed child 内 source**（不能直接执行）：
#   env -i ... bash --noprofile --norc -c '. "$SKILL_DIR/scripts/guard-task-dir.sh" "<dir>" || exit 1; ...'
# 原因：Bash 不允许 sourced file 观测调用方的 DEBUG trap；env -i 子进程从边界上隔离它。
#
# 成功后：TASK_DIR = 规范化后的目录；退出/失败时清空所有顶层文件（含自己额外创建的——
# 列举文件名的白名单必漏，曾把明文遗留在同目录的 pwform 里；嵌套目录会 fail closed）。
#
# 安全约束：校验后把路径/设备/inode 保存为私有只读变量；cleanup 只删顶层非目录项。
# 发现嵌套目录、路径身份变化或清理失败时 fail closed，不递归跨越 mountpoint。
#
# 这是唯一实现来源：SKILL.md §3 与 references/*.md 都引用本脚本，避免逐处复制导致漂移。

if [ -n "${BASH_SOURCE[0]:-}" ] && [ "${BASH_SOURCE[0]}" = "$0" ]; then
  echo "guard: source this file, do not execute it" >&2; exit 1
fi
[ -n "${BASH_VERSION:-}" ] && [ -z "${ZSH_VERSION:-}" ] && [ -n "${BASH_SOURCE[0]:-}" ] || { echo "guard: must be sourced by bash, not sh/zsh" >&2; return 1; }
[ -z "${_SECRET_HANDOFF_GUARD_ARMED:-}" ] || { echo "guard: refuse: guard already armed in this shell" >&2; return 1; }
[ -z "${TASK_DIR+x}" ] || { echo "guard: refuse: TASK_DIR already set in this shell" >&2; return 1; }
if readonly -p 2>/dev/null | command -p grep -Eq '^declare -r[a-z]* TASK_DIR(=|$)'; then
  echo "guard: refuse: TASK_DIR is already readonly (even if unset)" >&2; return 1
fi
case "$-" in *x*) echo "guard: refuse: xtrace is enabled" >&2; return 1 ;; esac
[ -z "${BASH_ENV:-}" ] || { echo "guard: refuse: BASH_ENV is set; use a scrubbed child" >&2; return 1; }
for _fn in _stat_mode _stat_dev _stat_ino _is_mountpoint cleanup; do
  if declare -F "$_fn" >/dev/null 2>&1; then
    echo "guard: refuse: internal function name already in use: $_fn" >&2
    return 1
  fi
done
_stat_mode() { command -p stat -c %a "$1" 2>/dev/null || command -p stat -f %Lp "$1" 2>/dev/null; }
_stat_dev()  { command -p stat -c %d "$1" 2>/dev/null || command -p stat -f %d "$1" 2>/dev/null; }
_stat_ino()  { command -p stat -c %i "$1" 2>/dev/null || command -p stat -f %i "$1" 2>/dev/null; }
_is_mountpoint() {
  local mp_bin mount_bin awk_bin mounts mp_exit awk_exit
  for mp_bin in /usr/bin/mountpoint /bin/mountpoint; do
    if [ -x "$mp_bin" ]; then
      mp_exit=0
      "$mp_bin" -q "$1" || mp_exit=$?
      case "$mp_exit" in 0) return 0 ;; 1) return 1 ;; *) return 2 ;; esac
    fi
  done
  for mount_bin in /sbin/mount /usr/bin/mount /bin/mount; do
    if [ -x "$mount_bin" ]; then
      break
    fi
  done
  [ -x "$mount_bin" ] || return 2
  awk_bin=/usr/bin/awk
  [ -x "$awk_bin" ] || return 2
  mounts="$("$mount_bin" 2>/dev/null)" || return 2
  awk_exit=0
  ( set -o pipefail; printf '%s\n' "$mounts" | "$awk_bin" -v p="$1" 'index($0, " on " p " ")>0 {found=1} END {exit !found}' ) || awk_exit=$?
  case "$awk_exit" in 0) return 0 ;; 1) return 1 ;; *) return 2 ;; esac
}
readonly -f _stat_mode _stat_dev _stat_ino _is_mountpoint

[ -n "${1:-}" ] || { echo "guard: refuse: empty DIR argument" >&2; return 1; }
_cand="${1}"
_cand="${_cand%/}"                                    # 去尾斜杠：否则 [ -L ] 会跟随 symlink
if [ -f "$_cand" ]; then                              # 只有这两种文件名允许归一到父目录
  case "${_cand##*/}" in
    token|bw_session)
      _cand_dir="${_cand%/*}"
      if [ "$_cand_dir" = "$_cand" ]; then _cand_dir="."; fi
      _cand="$_cand_dir" ;;
    *) echo "guard: refuse: not a handoff file" >&2; return 1 ;;
  esac
fi
if [ -L "$_cand" ]; then echo "guard: refuse: $_cand is a symlink" >&2; return 1; fi
_guard_task_dir="$(cd -P "$_cand" 2>/dev/null && pwd -P)" || { echo "guard: refuse: $_cand is not a directory" >&2; return 1; }
case "${_guard_task_dir##*/}" in secret-handoff.*) ;; *) echo "guard: refuse: not a secret-handoff.* task dir" >&2; return 1 ;; esac
[ -d "$_guard_task_dir" ] && [ ! -L "$_guard_task_dir" ] && [ -O "$_guard_task_dir" ] || { echo "guard: refuse: must be a directory you own" >&2; return 1; }
_perms="$(_stat_mode "$_guard_task_dir" || echo '?')"
[ "$_perms" = "700" ] || { echo "guard: refuse: must be 0700 (got ${_perms})" >&2; return 1; }
[ -O "$_guard_task_dir/.secret-handoff" ] || { echo "guard: refuse: no handoff marker in $_guard_task_dir" >&2; return 1; }
_parent="${_guard_task_dir%/*}"; if [ "$_parent" = "$_guard_task_dir" ]; then _parent="."; fi
[ -O "$_parent" ] || [ -k "$_parent" ] || { echo "guard: refuse: parent is neither yours nor sticky" >&2; return 1; }
if ! [ -k "$_parent" ]; then
  _pperms="$(_stat_mode "$_parent" || echo '?')"
  _ptail="${_pperms: -3}"
  _pgroup="${_ptail:1:1}"
  _pother="${_ptail:2:1}"
  case "$_pgroup" in [2367]) echo "guard: refuse: non-sticky parent is group-writable (mode $_pperms)" >&2; return 1 ;; esac
  case "$_pother" in [2367]) echo "guard: refuse: non-sticky parent is other-writable (mode $_pperms)" >&2; return 1 ;; esac
fi
_guard_dev="$(_stat_dev "$_guard_task_dir")" || _guard_dev=""
_guard_ino="$(_stat_ino "$_guard_task_dir")" || _guard_ino=""
_guard_pdev="$(_stat_dev "$_parent")" || _guard_pdev=""
[ -n "$_guard_dev" ] && [ -n "$_guard_ino" ] && [ "$_guard_dev" = "$_guard_pdev" ] || { echo "guard: refuse: cannot verify path identity" >&2; return 1; }
_mp_rc=0
_is_mountpoint "$_guard_task_dir" && _mp_rc=0 || _mp_rc=$?
if [ "$_mp_rc" -eq 0 ]; then
  echo "guard: refuse: task dir is a mountpoint" >&2; return 1
elif [ "$_mp_rc" -ne 1 ]; then
  echo "guard: refuse: cannot determine whether task dir is a mountpoint" >&2; return 1
fi
[ -z "${BASH_XTRACEFD:-}" ] || { echo "guard: refuse: BASH_XTRACEFD is set" >&2; return 1; }
[ -z "$(trap -p ERR)" ] && [ -z "$(trap -p EXIT)" ] && [ -z "$(trap -p INT)" ] && [ -z "$(trap -p TERM)" ] && [ -z "$(trap -p HUP)" ] && [ -z "$(trap -p QUIT)" ] || { echo "guard: refuse: existing ERR/EXIT/INT/TERM/HUP/QUIT trap would be overwritten" >&2; return 1; }

readonly _guard_task_dir _guard_dev _guard_ino
TASK_DIR="$_guard_task_dir" || { echo "guard: refuse: cannot set TASK_DIR" >&2; return 1; }
readonly TASK_DIR || { echo "guard: refuse: cannot lock TASK_DIR" >&2; return 1; }
export TASK_DIR || { echo "guard: refuse: cannot export TASK_DIR" >&2; return 1; }

# 以上全部成立才清理；失败要显式报错，不能静默宣告「已清理」。
# 保留原始退出码：成功清理不能让成功命令变成失败，清理失败也不能掩盖原失败。
cleanup() {
  _cleanup_status="${1:-0}"                               # trap 显式传入，避免 EXIT trap 返回值被 Bash 忽略
  trap - EXIT INT TERM HUP QUIT
  trap '' INT TERM HUP QUIT                               # 删除期间屏蔽二次信号；SIGKILL 仍不可捕获

  if [ ! -e "$_guard_task_dir" ] && [ ! -L "$_guard_task_dir" ]; then
    echo "guard: cleanup refused: path disappeared before cleanup (possibly renamed); inspect the parent for copies" >&2
    if [ "$_cleanup_status" -eq 0 ]; then _cleanup_status=1; fi
    exit "$_cleanup_status"
  fi
  if [ -L "$_guard_task_dir" ]; then
    echo "guard: cleanup refused: path became a symlink" >&2
    if [ "$_cleanup_status" -eq 0 ]; then _cleanup_status=1; fi
    exit "$_cleanup_status"
  fi
  _cur_dev="$(_stat_dev "$_guard_task_dir" || true)"
  _cur_ino="$(_stat_ino "$_guard_task_dir" || true)"
  if [ -z "$_cur_dev" ] || [ -z "$_cur_ino" ] || [ "$_cur_dev" != "$_guard_dev" ] || [ "$_cur_ino" != "$_guard_ino" ]; then
    echo "guard: cleanup refused: path identity changed" >&2
    if [ "$_cleanup_status" -eq 0 ]; then _cleanup_status=1; fi
    exit "$_cleanup_status"
  fi

  _cleanup_failed=0
  command -p find "$_guard_task_dir" -xdev -mindepth 1 -maxdepth 1 ! -type d -delete 2>/dev/null || _cleanup_failed=1
  _nested="$(command -p find "$_guard_task_dir" -xdev -mindepth 1 -maxdepth 1 -type d -print -quit 2>/dev/null)" || _cleanup_failed=1
  if [ -n "$_nested" ]; then
    echo "guard: cleanup refused: nested directory remains; inspect $_guard_task_dir manually" >&2
    _cleanup_failed=1
  else
    command -p rmdir "$_guard_task_dir" 2>/dev/null || _cleanup_failed=1
  fi
  if [ -e "$_guard_task_dir" ] || [ -L "$_guard_task_dir" ]; then
    echo "guard: cleanup failed: $_guard_task_dir still exists" >&2
    _cleanup_failed=1
  fi
  if [ "$_cleanup_failed" -ne 0 ] && [ "$_cleanup_status" -eq 0 ]; then
    _cleanup_status=1
  fi
  exit "$_cleanup_status"                                 # EXIT trap 的 return 不改变退出码，必须显式 exit
}
readonly -f cleanup

_SECRET_HANDOFF_GUARD_ARMED=1
readonly _SECRET_HANDOFF_GUARD_ARMED
trap 'cleanup "$?"' EXIT
trap 'cleanup 130' INT
trap 'cleanup 143' TERM
trap 'cleanup 129' HUP
trap 'cleanup 131' QUIT
