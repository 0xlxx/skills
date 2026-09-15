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
BASE="${TMPDIR:-/tmp}"; BASE="${BASE%/}"
DIR="$(mktemp -d "$BASE/secret-handoff.XXXXXX")"
(umask 077; set -o noclobber; bw unlock --raw > "$DIR/bw_session") || exit 1
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

```bash
set -o pipefail
DIR='<dir from the user>'          # 目录；若误传文件路径，先归一
[ -f "$DIR" ] && DIR="$(cd "$(dirname "$DIR")" && pwd -P)"
ITEM_ID='<item-id>'
# DIR 必须是 §3 模板创建的目录；trap 只删 session 文件，不用通配符
# DIR 校验：先规范化再判断 —— 字面前缀会被 `..`/symlink 骗过，而用户与 agent 的 TMPDIR 也可能不同
case "$(basename "$DIR")" in secret-handoff.*) ;; *) echo "refuse: $DIR is not a secret-handoff.* task directory" >&2; exit 1 ;; esac
[ -d "$DIR" ] && [ ! -L "$DIR" ] && [ -O "$DIR" ] \
  || { echo "refuse: $DIR must be an existing directory you own, and not a symlink" >&2; exit 1; }
DIR_REAL="$(cd -P "$DIR" && pwd -P)"
PARENT_REAL="$(dirname "$DIR_REAL")"
[ -O "$PARENT_REAL" ] || [ -k "$PARENT_REAL" ] \
  || { echo "refuse: parent of $DIR is neither yours nor a sticky temp dir" >&2; exit 1; }
PERMS="$(stat -f %Lp "$DIR_REAL" 2>/dev/null || stat -c %a "$DIR_REAL" 2>/dev/null || echo '?')"
[ "$PERMS" = "700" ] || { echo "refuse: $DIR must be 0700 (got $PERMS)" >&2; exit 1; }
cleanup() { rm -f "$DIR_REAL/bw_session"; rmdir "$DIR_REAL" 2>/dev/null; [ -e "$DIR_REAL" ] && echo "cleanup failed: $DIR_REAL" >&2; }
trap cleanup EXIT INT TERM
SECRET="$(BW_SESSION="$(<"$DIR/bw_session")" bw get item "$ITEM_ID" \
  | jq -er '.login.password | select(type == "string" and length > 0)')" || exit 1
printf '%s' "$SECRET" | target-command --password-stdin || exit 1
unset SECRET
```

- Validate **before** consuming: the consumer only starts after the value is confirmed to be a non-empty string, so a missing field or a broken lookup cannot hand the target an empty value or `null`.
- `set -o pipefail` + `jq -er` make a failed upstream fail the command instead of feeding the consumer.
- The `trap` clears the session file and the task directory on success and on failure.
- For custom fields or SSH-key items, inspect the field **names** first, then select the exact path — e.g. `.fields[] | select(.name == "token") | .value` or `.sshKey.privateKey`.

## 5. Execute and verify

Use the credential for the authorized destination only, and verify with a non-secret result: `hostname`, an authenticated status code, a deployment hash, a health check. Never echo the credential, put it in a URL, or pass it in argv when a stdin/file/helper option exists.

## 6. Clean up and rotation

Verify with the explicit path — in a later tool call the variables are gone, and `test ! -e "$DIR/..."` would check a path that no longer means anything:

```bash
test ! -e '<dir from the user>/bw_session' && test ! -e '<dir from the user>'
```

`unlink` is best-effort — snapshots, backups, and SSD remanence can keep the bytes. If the value ever reached a third party, a log, or a transcript, treat it as burned: stop using it, tell the user to rotate, and do not treat the task as done until the old value is confirmed dead, every consumer has been re-deployed (`--token-file`, `EnvironmentFile=`, restart the unit), and the affected scope is reported.
