# GENERATION.md Template

以下为 GENERATION.md 的标准模板，严格按此结构生成：

```
# Skills Generation Information

This document contains information about how these skills were generated and how to keep them synchronized with the documentation.

## Generation Details

**Generated from documentation at:**

- **Commit SHA**: `<current-head-sha>`
- **Date**: `<yyyy-mm-dd>`
- **Commit**: `<commit-short-message>`

**Source documentation:**

- Main docs: `<source-docs-path>`
- Project README: `<readme-path>`
- CLAUDE.md: `<claude-md-path>`

**Generation date**: `<yyyy-mm-dd>`

## Structure

<directory-tree-of-skills/>

## File Naming Convention

<inferred-prefix-patterns>

## Reference Files

<categorized-file-inventory-with-one-line-descriptions>

## How to Update Skills

When <project> documentation changes:

### 1. Check for Documentation Changes

```bash
git diff <last-sha>..HEAD -- <source-docs>/
git diff --name-only <last-sha>..HEAD -- <source-docs>/
git log --oneline <last-sha>..HEAD -- <source-docs>/
```

### 2. Update Process

**For minor changes** (typos, clarifications):
- Update the relevant reference file in `references/`
- Update `SKILL.md` if the change affects quick reference tables

**For new features/options:**
- Add reference file in `references/` with appropriate prefix
- Add entry to relevant table in `SKILL.md`
- Update this file's reference list

**For breaking changes:**
- Update affected reference files
- Update `SKILL.md` examples
- Update `GENERATION.md` with new SHA

### 3. Update Checklist

- [ ] Read diff of docs since last generation
- [ ] Update affected files in `references/`
- [ ] Update `SKILL.md` tables and examples
- [ ] Update `references/README.md` file list
- [ ] Update this `GENERATION.md` with new SHA and date

## Style Guidelines

- Practical, actionable guidance
- Concise code examples
- Focus on common use cases
- Reference detailed docs for deep dives

## Version History

| Date       | SHA     | Changes |
| ---------- | ------- | ------- |
| <yyyy-mm-dd> | <sha> | <change-summary> |

---

Last updated: <yyyy-mm-dd>
Current SHA: <sha>
```
