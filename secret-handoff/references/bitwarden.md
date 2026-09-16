# Bitwarden secret handoff (`bw`)

Use Bitwarden as a broker. Read the requested item, extract only the needed field, and keep the value out of chat and logs.

**Every example below is one command.** Read, use, and clear inside the same invocation — never `export BW_SESSION`, never carry a value in a variable across tool calls. If the task needs several commands, have the user provide a fresh one-shot session for each.

For machine-scoped secrets (`bws run`, `BWS_ACCESS_TOKEN`), use [bitwarden-secrets.md](bitwarden-secrets.md) instead.

## 1. Check state without exposing secrets

```bash
bw status | jq -r .status         # 裸跑 bw status 会带出 userEmail/userId
[ -n "${BW_SESSION:-}" ] && echo 'BW_SESSION=set' || echo 'BW_SESSION=unset'
[ -n "${SSH_AUTH_SOCK:-}" ] && echo 'SSH_AUTH_SOCK=set' || echo 'SSH_AUTH_SOCK=unset'
ssh-add -l 2>/dev/null || true
```

`ssh-add -l` prints public-key fingerprints and comments — public metadata, and the one "hash-like" value this skill allows you to read.

Do not treat the macOS Keychain item named `Bitwarden` as a master password: it is usually the desktop app's OAuth access/refresh token and cannot unlock the CLI vault.

## 2. Choose the narrowest channel

### SSH credentials

```bash
SSH_AUTH_SOCK="${SSH_AUTH_SOCK:?Bitwarden SSH Agent is not configured}" \
  ssh -o BatchMode=yes -o ForwardAgent=no user@host 'hostname'
```

Never forward the agent (`-A` / `ForwardAgent yes`): once forwarded, any account that can become root on the remote host can borrow **every** key in your agent. `IdentitiesOnly` does not limit that — it only narrows which key is *offered*. With several keys, identify the intended one by fingerprint/comment and let the user choose; don't export the private key when the agent can sign.

### Passwords and API tokens

If the CLI is locked, have the user create a one-shot session file in **their own** terminal (same shape as §3 of the main skill):

```bash
umask 077
BASE="${TMPDIR:-/tmp}"; BASE="${BASE%/}"
DIR="$(mktemp -d "$BASE/secret-handoff.XXXXXX")"
: > "$DIR/.secret-handoff"                                      # 标记文件：guard 清理的前提
(set -o noclobber; bw unlock --raw > "$DIR/bw_session") || exit 1
echo "$DIR"                    # 把**目录**交给 agent（不是文件路径）
```

## 3. Locate one item — metadata only

```bash
bw list items --search '<host-or-service>' \
  | jq -c '.[] | {id, name, type, hosts: [.login.uris[]?.uri
      | (capture("^[a-zA-Z][a-zA-Z0-9+.-]*://(?<host>localhost|(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\\.)+[A-Za-z]{2,})(?::[0-9]+)?(?:[/?#]|$)").host
         // "<omitted:unparsable>")
    ]}'
```

Rules:

- Use a specific query: host, service, account, or item name. Never run unfiltered `bw list items` — it prints passwords.
- **Never print a raw URI.** A URI field can carry `user:password@`, a query-string token, or be no URI at all (`deploy:hunter2`). The filter above keeps only a dotted hostname or `localhost`, and reports everything else as `<omitted:unparsable>` — deliberately including userinfo URIs (`ssh://git@github.com/…`), IP literals (`https://[2001:db8::1]/`, `https://192.0.2.10/`), single-label hosts, and any hex-looking or whitespace/control-bearing string. Never widen it: an unparsed string echoed verbatim *is* the leak this rule exists to prevent.
- If several items match, have the user choose by non-secret metadata (name or ID).
- Never print raw item JSON for a login: it contains the password.

## 4. Extract one field and use it in the same command

> Run the extraction below inside the scrubbed child described in §4 of the main skill. The command shown is child-side code; a parent-shell `set -x` or `DEBUG` trap can otherwise print the value.

```bash
SKILL_DIR='<this skill dir>'
HANDOFF_DIR='<user-provided dir>'
TARGET_BIN='<absolute path to target command>'
case "$TARGET_BIN" in /*) ;; *) exit 1 ;; esac
[ -f "$TARGET_BIN" ] && [ -x "$TARGET_BIN" ] || exit 1
/usr/bin/env -i HOME="$HOME" PATH="$PATH" SKILL_DIR="$SKILL_DIR" HANDOFF_DIR="$HANDOFF_DIR" TARGET_BIN="$TARGET_BIN" \
  /bin/bash --noprofile --norc <<'CHILD'
set -o pipefail
. "$SKILL_DIR/scripts/guard-task-dir.sh" "$HANDOFF_DIR" || exit 1
ITEM_ID='<item-id>'
[ -s "$TASK_DIR/bw_session" ] && [ ! -L "$TASK_DIR/bw_session" ] || exit 1
_session_mode="$(command -p stat -c %a "$TASK_DIR/bw_session" 2>/dev/null || command -p stat -f %Lp "$TASK_DIR/bw_session" 2>/dev/null || echo '?')"
[ "$_session_mode" = "600" ] || exit 1
BW_BIN="$(type -P bw)" || exit 1
JQ_BIN="$(type -P jq)" || exit 1
case "$BW_BIN:$JQ_BIN" in /*:/*) ;; *) exit 1 ;; esac
[ -f "$BW_BIN" ] && [ -x "$BW_BIN" ] && [ -f "$JQ_BIN" ] && [ -x "$JQ_BIN" ] || exit 1
SECRET="$(BW_SESSION="$(<"$TASK_DIR/bw_session")" "$BW_BIN" get item "$ITEM_ID" \
  | "$JQ_BIN" -er '.login.password | select(type == "string" and length > 0)')" || exit 1
printf '%s' "$SECRET" | "$TARGET_BIN" --password-stdin || exit 1
unset SECRET
CHILD
```

- Validate **before** consuming: the consumer only starts after the value is confirmed to be a non-empty string, so a missing field or a broken lookup cannot hand the target an empty value or `null`.
- `set -o pipefail` + `jq -er` make a failed upstream fail the command instead of feeding the consumer.
- The sourced guard wipes every top-level file in the validated task directory on success and on failure, and fails closed on nested directories (single implementation: `scripts/guard-task-dir.sh`); see §4 of the main skill for why a filename whitelist is not enough. It is Bash-only.
- For custom fields or SSH-key items, inspect the field **names** first, then select the exact path — e.g. `.fields[] | select(.name == "token") | .value` or `.sshKey.privateKey`.

## 5. Execute and verify

Use the credential for the authorized destination only, and verify with a non-secret result: `hostname`, an authenticated status code, a deployment hash, a health check. Never echo the credential, put it in a URL, or pass it in argv when a stdin/file/helper option exists.

## 6. Clean up and rotation

Verify with the explicit path — in a later tool call the variables are gone, and `test ! -e "$DIR/..."` would check a path that no longer means anything:

```bash
test ! -e '<dir from the user>/bw_session' && test ! -e '<dir from the user>'
```

`unlink` is best-effort — snapshots, backups, and SSD remanence can keep the bytes. If the value ever reached a third party, a log, or a transcript, treat it as burned: stop using it, tell the user to rotate, and do not treat the task as done until the old value is confirmed dead, every consumer has been re-deployed (`--token-file`, `EnvironmentFile=`, restart the unit), and the affected scope is reported.
