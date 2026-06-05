---
name: fix
description: Reproduce, diagnose, fix, and verify a frontend bug with a reusable Playwright regression script. Use when user describes a browser bug and wants a fix confirmed by automated regression testing plus manual approval. Triggers on "fix this bug", "reproduce then fix", "debug stream render", or similar fix-verify workflows.
---

# Fix Workflow

Reproduce → Diagnose → Fix → Verify → Manual confirm. Every fix ends with a reusable Playwright regression script and a prompt for the user to manually approve.

## Process

### 1. Reproduce

Generate a standalone Playwright script at `tests/regression/<slug>.mjs` that reproduces the bug.

**Why standalone .mjs:** no test framework dependency, runs with `node`, works in any project.

Use the template at [`scripts/reproduce-template.mjs`](scripts/reproduce-template.mjs). Fill in:
- `pageUrl` — the URL to navigate to
- `setup` — actions to trigger the bug (clicks, inputs, waits)
- `assertions` — what SHOULD be true; the script fails if this is violated at any point

The script MUST:
- Run with `node tests/regression/<slug>.mjs`
- Accept `--debug` for screenshots and DOM dumps
- Exit 0 on success, 1 on failure

**Token saving:** never regenerate the template — always start from `scripts/reproduce-template.mjs` and fill in the blanks. After first generation, the script lives in the project as a permanent regression test.

**Run the script once to confirm it reproduces the bug before proceeding.**

### 2. Diagnose

Explore the codebase to find the root cause. Trace the rendering/data-flow path relevant to the bug. If the cause is not found, stop and describe what's known and what's unknown — let the user decide next steps.

### 3. Fix + Verify

Implement the fix. Then run the regression script to confirm it passes:

```
node tests/regression/<slug>.mjs
```

If the script still fails, describe what's happening and stop for user input.

### 4. Manual Confirm

**Always end here.** Tell the user:
- What was changed and why
- That the regression script now passes
- Ask: "Please manually confirm the fix in a real browser. Is it resolved?"

Do NOT proceed past this step until the user confirms.
