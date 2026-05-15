---
name: readme-direct
description: Write and review README files that get straight to the point — installation commands first, clear problem/solution, no fluff. Use when writing, reviewing, or improving README files.
---

# readme-direct

## Philosophy

When someone finds your project, they want a ready-to-use solution. Every second you spend explaining your architecture, benchmarks, or how complex the codebase is wastes their attention. They didn't come to admire your work — they came to solve a problem.

**The golden rule:** a README should answer three questions in order:
1. What problem does this solve?
2. How do I install it?
3. How do I use it?

Everything else is noise.

## When to Use

Use this skill when:
- Writing a new README from scratch
- Reviewing an existing README for improvement
- User asks to "improve the README" or "make the README better"
- Reviewing PRs that include README changes

## README Structure

### 1. Title + One-Liner
A clear project name and a single sentence describing what it does. No taglines, no marketing.

```markdown
# project-name

A lightweight tool that converts Markdown files to PDF.
```

### 2. Installation (IMMEDIATELY after the title)
The first substantive content. Give the user the exact command they need to get started. Don't explain prerequisites unless truly unusual.

```markdown
## Install

brew install project-name
```

Or:

```markdown
## Install

npm install project-name
```

If there are multiple platforms, list them concisely:

```markdown
## Install

# macOS
brew install project-name

# Linux
sudo apt install project-name

# npm
npm install project-name
```

**Never** lead into installation with paragraphs about the project's history, design philosophy, or how many stars similar projects have.

### 3. Quick Start / Usage
A minimal example showing the most common use case. The user should be able to copy, paste, and get a result in under 30 seconds.

```markdown
## Usage

project-name input.md -o output.pdf
```

If the tool requires configuration, show the minimal config first. Full options go in a reference section later.

### 4. Why This Exists (optional, keep it brief)
Only include this if the problem space is genuinely crowded. Two sentences max. The goal is helping users understand whether this is the right tool, not defending your technical choices.

```markdown
## Why

Unlike pandoc, project-name focuses exclusively on Markdown-to-PDF and produces pixel-perfect results with zero configuration.
```

### 5. API / Configuration Reference (if needed)
Put detailed documentation at the end. Most users will never read this far, and that's fine — those who need it will find it.

## What to Remove

When reviewing a README, cut these aggressively:

- **Architecture diagrams** — They don't help users use the tool. Put these in CONTRIBUTING.md or docs/.
- **Benchmarks and comparisons** — If your project is niche, there are no real competitors, so benchmarks prove nothing. If your project is popular, people already know about it. Either way, they're noise in the README.
- **"Why I built this" stories** — Put personal motivation in a blog post. The README is for users, not memoirs.
- **Feature lists with checkmarks** — Show features through usage examples instead.
- **Star counts, download badges, "used by" logos** — Social proof at the top distracts from the task. Keep badges minimal and push them below the fold.
- **Contributor guidelines in the README** — Link to CONTRIBUTING.md.
- **"This project is" paragraphs** — If the title and one-liner don't already convey what it is, fix those instead of writing a paragraph.

## A Note on Niche Projects

If your project is a niche tool, you don't need to convince people it's good — they already searched for it and found it. The competition doesn't exist. Your README should simply tell them:
1. Whether this solves their specific problem
2. How to get it running

Anything beyond that is ego, not documentation.

## Review Checklist

When reviewing a README, ask:

```
Can I install and use this project within 30 seconds of landing on the page?
```

If the answer is no, the README needs work. The fix is almost always: **move the install command higher**.

## Common Patterns from Chinese Developers

A recurring issue in repos from Chinese developers (even with English READMEs): the README leads with architecture, design patterns, benchmark charts, and long explanations of technical decisions. This likely stems from a cultural emphasis on demonstrating technical depth. But to an international audience, it reads as avoidance of the one thing users want: the install command.

If you see this pattern, don't criticize the author. Just restructure:
- Move the first install/usage line to the top
- Move architecture to a separate docs/ file
- Move benchmarks to a separate docs/ file (or remove them)

The project speaks for itself once the user can run it.
