---
name: secret-handoff
description: Broker an existing, live credential to an agent without exposing its value in chat, command output, logs, or the repo, and without argv by default; the only bounded argv exception is a provider CLI with no stdin/file form (Bitwarden `bws` create/edit) on a trusted single-user host. Use when a task needs the agent to obtain, inject, store, or transmit a password, API key, token, SSH credential, existing cloud session, or vault entry — Bitwarden CLI (`bw`), Bitwarden Secrets Manager (`bws`), 1Password (`op`), macOS Keychain, SSH Agent — or when the user asks how to hand over a secret safely (Bitwarden、Secrets Manager、密码、私钥、API token、敏感信息交接). Not for code that only defines auth flows, hashing, or rotation policy, and not for test fixtures or dummy credentials.
---

# Secret Handoff

Give the agent **access**, not the secret value: **broker, not paste**.

**Threat model — read first.**

- **In scope** — accidental exposure through the agent's own surface: transcript, tool arguments, command output, argv, process environment, temp files, repositories.
- **Out of scope — say so, never imply coverage**: host auditing/EDR, shell history outside this session, core dumps/swap, CI log retention, the remote host's logs, provider-side retention, and another process already running as the same user. A same-user process is not an isolation boundary: it can read argv/environment where the OS permits, race paths, and retain copies; use a dedicated single-user host or container when that matters.
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
: > "$DIR/.secret-handoff"                                      # 标记文件：只有带它的目录才允许被 guard 清理
printf 'secret (input hidden): ' >&2
IFS= read -rs TOKEN || exit 1                                   # EOF/Ctrl-D 也要失败
[ -n "$TOKEN" ] || { echo 'refuse: empty input' >&2; exit 1; }  # 空输入不写文件
(umask 077; set -o noclobber; printf '%s' "$TOKEN" > "$DIR/token") || exit 1
unset TOKEN
echo "$DIR"            # 把**目录**交给 agent（不是文件路径）
```

```bash
# agent 侧：读取→消费→清理在同一条命令内完成
# env -i 去掉父 shell 的 xtrace/DEBUG/BASH_ENV；guard 是 Bash-only。
SKILL_DIR='<this skill dir>'                    # 例如 ~/.agents/skills/secret-handoff
HANDOFF_DIR='<user-provided dir>'
TARGET_BIN='<absolute path to target command>'
case "$TARGET_BIN" in /*) ;; *) echo "refuse: TARGET_BIN must be absolute" >&2; exit 1 ;; esac
[ -f "$TARGET_BIN" ] && [ -x "$TARGET_BIN" ] || { echo "refuse: TARGET_BIN is not an executable file" >&2; exit 1; }
case "$PATH" in *::*|:*|*:) echo "refuse: PATH has an empty entry" >&2; exit 1 ;; esac
_saved_ifs="$IFS"; IFS=:
for _path_entry in $PATH; do
  case "$_path_entry" in /*) ;; *) echo "refuse: PATH entry is not absolute: $_path_entry" >&2; exit 1 ;; esac
done
IFS="$_saved_ifs"; unset _path_entry
/usr/bin/env -i HOME="$HOME" PATH="$PATH" SKILL_DIR="$SKILL_DIR" HANDOFF_DIR="$HANDOFF_DIR" TARGET_BIN="$TARGET_BIN" \
  /bin/bash --noprofile --norc -c '
    . "$SKILL_DIR/scripts/guard-task-dir.sh" "$HANDOFF_DIR" || exit 1
    [ -s "$TASK_DIR/token" ] || { echo "refuse: token is missing or empty" >&2; exit 1; }
    "$TARGET_BIN" --token-file "$TASK_DIR/token"
  '
```

The guard lives in **one** place (`scripts/guard-task-dir.sh`) and must be sourced inside the scrubbed child, not in the parent shell, so the rules cannot drift between files and a parent DEBUG trap cannot cross the `env -i` boundary. It enforces: trailing-slash stripping, no symlink after canonicalization, `secret-handoff.*` name, your ownership, mode `0700`, the `.secret-handoff` marker, a parent that is either sticky or owned by you and not group/other-writable, and a stable path identity. It snapshots the canonical path/device/inode into private readonly variables, refuses xtrace, `BASH_XTRACEFD`, or an existing ERR/EXIT/INT/TERM/HUP/QUIT trap it can see, and first deletes every top-level non-directory entry; if a nested directory exists it reports failure and leaves that directory for manual inspection, as it does for a path that changed or could not be wiped. A second INT/TERM during cleanup is ignored; `SIGKILL` and host-level retention cannot be caught. Only put this task's own files directly in that directory — it is not a general-purpose temp dir. If the user pastes a secret anyway: don't echo it, tell them to rotate, and continue through a file or broker.

## 4. Execute safely

Treat these as default hard stops; only an item that names an explicit bounded exception may proceed, with that item's controls. Otherwise stop and redesign:

1. A literal value in command text, a tool argument, a URL, or a repository file.
2. A value in process argv. The only bounded exception is the create/edit path documented in [`references/bitwarden-secrets.md`](references/bitwarden-secrets.md): the CLI has no stdin/file form, so the value is briefly in local argv on a trusted single-user host. State that residual exposure before using it; never use it on a shared host.
3. A URL containing the value (including query strings and userinfo).
4. Debug/verbose/tracing output that can echo the value.
5. An unfiltered credential listing (`bw list items`, `bws secret list`, `ps e`, `ps eww`, …).

Then design the command and cleanup:

- Report metadata only: source, item name/ID, destination, scope, `present`/`missing`. **Derived values are secrets too** — no length, prefix, suffix, hash, or encoded fragment; project URIs to a parsed host and never echo the raw string. `ssh-add -l` fingerprints are the one exception — public metadata.
- Never carry a value across tool calls: `unset` in the same command that used it, and never `export`.
- **Brace the boundary** — write `${VAR}` when a variable sits next to non-ASCII text (`"$TARGET（…）"`): in a non-UTF-8 locale the shell swallows the following bytes into the name, and `set -u` aborts mid-script. This bit the same workflow twice; scan for `$VAR` followed by CJK punctuation before shipping a script.
- **Tidy up only what you recorded** — never sweep by name pattern (e.g. `${TMPDIR}/secret-handoff.*` when housekeeping: a real incident had the agent delete the user's freshly created handoff directory that way). The guard's wipe applies to the directory you are actively using, not to others.
- **Cleanup must cover everything you create** — let the guard wipe every top-level file in the validated task directory, never a remembered filename list. A partial whitelist fails silently: a real incident left the plaintext in a helper file (`pwform`) that cleanup never named, so "verified clean" was wrong. Nested directories are not supported and make cleanup fail closed. The guard is the single implementation of the cleanup and exit-status contract; do not restate or reimplement its algorithm in a caller.
- **Validate before you consume**: resolve into a variable, assert a non-empty string (and exactly one match for a lookup), then start the consumer — a failing pipeline must not launch the target with an empty, `null`, or concatenated value. Mind the trailing byte: `jq -r` appends a newline, so use `jq -j` when the value is compared, hashed, or fed to a consumer — otherwise equality checks report false mismatches and the consumer gets an extra byte.
- Deliver the value through stdin, a file descriptor, or the tool's own credential-file option: environment variables are readable via `/proc/<pid>/environ`. Redirecting into the consumer or into the `0600` file is the point; stdout, stderr, a log, or a terminal is not — no `echo` / `cat` / `tee` / debug-log, and `printf` only when redirected into the credential itself.
- Tracing is not yours alone: a host `DEBUG` trap, `BASH_ENV`, or a parent `set -x` can log what you do — run credential commands in a scrubbed child, `env -i PATH=/usr/bin:/bin HOME="$HOME" bash --noprofile --norc -c '…'`. Keep it to one foreground tool call (no daemon, no background job), and never let a value reach a URL, a `curl -v` / `--debug` run, or an unfiltered listing.
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
7. **Clean up** — unset variables, then let the guard clear the validated task directory's top-level files; if it reports a nested directory or identity change, inspect manually and re-verify the exact path.
8. **Quarantine on exposure** — a value that reached a third party, a log, or a transcript is burned; stop using it and do not treat the task as done until it is confirmed dead.

### Before you ask for a new credential

A rejected attempt is **not** evidence that the credential is missing. In one real session every blocker was misidentification, so triage first:

1. **Enumerate what already exists** — list Secrets Manager keys and vault item *names* (metadata only). The match is often by purpose, not by the address you were given: a host in Moldova was reachable all along with the secret named `MD_SSH_*`, while the agent kept retrying a key meant for a different fleet.
2. **Confirm what the destination actually is** before hunting a provider panel — `dig -x`, `whois`, and your own inventory notes. A provider brand, a billing panel, and a machine's location are three different facts; a machine can be bought from one brand and sit in another company's datacentre.
3. **Check whether a stored credential can still be valid** — a changed SSH host key means a reinstall, and a reinstall invalidates stored passwords; don't spend attempts on them. IP changes orphan credentials too: an item named after the old address will not be found by searching the new one.
4. **Budget the attempts** — assume fail2ban or account lockout: 1–2 tries, never spray usernames, and prefer a key over a password so the value never reaches argv.
5. **Prefer the machine-readable store for automation** — Secrets Manager over an interactive vault: every vault unlock costs the user a manual step, and each handover is a chance to lose the session (one was destroyed by an over-broad cleanup).
6. **Record the mapping once you find it** — a secret's *note* is metadata: put which host it belongs to and what it is for there, so the next session matches in seconds instead of minutes.

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
