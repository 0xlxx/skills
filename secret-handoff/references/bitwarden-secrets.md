# Bitwarden Secrets Manager (`bws`)

`bws` is not the password vault: it is machine-scoped secrets addressed by key, authenticated by a **machine access token**. There is no interactive unlock, so the token is itself the credential to protect.

For the personal password vault (`bw status` / `bw get item` / `BW_SESSION`), use [bitwarden.md](bitwarden.md) instead.

## 1. Machine token

`bws` reads the token only from `$BWS_ACCESS_TOKEN` or `-t` (argv — avoid it). It does **not** read a token file automatically, so keep the token in a `0600` file yourself and load it into exactly one command:

```bash
BWS_ACCESS_TOKEN="$(cat "$HOME/.config/bws/access-token")" bws project list -o json | jq -r '.[].name'
```

- Verified: with the file present but `BWS_ACCESS_TOKEN` unset, `bws` exits with `Missing access token`.
- Presence check without printing: `[ -n "${BWS_ACCESS_TOKEN:-}" ]`.
- Never echo the token; never put it in a unit file, a shell profile, or argv (`ps` shows argv to every local user).
- `unset BWS_ACCESS_TOKEN` inside the same command — never `export` it into a long-lived shell.

## 2. `bws run` is a last resort

`bws run` injects **every secret in the project** into the child process, under the **names defined in the vault**. Those names can change how the child executes or prints — `PATH`, `IFS`, `SHELLOPTS`, `BASH_ENV`, `ENV`, `LD_*`, `PYTHONPATH`, `NODE_OPTIONS`, `JAVA_TOOL_OPTIONS`, `PERL5OPT`, `RUBYOPT` — so a vault key name is itself an injection surface. The same applies to `op run`.

```bash
BWS_ACCESS_TOKEN="$(cat "$HOME/.config/bws/access-token")" \
  bws run --project-id "$PROJECT_ID" --no-inherit-env --uuids-as-keynames -- /absolute/path/to/wrapper
```

- Only for a command you reviewed — never a build/test script you did not write — and only behind a wrapper that maps the single UUID it needs to the variable the command expects, so no vault-chosen name ever reaches the child directly.
- For one secret or one field, do **not** use `run`: use §3.
- If any injected key lands in the dangerous set above and you cannot switch to `--uuids-as-keynames` + wrapper, **stop** and use §3 instead — the name mapping is not optional.
- `--no-inherit-env` keeps the child from also inheriting your shell environment; it also drops `HOME`/`PATH`-style conveniences, so pass an absolute command path.
- Verified: `bws run` strips `BWS_ACCESS_TOKEN` from the child — the child receives the project's secrets, not your machine token.
- Injected values live in the child's environment, readable by the same user or root via `/proc/<pid>/environ`. Keep the child short-lived and single-tenant.

## 3. One value — validate, then consume

> The snippets in this section are child-side fragments. Run them through the scrubbed child from §4 of the main skill; never execute them in a parent shell with xtrace, `DEBUG`, or `ERR` traps.

Resolve and validate the value first, and only then start the consumer:

```bash
set -o pipefail
VALUE="$(BWS_ACCESS_TOKEN="$(cat "$HOME/.config/bws/access-token")" \
  bws secret list "$PROJECT_ID" -o json \
  | jq -er '[.[] | select(.key == "TARGET")]
             | if length == 1 then (.[0].value | select(type == "string" and length > 0))
               else error("expected exactly 1 match, got \(length)") end')" || exit 1
printf '%s' "$VALUE" | target-command --token-stdin || exit 1
unset VALUE
```

- The consumer starts only after the value is a non-empty string: a failed lookup, a `null` field, or several matches abort the command instead of handing the target an empty value, `null`, or two secrets concatenated.
- `set -o pipefail` + `jq -er` + the exactly-one assertion are the fail-closed triple. Verified: zero matches exits non-zero (`expected exactly 1 match, got 0`).
- A pipeline that ends at `jq -r '.value'` prints the value into the transcript — the one outcome this skill exists to prevent. Always terminate in the consumer, or in a `0600` file the same command deletes.
- **Never run a bare `bws secret list`** — it prints every secret's value. Filter inside the same pipeline so values never reach the terminal, a file, or CI output.
- For a known id, keep the same validate-then-consume shape — never a pipeline that ends at `jq`:

  ```bash
  set -o pipefail
  VALUE="$(BWS_ACCESS_TOKEN="$(cat "$HOME/.config/bws/access-token")" \
    bws secret get "$SECRET_ID" -o json \
    | jq -er '.value | select(type == "string" and length > 0)')" || exit 1
  printf '%s' "$VALUE" | target-command --token-stdin || exit 1
  unset VALUE
  ```
