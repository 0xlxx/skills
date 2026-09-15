# Handoff patterns

Concrete recipes for the channels in the main skill. Every one keeps the value out of argv, chat, and logs.

## SSH: sign with the agent

```bash
[ -n "${SSH_AUTH_SOCK:-}" ] || { echo 'SSH agent unavailable'; exit 1; }
ssh-add -l >/dev/null 2>&1 || { echo 'agent has no identities'; exit 1; }
ssh -o BatchMode=yes user@host 'hostname'
```

`ssh-add -l` (fingerprints) and `ssh-add -L` (public keys) are public metadata only — never ask the user to paste a private key. With several agent keys, choose by fingerprint/comment with the user; use `-o IdentitiesOnly=yes -i <key-file>` only when selecting a specific file.

## macOS Keychain: read one field into the command

```bash
SECRET="$(security find-generic-password -s 'service-name' -w)"
target-command --token-stdin <<<"$SECRET"
unset SECRET
```

If the tool has no stdin/credential-file option, prefer its file or helper option over argv.

## One-shot session file

```bash
umask 077; mkdir -p "${XDG_CACHE_HOME:-$HOME/.cache}/secret-handoff"
bw unlock --raw > "${XDG_CACHE_HOME:-$HOME/.cache}/secret-handoff/bw_session"
```

The user unlocks; the agent reads the path. Cleanup: `unset BW_SESSION`, then truncate + unlink — fall back to `: > "$file"` where `truncate` is unavailable.
