---
name: secret-handoff
description: Broker an existing, live credential to an agent without exposing its value in chat, command output, logs, argv, or the repo. Use when a task needs the agent to obtain, inject, store, or transmit a password, API key, token, SSH credential, existing cloud session, or vault entry — Bitwarden CLI (`bw`), Bitwarden Secrets Manager (`bws`), 1Password (`op`), macOS Keychain, SSH Agent — or when the user asks how to hand over a secret safely (Bitwarden、Secrets Manager、密码、私钥、API token、敏感信息交接). Not for code that only defines auth flows, hashing, or rotation policy, and not for test fixtures or dummy credentials.
---

# Secret Handoff

Give the agent **access**, not the secret value: **broker, not paste**.

**Threat model — read first.**

- **In scope** — accidental exposure through the agent's own surface: transcript, tool arguments, command output, argv, process environment, temp files, repositories.
- **Out of scope — say so, never imply coverage**: host auditing/EDR, shell history outside this session, core dumps/swap, CI log retention, the remote host's logs, provider-side retention.
- **Never a guarantee**: the shell holding the credential is model-driven, so a malicious or prompt-injected agent can always `printf "$SECRET"`; only a broker that fixes the command and destination outside the model's control helps.

Assume prompts, tool calls, arguments, environments, and logs are retained. So **the model-visible stream must never contain the bytes** — transcript, tool arguments, tool output. The sandbox may hold them briefly, under the rules below, and only inside a single command that also consumes and clears them.

## 1. Classify the handoff

Pin these down before requesting anything:

1. **Secret type** — SSH key, password, API token, cloud session, signing key, encrypted file.
2. **Destination** — the exact host, service, repository, or command allowed to receive it.
3. **Scope** — the smallest operation that finishes the task, ideally one command or one session.
4. **Existing broker** — SSH Agent, OS Keychain, cloud credential helper, vault CLI, or an already-unlocked app session.

"The user said use Bitwarden" authorizes reading a matching credential for the requested destination — not dumping the vault, not using unrelated items.

## 2. Prefer a broker over the value

A **trusted channel** is one of: SSH/GPG agent, OS keychain, vault CLI session, or a `0600` file the user created. If none exists, stop and ask the user to choose one — never fall back to chat or a repository file.

1. **Signing agent or broker** — `SSH_AUTH_SOCK`, `gpg-agent`, cloud credential helpers, vault CLI sessions, an unlocked desktop app.
2. **Single-value retrieval** — pull exactly one field straight into the process that needs it.
3. **Project-wide injectors** (`bws run`, `op run`) — a last resort, only when the task truly needs several of the project's secrets: they hand *every* secret in scope to the child, and vault-chosen variable names can re-shape how it runs. Provider-specific requirements (`bws run` needs `--uuids-as-keynames` behind a name-mapping wrapper; confirm the equivalent for any other injector with `--help` before use) are in [`references/bitwarden-secrets.md`](references/bitwarden-secrets.md).
4. **Temporary file** — only when the tool cannot consume stdin; private dir, `0600`, used once, then truncated and unlinked.
5. **Pasted into chat** — never. If the user already pasted one, don't repeat it, recommend rotation, and continue through a broker.

Don't export a private key when an agent can sign with it; don't copy a whole vault item when one field is needed.

## 3. One task = one command

Read, use, and clear a credential inside a **single command**; never carry a value in a variable or a file across tool calls. Ask the user to enter it in *their own* terminal, then ask for the **path**, not the value:

```bash
# 用户在**自己的终端**里执行：交互输入不回显，值不进 history/argv
umask 077
BASE="${TMPDIR:-/tmp}"; BASE="${BASE%/}"                      # 去掉尾部斜杠，避免 // 造成路径不一致
DIR="$(mktemp -d "$BASE/secret-handoff.XXXXXX")"                # 0700, 每任务独立，不用固定路径
: > "$DIR/.secret-handoff"                                      # 标记文件：只有带它的目录才允许被整目录清空
printf 'secret (input hidden): ' >&2
IFS= read -rs TOKEN || exit 1                                   # EOF/Ctrl-D 也要失败
[ -n "$TOKEN" ] || { echo 'refuse: empty input' >&2; exit 1; }  # 空输入不写文件
(umask 077; set -o noclobber; printf '%s' "$TOKEN" > "$DIR/token") || exit 1
unset TOKEN
echo "$DIR"            # 把**目录**交给 agent（不是文件路径）
```

```bash
# agent 侧：读取→消费→清理在同一条命令内完成
SKILL_DIR='<this skill dir>'                    # 例如 ~/.agents/skills/secret-handoff
. "$SKILL_DIR/scripts/guard-task-dir.sh" '<user-provided dir>' || exit 1   # 校验 + 装 cleanup trap
[ -s "$TASK_DIR/token" ] || { echo "refuse: $TASK_DIR/token is missing or empty" >&2; exit 1; }
target-command --token-file "$TASK_DIR/token"
```

The guard lives in **one** place (`scripts/guard-task-dir.sh`, sourced above) so the rules cannot drift between files. It enforces: trailing-slash stripping, no symlink after canonicalization, `secret-handoff.*` name, your ownership, mode `0700`, the `.secret-handoff` marker, a parent that is yours or sticky, and not a mountpoint — then wipes the whole directory (reporting if it could not). Only put this task's own files in that directory — it is wiped wholesale on exit, so it is not a general-purpose temp dir. If the user pastes a secret anyway: don't echo it, tell them to rotate, and continue through a file or broker.

## 4. Execute safely

