---
name: fix
description: Reproduce, diagnose, fix, and verify a frontend bug through an agent-driven feedback loop. Use when user describes a browser bug and wants a fix confirmed by automated regression testing plus manual approval. Triggers on "fix this bug", "reproduce then fix", "debug stream render", or similar fix-verify workflows.
---

# Fix Workflow

A feedback loop, not a linear process. The agent writes scripts to probe the runtime, infers root causes from the data, fixes the bug, and iterates until the fix is proven.

Two tools, two phases. This is not a choice between tools — they solve different halves of the problem.

| Phase | Tool | Why |
|---|---|---|
| **Diagnose** | Chrome DevTools MCP | Interactive exploration. Agent calls `list_console_messages`, `evaluate_script`, etc. on-demand — each call returns 200-500 tokens of focused data. No prewritten scripts, no guessing what to capture. |
| **Reproduce / Regress** | Playwright script | Deterministic batch run. `node reproduce.mjs` in 2 seconds flat, exit code 0 or 1. Can run 50 regression scripts with a shell loop. Saved to git as a permanent artifact. |

Playwright diagnosis would pre-capture console, network, DOM all at once (~2000+ tokens, most irrelevant). MCP pulls data on-demand, 200-500 tokens per question. Fall back to [`scripts/probe-template.mjs`](scripts/probe-template.mjs) when MCP is unavailable.

## Reproduce Script

The reproduce script lives at `tests/regression/<slug>.mjs`. It triggers the bug and asserts correct behavior. Over the feedback loop it matures from a minimal trigger into a full regression test. Scripts accumulate over time — CI can run all of them with `for f in tests/regression/*.mjs; do node "$f" || exit 1; done`.

Always start from [`scripts/reproduce-template.mjs`](scripts/reproduce-template.mjs). Fill in `pageUrl`, `setup`, and `assertions`. Never regenerate the template — fill blanks only. Token and reliability win.

The script uses [cac](https://github.com/cacjs/cac) for CLI. Runs as `node tests/regression/<slug>.mjs`. Accepts `--debug` for screenshots and DOM dumps. Exits 0 on success, 1 on failure.

**Run it once** to confirm the bug is reproducible before proceeding.

## Feedback Loop

```
Reproduce script run
       │
       ▼
  Bug reproduced?
   │          │
   │ yes      │ no ─── STOP: bug not triggerable
   ▼
  MCP available?
   │          │
   │ yes      │ no
   ▼          ▼
MCP         Probe
diagnosis   script
   │          │
   └────┬─────┘
        ▼
  Root cause found?
   │          │
   │ yes      │ no ─── STOP: describe known/unknown, ask user
   ▼
  Implement fix
       │
       ▼
  Reproduce script passes?
   │          │
   │ yes      │ no ─── iterate: probe → fix → verify
   ▼
  MANUAL CONFIRM
```

### 1. Reproduce

Generate the reproduce script. Run it. Confirm the bug is live.

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