- Find ids/keys with metadata only (same `BWS_ACCESS_TOKEN="$(cat ~/.config/bws/access-token)"` prefix): `bws project list -o json | jq -r '.[].name'`, then `bws secret list "$PROJECT_ID" -o json | jq -r '.[] | {id, key}'`.
- `-o env` prints `KEY=value` lines — treat that output exactly like a raw secret.

## 4. Create/edit safely (narrow argv exception)

Use this path only when the user asked to store or rotate a secret and no UI/API route is available. Unlike the normal rule, `bws secret create` and `secret edit --value=…` require the value as an argument, so it appears in the local process argv for the lifetime of the command. Limit this to a trusted, single-user host, state the residual `ps` exposure to the user before writing, and never use it on a shared host. stdout and tracing must not retain the value; stderr may be captured only in the guard-managed `0600` file and is deleted with the task directory.

Run this after the guard is active (`TASK_DIR` exists and `TASK_DIR/token` is a non-empty `0600` file). Both operations use one scrubbed-child function, so a parent `set -x`, `DEBUG` trap, or `BASH_ENV` cannot see the expansion:

```bash
set -o pipefail
set +x
[ -n "${_SECRET_HANDOFF_GUARD_ARMED:-}" ] || exit 1
BWS_OPERATION="${BWS_OPERATION:-create}"
BWS_BIN="$(type -P bws)" || exit 1
case "$BWS_BIN" in /*) ;; *) exit 1 ;; esac
[ -f "$BWS_BIN" ] && [ -x "$BWS_BIN" ] || exit 1
JQ_BIN=""
if [ "$BWS_OPERATION" = "create" ]; then
  JQ_BIN="$(type -P jq)" || exit 1
  case "$JQ_BIN" in /*) ;; *) exit 1 ;; esac
  [ -f "$JQ_BIN" ] && [ -x "$JQ_BIN" ] || exit 1
fi
BWS_DIR="${BWS_BIN%/*}"; [ -n "$BWS_DIR" ] || BWS_DIR="/"
JQ_DIR=""; [ -z "$JQ_BIN" ] || JQ_DIR="${JQ_BIN%/*}"
[ -z "$JQ_DIR" ] || [ -n "${JQ_DIR##*/}" ] || exit 1
BWS_PATH="$BWS_DIR:${JQ_DIR:+$JQ_DIR:}/usr/local/bin:/usr/bin:/bin"
BWS_TOKEN_FILE="${BWS_TOKEN_FILE:-$HOME/.config/bws/access-token}"
[ -f "$BWS_TOKEN_FILE" ] && [ ! -L "$BWS_TOKEN_FILE" ] || exit 1
_tokmode="$(command -p stat -c %a "$BWS_TOKEN_FILE" 2>/dev/null || command -p stat -f %Lp "$BWS_TOKEN_FILE" 2>/dev/null || echo '?')"
[ "$_tokmode" = "600" ] || exit 1
ERR_FILE="$(umask 077; command -p mktemp "$TASK_DIR/bws.err.XXXXXX")" || exit 1

run_bws_value_child() {
  local mode="$1"
  local -a env_args
  env_args=(
    HOME="$HOME" PATH="$BWS_PATH" TASK_DIR="$TASK_DIR" PROJECT_ID="${PROJECT_ID:-}"
    TARGET_KEY="${TARGET_KEY:-}" SECRET_ID="${SECRET_ID:-}" ERR_FILE="$ERR_FILE"
    BWS_MODE="$mode" BWS_BIN="$BWS_BIN" JQ_BIN="$JQ_BIN" BWS_TOKEN_FILE="$BWS_TOKEN_FILE"
  )
  [ -z "${BWS_CONFIG_FILE:-}" ] || env_args+=(BWS_CONFIG_FILE="$BWS_CONFIG_FILE")
  [ -z "${BWS_PROFILE:-}" ] || env_args+=(BWS_PROFILE="$BWS_PROFILE")
  case "${BWS_SERVER_URL:-}" in
    '') ;;
    http://*|https://*)
      _server_rest="${BWS_SERVER_URL#*://}"
      case "$_server_rest" in ''|*@*|*/*|*\?*|*\#*|*' '*|*$'\t'*|*$'\n'*) exit 1 ;; esac
      _server_host="${_server_rest%%:*}"
      [ -n "$_server_host" ] || exit 1
      case "$_server_host" in *[!A-Za-z0-9.-]*) exit 1 ;; esac
      case "$_server_rest" in
        *:*)
          _server_port="${_server_rest##*:}"
          case "$_server_port" in ''|*[!0-9]*) exit 1 ;; esac
          [ "$((10#$_server_port))" -ge 1 ] && [ "$((10#$_server_port))" -le 65535 ] || exit 1
          ;;
      esac
      env_args+=(BWS_SERVER_URL="$BWS_SERVER_URL")
      ;;
    *) exit 1 ;;
  esac
  /usr/bin/env -i "${env_args[@]}" /bin/bash --noprofile --norc <<'CHILD'
set -o pipefail
set +x
[ -s "$TASK_DIR/token" ] && [ ! -L "$TASK_DIR/token" ] || exit 1
_perms="$(command -p stat -c %a "$TASK_DIR/token" 2>/dev/null || command -p stat -f %Lp "$TASK_DIR/token" 2>/dev/null || echo '?')"
[ "$_perms" = "600" ] || exit 1
case "$BWS_MODE" in
  create) [ -n "$PROJECT_ID" ] && [ -n "$TARGET_KEY" ] || exit 1 ;;
  edit) [ -n "$SECRET_ID" ] || exit 1 ;;
  *) exit 2 ;;
esac
VALUE="$(command -p cat "$TASK_DIR/token" && printf x)" || exit 1  # sentinel preserves trailing newlines
VALUE="${VALUE%x}"
[ -n "$VALUE" ] || exit 1

case "$BWS_MODE" in
  create)
    BWS_ACCESS_TOKEN="$(command -p cat "$BWS_TOKEN_FILE")" \
      "$BWS_BIN" secret create -o json -- "$TARGET_KEY" "$VALUE" "$PROJECT_ID" \
      2>"$ERR_FILE" \
      | "$JQ_BIN" -er '.id | select(type == "string" and length > 0)' \
        2>>"$ERR_FILE" \
      || exit 1
    ;;
  edit)
    BWS_ACCESS_TOKEN="$(command -p cat "$BWS_TOKEN_FILE")" \
      "$BWS_BIN" secret edit -o none --value="$VALUE" -- "$SECRET_ID" \
      >/dev/null 2>"$ERR_FILE" || exit 1
    ;;
  *)
    exit 2
    ;;
esac
unset VALUE BWS_ACCESS_TOKEN
CHILD
}

case "${BWS_OPERATION:-create}" in
  create)
    SID="$(run_bws_value_child create)" || {
      echo "bws create failed; stderr withheld (it may echo the value)" >&2
      exit 1
    }
    [ -n "$SID" ] || exit 1
    unset SID
    ;;
  edit)
    SECRET_ID="${SECRET_ID:?set SECRET_ID to the target id}"
    run_bws_value_child edit || {
      echo "bws edit failed; stderr withheld (it may echo the value)" >&2
      exit 1
    }
    ;;
  *)
    exit 2
    ;;
esac
```

