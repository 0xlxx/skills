---
name: secret-handoff
description: Broker credentials and other sensitive data to an agent without exposing secret values in chat, command output, logs, or repositories. Use when a task needs a password, API key, token, SSH credential, Bitwarden/1Password/macOS Keychain entry, SSH Agent access, or when the user asks how to provide a secret safely (Bitwarden、密码、私钥、API token、敏感信息交接).
---

# Secret Handoff

Give the agent **access**, not the secret value: **broker, not paste**.

Assume prompts, tool calls, command arguments, terminal output, process environments, and logs may be retained. A secret is safe only when it stays inside a trusted broker or short-lived channel and the agent receives a success/failure result instead.

## First: classify the handoff

Before requesting anything, identify:

1. **Secret type**: SSH key, password, API token, cloud session, signing key, or encrypted file.
2. **Destination**: exact host, service, repository, or command allowed to use it.
3. **Scope**: the smallest operation needed, preferably one command or one session.
4. **Existing broker**: SSH Agent, OS Keychain, cloud credential helper, vault CLI, or an already-unlocked app session.

Use a broker when one exists. The user saying "use Bitwarden", "use 1Password", or "use my SSH Agent" authorizes reading a matching credential for the requested destination, not dumping the whole vault or using unrelated credentials.

## Preferred channels, in order

1. **Agent or broker**: `SSH_AUTH_SOCK`, `gpg-agent`, cloud credential helpers, vault CLI sessions, or an unlocked secret-manager app.
2. **Direct one-shot retrieval**: pipe a single value from a secret manager directly into the process that needs it.
3. **Temporary file**: only when the tool cannot consume stdin; create under a private temp directory with mode `0600`, use once, then truncate and unlink.
4. **Pasted into chat**: never. If the user already pasted a secret, do not repeat it; recommend rotation and continue through a broker.

Do not export a private SSH key when an SSH Agent can sign for it. Do not copy an entire vault item when one field is needed.

## Safe execution rules

- Report only metadata: source, item name/ID, destination, scope, and `present`/`missing`.
- Check a secret's presence without printing it: `[ -n "${TOKEN:-}" ]`, `security find-generic-password ... >/dev/null`, `ssh-add -L`, or vault item metadata.
- Keep secrets out of command text and shell history. Read them from a broker or file into a shell variable inside the same command.
- Prefer stdin or file descriptors over process arguments. Short-lived environment variables are acceptable when the tool provides no better mechanism; unset them immediately.
- Disable tracing around secret handling. Do not print the value with `echo`, `printf`, `cat`, debug logs, or error dumps; reading a file into a variable or piping bytes to the intended tool is fine.
- Do not run commands that enumerate process environments, such as `ps e`/`ps eww`; they can expose secrets from unrelated processes.
- Filter structured secret-manager output with `jq` or an equivalent selector and extract only the required field.
- Avoid `--help`/debug modes that echo credentials, and avoid retry loops that repeatedly expose the same value.
- Before any external mutation, state the exact destination and operation. Reading a credential does not authorize deploying, messaging, purchasing, or changing permissions elsewhere.

## Standard workflow

1. **Probe channels**: check for an existing agent/session/keychain entry without printing values.
2. **Ask for the minimum access**: if a vault is locked, ask the user to unlock it or place a one-shot session in a `0600` file—not to paste the credential.
3. **Select one field**: retrieve only the matching item and only the required username/password/token/key field.
4. **Use once**: inject it directly into the target command with the narrowest destination and scope.
5. **Verify through a side effect**: check hostname, HTTP status, deployed file hash, or authenticated success message—not the secret itself.
6. **Clean up**: unset variables, truncate secret files, unlink them, and close or revoke temporary sessions when possible.

If no trusted channel exists, stop and ask the user to choose a broker or create one. Do not fall back to chat or a repository file.

## Common patterns

### SSH

Use the agent:

```bash
SSH_AUTH_SOCK="${SSH_AUTH_SOCK:?SSH agent unavailable}" \
  ssh -o BatchMode=yes -o IdentitiesOnly=no user@host 'hostname'
```

`ssh-add -L` may print public keys only. Never run `ssh-add -L` expecting private material, and never ask the user to paste a private key.

### OS Keychain

Retrieve directly into a variable or stdin; do not print it:

```bash
SECRET="$(security find-generic-password -s 'service-name' -w)"
target-command --token-stdin <<<"$SECRET"
unset SECRET
```

The command above must be adapted to the tool. If the tool lacks `--token-stdin`, prefer its credential-file/helper option over placing the token in argv.

### One-shot session file

This is appropriate when a vault CLI needs a session token and the user must unlock interactively:

```bash
umask 077
mkdir -p "$HOME/.vpsmonitor"
bw unlock --raw > "$HOME/.vpsmonitor/bw_session"
```

The user performs the unlock; the agent reads the file. After use, overwrite/truncate the file and unlink it. Never ask the user to paste the session token into chat.

## Bitwarden

For Bitwarden-specific status, unlock, item-selection, extraction, and SSH Agent recipes, read [`references/bitwarden.md`](references/bitwarden.md).

## Completion criteria

The task is complete only when all are true:

- The target operation succeeded for the requested destination.
- The secret value never appeared in the transcript or command output.
- No temporary secret file remains.
- Temporary environment variables and sessions are cleared.
- The final report contains only non-secret evidence and any required revocation/rotation note.
