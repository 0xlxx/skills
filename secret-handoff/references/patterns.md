# Handoff patterns

Concrete recipes for the channels in the main skill. Every one is a **single command** that reads, uses, and clears the value inside the same invocation.

## SSH: sign with the agent

```bash
[ -n "${SSH_AUTH_SOCK:-}" ] || { echo 'SSH agent unavailable' >&2; exit 1; }
ssh-add -l >/dev/null 2>&1 || { echo 'agent has no identities' >&2; exit 1; }
ssh -o BatchMode=yes -o ForwardAgent=no user@host 'hostname'
```

Never use `-A` and never set `ForwardAgent yes`: once forwarded, any account that can become root on the remote host can borrow **every** key in your local agent, which breaks the "one destination, one command" scope. If a remote genuinely needs an agent, forward one holding a key that exists only for that host.

`ssh-add -l` (fingerprints) and `ssh-add -L` (public keys) are public metadata — never ask the user to paste a private key, and never print one. With several keys, choose by fingerprint/comment with the user; use `-o IdentitiesOnly=yes -i <key-file>` only when selecting a specific file.

## macOS Keychain: field → consumer in one command

```bash
set -o pipefail
SECRET="$(security find-generic-password -s 'service-name' -w)" || exit 1
[ -n "$SECRET" ] || { echo 'refuse: keychain returned an empty value' >&2; exit 1; }
printf '%s' "$SECRET" | target-command --token-stdin || exit 1
unset SECRET
```

The consumer starts only after the value was read successfully. If the tool has no stdin/credential-file option, prefer its file or helper option over argv.

## One-shot session file

Use the template in the main skill (§3) — one `mktemp -d` per task, never a shared fixed path. A fixed `~/.cache/.../bw_session` invites races, stale sessions, and symlink tricks; a fresh directory per task removes all three. Cleanup: wipe the whole directory — the guard (`scripts/guard-task-dir.sh`) checks marker + shape + ownership + `0700` + non-mountpoint first; a filename whitelist is not enough (see §4 of the main skill). Verify the **exact path** afterwards (`test ! -e '<dir>'`, not `$DIR` — a later tool call has no such variable).

## Credential files that must persist

Read the source, verify the destination, write, and clear both sides — all in **one** command. Splitting it across tool calls would leave the value in a variable outliving the call, plus a second copy on disk.

```bash
set -euo pipefail
NAME="$(basename "$TARGET")"
PARENT="$(cd "$(dirname "$TARGET")" && pwd -P)" || { echo "refuse: parent dir missing" >&2; exit 1; }
RESOLVED="$PARENT/$NAME"

# 源与目标不能是同一个文件，否则写完就会被下面的清理步骤删掉
SOURCE_RESOLVED="$(cd "$(dirname "$SOURCE")" && pwd -P)/$(basename "$SOURCE")" || exit 1
[ "$SOURCE_RESOLVED" = "$RESOLVED" ] && { echo "refuse: SOURCE and TARGET are the same path" >&2; exit 1; }
[ -e "$TARGET" ] && [ "$TARGET" -ef "$SOURCE" ] && { echo "refuse: SOURCE and TARGET are the same file (hardlink)" >&2; exit 1; }

# 判断**目标所在的**仓库（不是当前目录所在的仓库 —— CWD 可能在另一个 repo 或不在 repo 里）
# git 自己的探测会被继承的 GIT_DIR/GIT_WORK_TREE 干扰，先清掉；探测失败时用独立的祖先检查兜底（fail closed）
REPO_ROOT="$(env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR -u GIT_INDEX_FILE \
  git -C "$PARENT" rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$REPO_ROOT" ]; then REPO_ROOT="$(cd "$REPO_ROOT" && pwd -P)"; fi   # 规范化：symlink 路径也要拦住
if [ -z "$REPO_ROOT" ]; then
  d="$PARENT"
  while [ "$d" != "/" ] && [ -n "$d" ]; do
    if [ -e "$d/.git" ]; then
      echo "refuse: $RESOLVED sits inside a worktree ($d/.git) but git could not confirm it — unset GIT_DIR/GIT_WORK_TREE and retry" >&2
      exit 1
    fi
    d="$(dirname "$d")"
  done
fi

# 目标落在 repo worktree 内：只有工具坚持时才允许，且必须 ignored + untracked + 最终报告披露
if [ -n "$REPO_ROOT" ]; then
  case "$RESOLVED" in
    "$REPO_ROOT"/*)
      if env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR -u GIT_INDEX_FILE \
         git -C "$PARENT" ls-files --error-unmatch -- "$NAME" >/dev/null 2>&1; then
        echo "refuse: $RESOLVED is tracked — .gitignore never untracks a committed file" >&2; exit 1
      fi
      env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR -u GIT_INDEX_FILE \
        git -C "$PARENT" check-ignore -q -- "$NAME" || { echo "refuse: $RESOLVED is inside the repo and not ignored" >&2; exit 1; }
      echo "warning: credential file inside the repo worktree — disclose it in the final report" >&2 ;;
  esac
fi

[ -L "$TARGET" ] && { echo "refuse: $TARGET is a symlink" >&2; exit 1; }
VALUE="$(<"$SOURCE")"                                   # SOURCE = 用户在自己终端创建的 0600 文件
[ -n "$VALUE" ] || { echo "refuse: $SOURCE is empty" >&2; exit 1; }
umask 077
[ -e "$TARGET" ] && unlink "$TARGET"                    # replace, never append
(set -o noclobber; printf '%s' "$VALUE" > "$TARGET")    # O_EXCL semantics
[ -s "$TARGET" ] || { echo "refuse: write failed, source kept" >&2; exit 1; }
unset VALUE
truncate -s 0 "$SOURCE" 2>/dev/null || : > "$SOURCE"    # 确认落盘成功后，才销毁源文件
unlink "$SOURCE"
```

Prefer `EnvironmentFile=` / `--token-file` over `Environment=` or argv, which other processes can read.