Before running any command that touches a secret, check these five — any hit means stop and change the approach: a literal in the command text, the value in argv, the value in a URL, a debug/verbose flag, an unfiltered listing.

- Report metadata only: source, item name/ID, destination, scope, `present`/`missing`. **Derived values are secrets too** — no length, prefix, suffix, hash, or encoded fragment; project URIs to a parsed host and never echo the raw string. `ssh-add -l` fingerprints are the one exception — public metadata.
- Never carry a value across tool calls: `unset` in the same command that used it, and never `export`.
- **Tidy up only what you recorded** — never sweep by name pattern (e.g. `${TMPDIR}/secret-handoff.*` when housekeeping: a real incident had the agent delete the user's freshly created handoff directory that way). The whole-directory wipe above applies to the directory you are actively using, not to others.
- **Cleanup must cover everything you create** — wipe the whole task directory (it already passed the shape/ownership check), never a remembered filename list. A partial whitelist fails silently: a real incident left the plaintext in a helper file (`pwform`) that cleanup never named, so "verified clean" was wrong.
- **Validate before you consume**: resolve into a variable, assert a non-empty string (and exactly one match for a lookup), then start the consumer — a failing pipeline must not launch the target with an empty, `null`, or concatenated value. Mind the trailing byte: `jq -r` appends a newline, so use `jq -j` when the value is compared, hashed, or fed to a consumer — otherwise equality checks report false mismatches and the consumer gets an extra byte.
- Deliver the value through stdin, a file descriptor, or the tool's own credential-file option: argv is readable by any local user via `ps`, and environment variables via `/proc/<pid>/environ`. Redirecting into the consumer or into the `0600` file is the point; stdout, stderr, a log, or a terminal is not — no `echo` / `cat` / `tee` / debug-log, and `printf` only when redirected into the credential itself.
- Tracing is not yours alone: a host `DEBUG` trap, `BASH_ENV`, or a parent `set -x` can log what you do — run credential commands in a scrubbed child, `env -i PATH=/usr/bin:/bin HOME="$HOME" bash --noprofile --norc -c '…'`. Keep it to one foreground tool call (no daemon, no background job), and never let a value reach a URL, a `curl -v` / `--debug` run, or an unfiltered listing (`bw list items`, `bws secret list`, `ps e`, `ps eww` print more than asked).
- State the exact destination and operation before any external mutation. Reading a credential does not authorize deploying, messaging, purchasing, or changing permissions elsewhere.

## 5. Persisted credentials

Some tools need a credential on disk (systemd `EnvironmentFile=`, `--token-file`, `~/.pgpass`, docker/git credential stores). Allowed when the tool has no better mechanism, but:

- **verify before writing**, not after: canonicalize the parent directory (`cd -P … && pwd -P`) and refuse any resolved path inside the repo worktree. If — and only if — the tool insists on a path inside the worktree, the file must also be ignored **and** untracked, and you must disclose it in the final report: an ignored, untracked file still physically sits in the repo;
- **write atomically as `0600`**: refuse symlinks, create with `noclobber` (O_EXCL) instead of `>` on a fixed name, so a pre-planted file or link cannot capture the value;
- prefer what the daemon reads (`EnvironmentFile=`, `--token-file`) over `Environment=` or argv, which other processes can see;
- moving a credential orphans the old copy: after a path change, clear the previous location;
- record what it is, where it came from, and how it rotates, so cleanup isn't guesswork.

Command form, plus the ignore/tracked check for the rare case where the file must live inside the repo: [`references/patterns.md`](references/patterns.md).

## 6. Standard workflow

1. **Probe channels** — check for an existing agent/session/keychain entry without printing values.
2. **Read the matching reference** — for `bw`, `bws`, SSH, or Keychain work, read that file under `references/` before running any command. For a provider without a reference (`op`, `pass`, `sops`), confirm the flags with `--help` on this machine first; never invent arguments.
3. **Ask for the minimum access** — unlock the vault, or have the user place a one-shot `0600` file (§3).
4. **Select one field** — only the matching item, and only the needed username/password/token/key field.
5. **Use once** — inject straight into the target command, narrowest destination and scope, one command end to end.
6. **Verify by side effect** — hostname, HTTP status, deployed file hash, authenticated success message; never the secret itself.
7. **Clean up** — unset variables, truncate + unlink every file the value touched, wipe the whole validated task directory (not a filename list), then re-check the exact paths: a variable you no longer set cannot verify anything.
8. **Quarantine on exposure** — a value that reached a third party, a log, or a transcript is burned; stop using it and do not treat the task as done until it is confirmed dead.

## 7. Vault references

- Bitwarden CLI (`bw`) — status, unlock, item selection, SSH agent: [`references/bitwarden.md`](references/bitwarden.md)
- Bitwarden Secrets Manager (`bws`) — machine token, `bws run`, per-key extraction: [`references/bitwarden-secrets.md`](references/bitwarden-secrets.md)
- Concrete recipes (SSH agent, macOS Keychain, persisted credential files): [`references/patterns.md`](references/patterns.md)

## Completion criteria

- The target operation succeeded for the requested destination.
- **No new exposure**: since this skill was engaged, neither the value nor its derivatives (length / prefix / hash) appeared in the transcript, tool-call arguments, or command output. Exposure from before that is *unverified* — hand it to the human and rotate; you cannot audit your way out of it.
- Every temporary file, variable, session, and task directory is gone — verified by checking the exact path afterwards, not assumed — including any copy left at a previous path.
- If the value was ever exposed: rotation is confirmed — the old value now fails, every consumer has been re-deployed, and the affected scope is reported.
- The final report states the exact command and non-secret evidence, so a human can re-check the claim.
