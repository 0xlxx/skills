---
name: secret-handoff
description: Broker an existing credential to an agent without exposing its value in chat, command output, logs, argv, or the repo. Use when a task needs the agent to obtain or use a password, API key, token, SSH credential, cloud session, or vault entry — Bitwarden CLI (`bw`), Bitwarden Secrets Manager (`bws`), 1Password, macOS Keychain, SSH Agent — or when the user asks how to hand over a secret safely (Bitwarden、Secrets Manager、密码、私钥、API token、敏感信息交接). Not for writing code that merely handles credentials (auth flows, hashing, rotation logic).
---

# Secret Handoff

Give the agent **access**, not the secret value: **broker, not paste**.

Assume prompts, tool calls, command arguments, process environments, and logs are retained. A secret is safe only while it stays inside a trusted broker or a short-lived channel — the agent should receive a success/failure result, never the bytes.

## 1. Classify the handoff

Pin these down before requesting anything:

1. **Secret type** — SSH key, password, API token, cloud session, signing key, encrypted file.
2. **Destination** — the exact host, service, repository, or command allowed to receive it.
3. **Scope** — the smallest operation that finishes the task, ideally one command or one session.
4. **Existing broker** — SSH Agent, OS Keychain, cloud credential helper, vault CLI, or an already-unlocked app session.

"The user said use Bitwarden" authorizes reading a matching credential for the requested destination — not dumping the vault, not using unrelated items.

## 2. Prefer a broker over the value

1. **Signing agent or broker** — `SSH_AUTH_SOCK`, `gpg-agent`, cloud credential helpers, vault CLI sessions, `bws run`, an unlocked desktop app.
2. **One-shot retrieval** — pull a single field from the secret manager straight into the process that needs it.
3. **Temporary file** — only when the tool cannot consume stdin; private dir, mode `0600`, used once, then truncated and unlinked.
4. **Pasted into chat** — never. If the user already pasted one, don't repeat it, recommend rotation, and continue through a broker.

Don't export a private key when an agent can sign with it; don't copy a whole vault item when one field is needed.

## 3. Ask for the minimum, in the user's terminal

When a broker needs an unlock, or a value must be placed, give the user a command to run **in their own terminal** — never "paste it here". Keep the path predictable and private:

```bash
DIR="${XDG_CACHE_HOME:-$HOME/.cache}/secret-handoff"; umask 077; mkdir -p "$DIR"
# 一次性 token / 密码：用户在自己的终端里交互输入，不回显、不进 history、不进 argv
printf 'secret (input hidden): ' >&2; IFS= read -rs TOKEN
printf '%s' "$TOKEN" > "$DIR/<scope>.token"; unset TOKEN
# 解锁会话文件（Bitwarden CLI）：主密码在提示符输入，不回显
bw unlock --raw > "$DIR/bw_session"
```

Ask for the **path**, not the value. If the user pastes a secret anyway: don't echo it, tell them to rotate, and continue via the file/broker.

## 4. Execute safely

- Report only metadata: source, item name/ID, destination, scope, and `present`/`missing`.
- Check presence without printing: `[ -n "${TOKEN:-}" ]`, `security find-generic-password ... >/dev/null`, `ssh-add -l`, `bws project list`, vault item metadata.
- Keep values out of command text, argv, and shell history: read into a variable inside the same command, prefer stdin / file-descriptor / helper options over arguments, and `unset` immediately after use. Short-lived environment variables are acceptable when the tool offers nothing better.
- Disable tracing while a secret is in scope (`set +x`), and never `echo` / `printf` / `cat` / `tee` / debug-log a value.
- Never put a secret in a URL or query string, and never run `curl -v` / `--debug` / tool debug modes that echo headers or bodies.
- Never dump an unfiltered vault listing: `bw list items` and `bws secret list` print values. Select the one field with `jq` in the same pipeline.
- Don't enumerate process environments (`ps e`, `ps eww`) — they can expose unrelated secrets.
- State the exact destination and operation before any external mutation. Reading a credential does not authorize deploying, messaging, purchasing, or changing permissions elsewhere.

## 5. Persisted credentials

Some tools need a credential on disk (systemd `EnvironmentFile=`, `--token-file`, `~/.pgpass`, docker/git credential stores). That is allowed when the tool has no better mechanism, but then:

- install it `0600` (root-owned for services) at the tool's expected path — not in the repo, not in a shell profile;
- prefer what the daemon reads (`EnvironmentFile=`, `--token-file`) over `Environment=` or argv, which other processes can see;
- confirm git ignores it — `git check-ignore -v <path>` must print a matching rule; if it prints nothing, fix `.gitignore` before writing the credential;
- record what it is, where it came from, and how it rotates, so cleanup isn't guesswork.

## 6. Standard workflow

1. **Probe channels** — check for an existing agent/session/keychain entry without printing values.
2. **Ask for the minimum access** — unlock the vault, or have the user place a one-shot `0600` file (template above).
3. **Select one field** — retrieve only the matching item, and only the needed username/password/token/key field.
4. **Use once** — inject directly into the target command, narrowest destination and scope.
5. **Verify by side effect** — hostname, HTTP status, deployed file hash, authenticated success message; never the secret itself.
6. **Clean up** — unset variables, truncate + unlink secret files, close or revoke temporary sessions.

If no trusted channel exists, stop and ask the user to choose or create a broker. Do not fall back to chat or a repository file.

## 7. Vault references

- Bitwarden CLI (`bw`) — status, unlock, item selection, SSH agent: [`references/bitwarden.md`](references/bitwarden.md)
- Bitwarden Secrets Manager (`bws`) — machine token, `bws run`, per-key extraction: [`references/bitwarden-secrets.md`](references/bitwarden-secrets.md)
- Concrete recipes (SSH agent, macOS Keychain, one-shot session file): [`references/patterns.md`](references/patterns.md)

## Completion criteria

The task is done only when all of these hold:

- The target operation succeeded for the requested destination.
- The secret value never appeared in the transcript, tool-call arguments, or command output.
- No temporary secret file remains; temporary variables and sessions are cleared.
- The final report contains only non-secret evidence, plus any required rotation/revocation note.
