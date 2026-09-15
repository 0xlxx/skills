# Bitwarden Secrets Manager (`bws`)

`bws` is not the password vault: it is machine-scoped secrets addressed by key, authenticated by a **machine access token**. There is no interactive unlock, so the token is itself the credential to protect.

For the personal password vault (`bw status` / `bw get item` / `BW_SESSION`), use [bitwarden.md](bitwarden.md) instead.

## 1. Machine token

`bws` itself reads the token only from `$BWS_ACCESS_TOKEN` or `-t` (argv — avoid it). It does **not** read a token file automatically, so keep the token in a `0600` file yourself and load it into exactly one command:

```bash
BWS_ACCESS_TOKEN="$(cat "$HOME/.config/bws/access-token")" bws project list -o json | jq -r '.[].name'
```

- Verified: with the file present but `BWS_ACCESS_TOKEN` unset, `bws` exits with `Missing access token`.
- Presence check without printing: `[ -n "${BWS_ACCESS_TOKEN:-}" ]`.
- Never echo the token, never put it in a unit file, shell profile, or argv.
- After use: `unset BWS_ACCESS_TOKEN`.

## 2. Prefer `bws run` (broker form)

`bws run` injects a project's secrets into the child process environment only — no shell variable, no log line:

```bash
BWS_ACCESS_TOKEN="$(cat "$HOME/.config/bws/access-token")" \
  bws run --project-id "$PROJECT_ID" -- target-command --flag
```

- `bws run` strips `BWS_ACCESS_TOKEN` from the child environment (verified) — the child receives the project's secrets, not your machine token.
- Add `--no-inherit-env` to drop inherited variables too; it also drops `HOME`/`PATH`-style conveniences, so pass an absolute command path or re-provide what the child needs.
- `--uuids-as-keynames` switches env var names from key names to secret UUIDs.

## 3. One value

When a single value is needed, fetch that secret by id and select one field:

```bash
BWS_ACCESS_TOKEN="$(cat "$HOME/.config/bws/access-token")" \
  bws secret get "$SECRET_ID" -o json | jq -r '.value'
```

Rules:

- **Never run a bare `bws secret list`** — it prints every secret's value. If you must filter, do it in the same pipeline and never `tee` or redirect it into the repo:
  `bws secret list "$PROJECT_ID" -o json | jq -r '.[] | select(.key=="TARGET") | .value'`
- Find ids/keys first with metadata only (same `BWS_ACCESS_TOKEN="$(cat ~/.config/bws/access-token)"` prefix): `bws project list -o json | jq -r '.[].name'`, then `bws secret list "$PROJECT_ID" -o json | jq -r '.[] | {id, key}'`.
- `-o env` prints `KEY=value` lines — treat that output exactly like a raw secret.

## 4. Cleanup and rotation

- `unset BWS_ACCESS_TOKEN` and any variable holding a value.
- On suspected exposure: rotate the secret (`bws secret edit <id>` / `create`, or the web UI), verify the old value now fails, then re-deploy every consumer (`EnvironmentFile=`, `--token-file`, restart the unit) and state the affected scope.
