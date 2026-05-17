---
name: pdfsearch
description: Search Chinese PDF textbooks, papers, and documents by keyword. Use when the user asks about textbook content, wants to find topics in PDFs, references teaching materials, or needs to look up concepts across their PDF collection.
allowed-tools: Bash(pdfsearch *)
---

# pdfsearch

High-performance PDF full-text search with text indexing. Search indexed PDFs in milliseconds.

## Current directory status

!`pdfsearch --list --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'{d[\"total\"]} PDF(s) found') if d['total'] else print('No PDFs found')" 2>/dev/null || echo "No PDFs in current directory"`

If no PDFs are shown, ask the user where their PDFs are, then index them:

```
pdfsearch --index -d /path/to/pdfs
```

## Commands

**Search** (instant if indexed, otherwise falls back to on-the-fly search):
```
pdfsearch "关键词" -d /path/to/pdfs --json
```

**Read full page text** — use the `"file"` path from search results directly:
```
pdfsearch --file "/abs/path/to/file.pdf" --extract-page <page>
```

**Filter by filename** when the user mentions a specific book:
```
pdfsearch "关键词" --files "物理" -d /path/to/pdfs --json
```

**Search a single file by path**:
```
pdfsearch "关键词" --file /path/to/doc.pdf --json
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

- Always use `--json` — the output envelope has `matches`, `query`, `elapsed_ms`, `indexed`, `total_matches`
- Each match has `file` (absolute path) and `page` — use `--file <file> --extract-page <page>` to read full context
- After indexing, searches return in <100ms — don't mention performance unless asked
- When the user asks "what does X say about Y", search for `Y` and offer to read full pages for details
- Default search is case-insensitive; use `--case-sensitive` if needed
- For follow-up questions about a match, reading the full page with `--file --extract-page` is better than searching again
