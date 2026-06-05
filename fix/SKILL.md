---
name: fix
description: Reproduce, diagnose, fix, and verify a frontend bug through an agent-driven feedback loop. Use when user describes a browser bug and wants a fix confirmed by automated regression testing plus manual approval. Triggers on "fix this bug", "reproduce then fix", "debug stream render", or similar fix-verify workflows.
---

# Fix Workflow

A feedback loop, not a linear process. The agent probes the runtime, infers root causes, fixes the bug, and iterates until the fix is proven.

Two tools, two phases. This is not a choice between tools — they solve different halves of the problem.

| Phase | Tool | Why |
|---|---|---|
| **Diagnose** | Chrome DevTools MCP | Interactive on-demand exploration. Agent inspects console, network, traces, and evaluates JS in the page one question at a time — no prewritten scripts, no bulk capture. |
| **Reproduce / Regress** | Playwright script | Deterministic batch run. `node reproduce.mjs` in seconds, exit code 0 or 1. Can run every regression script with a shell loop. Saved to git as a permanent artifact. |

Playwright diagnosis requires pre-capturing console, network, and DOM in bulk — most of it irrelevant to the actual bug. MCP pulls data on-demand, interactively, as the investigation narrows. Fall back to [`scripts/probe-template.mjs`](scripts/probe-template.mjs) when MCP is unavailable.

## Reproduce Script

The reproduce script lives at `tests/regression/<slug>.mjs`. It triggers the bug and asserts correct behavior. Over the feedback loop it matures from a minimal trigger into a full regression test. Scripts accumulate over time — CI can run all of them with `for f in tests/regression/*.mjs; do node "$f" || exit 1; done`.

Always start from [`scripts/reproduce-template.mjs`](scripts/reproduce-template.mjs). Fill in `pageUrl`, `setup`, and `assertions`. Never regenerate the template — fill blanks only.

The script uses [cac](https://github.com/cacjs/cac) for CLI. Runs as `node tests/regression/<slug>.mjs`. Accepts `--debug` for screenshots and DOM dumps. Exits 0 on success, 1 on failure.

**Run it once** to confirm the bug is reproducible before proceeding.

## Feedback Loop

1. **Understand** — if the bug description is ambiguous, ask clarifying questions. Do not proceed until both sides agree on what the bug is, how to trigger it, and what correct behavior looks like.
2. **Reproduce** — generate script, run it, confirm bug is live. If not triggerable, stop and ask user.
3. **Diagnose** — MCP (preferred) or probe script. If root cause not found, describe known/unknown and stop.
4. **Fix + Verify** — implement fix, run reproduce script. If it fails, iterate: probe → fix → verify.
5. **Manual Confirm** — always end here. Summarize changes, confirm scripts pass, ask user to verify in real browser.

---

**With Chrome DevTools MCP (preferred):**

### 2. Diagnose

**With Chrome DevTools MCP (preferred):**

- `take_snapshot` — page accessibility tree, fast text snapshot of current state
- `take_screenshot` — visual state
- `list_console_messages` — all console output including errors and warnings
- `list_network_requests` — all HTTP requests, responses, SSE events, WebSocket messages
- `evaluate_script` — run arbitrary JS in the page context (e.g. inspect internal state, call debug hooks)
- `performance_start_trace` / `performance_stop_trace` — record a DevTools trace for timeline/performance analysis

Workflow: navigate → trigger bug → inspect with these tools → form hypothesis → evaluate JS to test it → repeat.

**Fallback (no MCP):**

Generate a probe script from [`scripts/probe-template.mjs`](scripts/probe-template.mjs). Toggle only the capabilities needed to fill the diagnostic gap. Run it, read output, reason about root cause.

**If stuck:** describe what's known, what's unknown, and stop for user input.

### 3. Fix + Verify

Implement the fix. Run the reproduce script. If it passes, proceed to manual confirm. If it fails, iterate: diagnose why → adjust fix → re-verify. This loop may run several rounds.

### 4. Manual Confirm

**Always end here.** Summarize:
- What was changed and why
- Which scripts were generated/updated
- That the reproduce script now passes (it's a regression test going forward)

Then ask: **"Please manually confirm the fix in a real browser. Is it resolved?"**

Do NOT proceed past this step until the user says yes.
