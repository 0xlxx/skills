# Bitwarden secret handoff

Use Bitwarden as a broker. Read the requested item, extract only the needed field, and keep the value out of chat and logs.

## 1. Check state without exposing secrets

```bash
bw status
printf 'BW_SESSION=%s\n' "${BW_SESSION:+set}"
printf 'SSH_AUTH_SOCK=%s\n' "${SSH_AUTH_SOCK:+set}"
ssh-add -l 2>/dev/null || true
```

`ssh-add -l` lists public key fingerprints and comments only. That metadata is safe to inspect.

Do not treat the macOS Keychain item named `Bitwarden` as a master password. It is commonly the desktop app's OAuth access/refresh token and cannot unlock the CLI vault by itself.

## 2. Choose the narrowest channel

### SSH credentials

Prefer Bitwarden SSH Agent:

```bash
SSH_AUTH_SOCK="${SSH_AUTH_SOCK:?Bitwarden SSH Agent is not configured}" \
  ssh -o BatchMode=yes -o IdentitiesOnly=no user@host 'hostname'
```

If the agent exposes several keys, identify the intended key by fingerprint/public comment and let the user choose. Do not export or print private keys from the vault when the agent can sign.

### Passwords and API tokens

Use an unlocked Bitwarden CLI session. If the CLI is locked, ask the user to create a one-shot session file:

```bash
umask 077
mkdir -p "$HOME/.vpsmonitor"
bw unlock --raw > "$HOME/.vpsmonitor/bw_session"
```

Then keep the session in a process-local variable:

```bash
SESSION_FILE="${HOME}/.vpsmonitor/bw_session"
BW_SESSION="$(cat "$SESSION_FILE")"
export BW_SESSION
```

Do not print `BW_SESSION` and do not paste it into chat.

## 3. Locate one item

Search for the exact target and print metadata only:

```bash
bw list items --search '<host-or-service>' | \
  jq -c '.[] | {id, name, type, uris: [.login.uris[]?.uri]}'
```

Rules:

- Use a specific query: host, service, account, or item name.
- Do not run unfiltered `bw list items` or dump the vault.
- If multiple items match, ask the user to select by non-secret metadata such as name or ID.
- Do not print the raw JSON for a login item; it contains the password.

## 4. Extract only the needed field

After the user or search identifies the item ID, fetch it once and select one field:

```bash
ITEM_ID='<item-id>'
ITEM_JSON="$(bw get item "$ITEM_ID")"
PASSWORD="$(printf '%s' "$ITEM_JSON" | jq -r '.login.password')"
```

Use the value immediately through the safest supported input mechanism:

```bash
target-command --password-stdin <<<"$PASSWORD"
```

Then clear local values:

```bash
unset ITEM_JSON PASSWORD
```

For custom fields or SSH-key items, inspect only the field names first. Then select the exact JSON path, such as `.fields[] | select(.name == "token") | .value` or `.sshKey.privateKey`.

## 5. Execute and verify

Use the credential for the authorized destination only. Verify with a non-secret result such as `hostname`, an authenticated API status code, a successful deployment hash, or a service health check.

Do not echo the credential in a command, include it in a URL, or pass it in argv when a stdin/file/helper option exists.

## 6. Clean up

After the operation succeeds or fails:

```bash
unset BW_SESSION ITEM_JSON PASSWORD
if [ -f "$SESSION_FILE" ]; then
  truncate -s 0 "$SESSION_FILE"
  unlink "$SESSION_FILE"
fi
```

Confirm cleanup with `test ! -e "$SESSION_FILE"`. If the credential was exposed to a third-party or log, recommend rotation and state the affected scope.
