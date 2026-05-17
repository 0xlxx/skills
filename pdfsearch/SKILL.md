---
name: pdfsearch
description: Search Chinese PDF textbooks, papers, and documents by keyword. Use when the user asks about textbook content, wants to find topics in PDFs, references teaching materials, or needs to look up concepts across their PDF collection.
allowed-tools: Bash(pdfsearch *)
---

# pdfsearch

High-performance PDF full-text search with text indexing. Search indexed PDFs in milliseconds.

## Current directory status

!`pdfsearch --list 2>/dev/null | head -20`

If no PDFs are shown or the directory is wrong, ask the user where their PDFs are located, then index them:

```
pdfsearch --index -d /path/to/pdfs
```

## Commands

**Search** (instant if indexed, otherwise falls back to on-the-fly search):
```
pdfsearch "关键词" -d /path/to/pdfs --json
```

**Read full page text** when you need more context around a match:
```
pdfsearch --extract-page <page> -d /path/to/pdfs
```

**Filter by filename** when the user mentions a specific book:
```
pdfsearch "关键词" --files "物理" -d /path/to/pdfs --json
```

**Regex search** for patterns:
```
pdfsearch "pattern" -r -d /path/to/pdfs --json
```

**Context lines** around each match:
```
pdfsearch "关键词" -c 3 -d /path/to/pdfs --json
```

**Rebuild index** after adding or modifying PDFs:
```
pdfsearch --reindex -d /path/to/pdfs
```

## Guidelines

- Always use `--json` for structured output you can parse
- After indexing, searches return in <100ms — don't mention performance unless asked
- When the user asks "what does X say about Y", search for `Y` and offer to read full pages for details
- If results mention a specific page, use `--extract-page` to read the full page
- Default search is case-insensitive; use `--case-sensitive` if needed
- For follow-up questions about a match, reading the full page is better than searching again
