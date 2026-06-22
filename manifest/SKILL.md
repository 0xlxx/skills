---
name: manifest
description: 生成并维护 skills/GENERATION.md 溯源清单。当用户要求"更新 skill 清单"、"刷新 GENERATION.md"、"同步 skills"、"更新 generation.md"、"skill 需要更新了"，或项目文档变更后需要重新生成 skill 清单时使用。
---

<manifest>

<core-principle>
GENERATION.md 是一份**溯源清单**——记录每个 skill 从哪个 commit 生成、包含哪些文件、如何增量同步。它不是文档，是链接源文档和 skills 的锚，让"项目更新后哪些 skill 要跟着更新"变得可回答。
</core-principle>

<steps>
1. 定位源文档和 skills 目录
   完成标志：确认 skills/ 路径、源文档路径（docs/、README.md、CLAUDE.md）、当前 HEAD 的 commit SHA 和日期
2. 扫描每个 skill 的结构
   完成标志：每个 skill 的 SKILL.md、README.md、references/ 下的文件列表均已记录，每个 reference file 附带一句话描述
3. 差分——如果 skills/GENERATION.md 已存在，对比上次记录的 SHA 与当前 HEAD，列出源文档变更文件清单
   完成标志：`git diff <last-sha>..HEAD -- <source-docs>` 已执行，变更列表已整理
4. 生成或更新 GENERATION.md
   完成标志：所有必填段均已填充，版本历史已追加本次记录，文件写入 skills/GENERATION.md
</steps>

<rules>
- 每个 reference file 必须附带一句话描述——读第一段或核心内容概括，不可留空
- 文件命名惯例从实际文件名推断（如 guide-*、option-* 等前缀模式），不可编造
- 版本历史只追加新条目，不覆盖旧记录
- 如果 GENERATION.md 不存在，创建全新的；如果存在，基于差分更新——只改变更的部分
- 结构树和文件清单必须与实际文件系统一致，不可凭记忆编造
</rules>

<template>
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
</template>

</manifest>
