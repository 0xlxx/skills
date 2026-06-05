---
name: fix
description: Reproduce, diagnose, fix, and verify a frontend bug through an agent-driven feedback loop. Use when user describes a browser bug and wants a fix confirmed by automated regression testing plus manual approval. Triggers on "fix this bug", "reproduce then fix", "debug stream render", or similar fix-verify workflows.
---

# Fix Workflow

A feedback loop, not a linear process. The agent writes scripts to probe the runtime, infers root causes from the data, fixes the bug, and iterates until the fix is proven. Two scripts co-evolve through the loop:

- **Reproduce script** (`tests/regression/<slug>.mjs`) — triggers the bug and asserts behavior. Starts minimal, grows precise across iterations, matures into a permanent regression test.
- **Probe script(s)** — collects runtime data (console, network, traces, call stacks). Generated on-demand when the reproduce output is insufficient to pinpoint root cause. May be discarded after use; fuse useful probes into the reproduce script for richer regression coverage.

## Probe Toolkit

The probe script is a single file built from the [`scripts/probe-template.mjs`](scripts/probe-template.mjs) toolbox. Enable only the capabilities needed for the current diagnostic gap. Available probes:

| Capability | Use when | How |
|---|---|---|
| Console capture | Unknown where an error originates, or need call-stack context | `page.on('console')` + `console.trace/warn/error` |
| Network intercept | Request/response shape is suspect, SSE/WS streaming involved | `page.route()` or `page.on('websocket')` |
| Playwright Trace | Timing, order-of-operations, or render-timing issues | `browser.startTracing()` / `context.tracing` |
| DOM snapshots | Need before/after state at specific moments | `page.screenshot()` / `page.content()` |

**Choosing probes:** after the reproduce script runs, assess what you know vs what you need. Generate a probe script that fills the gap. Never enable probes speculatively — each one adds runtime cost.

## Feedback Loop

```
Reproduce ──► Reproduce script passes?
   │                │
   │  yes           │  no (bug is live)
   │                ▼
   │         Data sufficient to
   │         diagnose root cause?
   │           │            │
   │           │ yes        │ no
   │           ▼            ▼
   │       Implement    Generate probe
   │       fix          script, collect
   │           │        missing data,
   │           │        re-evaluate
   │           │            │
   │           └────────────┘
   │                │
   ▼                ▼
Regression       Fix applied?
passes?            │ yes       │ no
   │               ▼           │
   │         Reproduce script  │
   │         passes?           │
   │           │       │       │
   │           │ yes   │ no    │
   │           ▼       ▼       │
   │       MANUAL   Diagnose   │
   │       CONFIRM  why, fix   │
   │                 │         │
   └─────────────────┘─────────┘
```

### 1. Reproduce

Generate the reproduce script from [`scripts/reproduce-template.mjs`](scripts/reproduce-template.mjs). Fill in `pageUrl`, `setup`, and `assertions`. Never regenerate the template — always start from the file and fill blanks. Token and reliability win.

The script uses [cac](https://github.com/cacjs/cac) for CLI. Runs as `node tests/regression/<slug>.mjs`. Accepts `--debug` for screenshots and DOM dumps. Exits 0 on success, 1 on failure.

**Run it once** to confirm the bug is reproducible before proceeding.

### 2. Diagnose

If the reproduce output and error message are enough to pinpoint root cause, go directly to the codebase to trace the faulty path and fix it.

If NOT enough — generate a probe script from [`scripts/probe-template.mjs`](scripts/probe-template.mjs), enabling only the relevant capabilities. Run it, read the output, and reason about root cause. Repeat with additional probes if still ambiguous.

**If stuck after reasonable effort:** describe what's known, what's still unknown, and stop for user input.

### 3. Fix + Verify

Implement the fix. Run the reproduce script. If it passes, proceed to manual confirm.

If it still fails, diagnose why (the fix was wrong, the assertion was wrong, or the probe revealed new information). Iterate: probe → diagnose → fix → verify. This loop may run several rounds — each one refines both scripts and narrows the problem.

### 4. Manual Confirm

**Always end here.** Summarize for the user:
- What was changed and why
- Which scripts were generated/updated (reproduce + any probes)
- That the reproduce script now passes (it's a regression test going forward)

Then ask: **"Please manually confirm the fix in a real browser. Is it resolved?"**

Do NOT proceed past this step until the user says yes.
