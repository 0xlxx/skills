---
name: take
description: Pick up a handoff document from a previous session and continue where it left off. Use when the user says "take", "/take", "pick up where we left off", "continue last session", "resume handoff", or wants to resume work from a prior agent session.
argument-hint: "--list | --all | [name]"
---

# Take

Resume work from a handoff document written by the `handoff` skill.

## Quick start

```
/take                  # newest handoff for current project
/take --list           # list current project handoffs, pick one
/take --all            # list all handoffs across projects
/take blog-handoff-2026-01-15.md  # exact filename
```

## Workflow

When this skill is invoked, do the following in order:

## 1. Find handoff files

Search both `$TMPDIR` and `/tmp/` — handoff files can appear in either:

```bash
{ ls -t "${TMPDIR}"*-handoff-*.md 2>/dev/null; ls -t /tmp/*-handoff-*.md 2>/dev/null; } | sort -u
```

On macOS `$TMPDIR` is typically `/var/folders/.../T/`; on Linux it's often unset or `/tmp/`. The handoff skill may write to either location, so always check both.

## 2. Determine which file to read

Parse the user's argument:

| Argument | Behavior |
|---|---|
| *(none)* | Filter to files matching the **current project** (derived from the basename of the current working directory). Among matches, pick the newest by modification time. |
| `--list` | Filter to current project. List all matching files with mtime, size, and first heading. Let the user pick. |
| `--all` | List ALL handoff files in the temp directory (regardless of project). |
| `<name>` | Exact filename match (e.g. `mist-handoff-2026-05-25.md`). |

Project matching rule: the filename must start with the current directory basename followed by `-handoff-`. Example: in `/Users/bjorn/ai-dev/mist`, the prefix is `mist-handoff-`.

## 3. Read and act

Read the selected file. Then:

- Summarise the handoff in 2–3 sentences (what was being worked on, current state).
- If the handoff lists remaining tasks: start working on the first one.
- If the handoff lists manual verification steps: ask the user which they want to do first.
- If the handoff suggests skills: mention that those skills are available and load them when relevant.
- Do NOT re-explain anything the handoff already covers — just pick up and continue.

## 4. Clean up (optional)

After the user confirms the handoff was useful, ask whether to delete the handoff file. Never delete without asking.