- Flags go before `--`; `--` goes before the first positional argument. For `secret edit`, `--value="$VALUE"` is one dash-leading token and `-- "$SECRET_ID"` closes option parsing. The two-token `--value "$VALUE"` form can parse a dash-leading value as an option and echo it in the error.
- Validate parser order before using a real secret: `bws secret create --help` confirms the positional shape, and a dummy `-----BEGIN …` value with an intentionally invalid project id can exercise parsing without creating anything. Redirect its stderr to the task directory and print only pass/fail, never the captured text.
- If a real remote dummy is unavoidable, delete it and verify by metadata that it is gone. Creating a disposable item permanently or printing its value is not part of validation.
- A create/edit that fails after echoing the value is an exposure event: stop treating the candidate as production material. Delete/rotate it, report the affected destination and scope, and **do not repeat the value, its length, prefix, or hash**.
- `SIGKILL`, a crash, or a host-level snapshot can still retain the value; the scrubbed child and top-level cleanup reduce the window, not the provider-side or disk-level retention.

## 5. Cleanup and rotation

- `unset BWS_ACCESS_TOKEN` and every variable holding a value, inside the same command; unlink any file the value passed through (best-effort — snapshots and backups may retain it).
- On suspected exposure the credential is burned: stop using it, rotate (`bws secret edit <id>` / `create`, or the web UI), **verify the old value now fails**, re-deploy every consumer (`EnvironmentFile=`, `--token-file`, restart the unit), and report the affected scope. Until that verification passes, the task is not complete.
