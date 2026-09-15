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

## 4. Cleanup and rotation

- `unset BWS_ACCESS_TOKEN` and every variable holding a value, inside the same command; unlink any file the value passed through (best-effort — snapshots and backups may retain it).
- On suspected exposure the credential is burned: stop using it, rotate (`bws secret edit <id>` / `create`, or the web UI), **verify the old value now fails**, re-deploy every consumer (`EnvironmentFile=`, `--token-file`, restart the unit), and report the affected scope. Until that verification passes, the task is not complete.
