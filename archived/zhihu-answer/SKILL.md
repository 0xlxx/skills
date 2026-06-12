---
name: zhihu-answer
description: Draft Zhihu answers in the user's voice from a real Zhihu question URL or pasted question. Use when the user asks to answer a Zhihu question, says "试一下这题", "帮我回答这个问题", "用我的语气和风格回答", or otherwise wants a Markdown Zhihu answer grounded in the local Knowledge corpus, prior high-upvote Zhihu answers, qmd search, and Wiki concepts.
---

# Zhihu Answer

> **来源:** [CatChen/gist](https://gist.github.com/CatChen/12633a7fe6916d1a89aa103689726c9e) — 感谢 CatChen 的原始工作流设计。

## Overview

Draft a Zhihu answer that grows out of the user's previous writing rather than a generic answer. The workflow is: read the real question, search prior writing, inspect relevant Wiki concepts and sources, assess whether the question fits the user's demonstrated Zhihu strengths, summarize the user's stance and style, then draft the answer.

Use [references/zhihu-persona.md](references/zhihu-persona.md) as the default persona and fit reference. It is a heuristic map, not a substitute for live corpus search.

## Workflow

### 1. Read the Question

Use Chrome for Zhihu URLs when available.

- Open the question URL in Chrome.
- Click "显示全部" or otherwise expand the question description.
- Extract the title, full question description, linked material, and high-signal answer directions.
- If the description contains links, open them when they likely clarify the question. Do not let linked material dominate when it is tangential; most readers react to the question stem.
- If Chrome is unavailable, use web/search/local fallbacks and clearly state the limitation.

### 2. Search Prior Writing

Extract one to three Chinese keywords from the question. Use qmd to search these keywords in the `knowledge` collection.

- Prefer results under `Zhihu/` because these are imported high-upvote Zhihu answers.
- Also use other relevant directories when they provide stronger or more recent context.
- If qmd semantic search fails, pivot to lexical qmd search. For direct filesystem search, prefer `rg` when available; if `rg` is not installed, use `grep`, `find`, or other available local search tools.
- Retrieve the actual source documents for useful hits, not only summaries, when wording, links, or voice matter.
- Report the searched keywords and only the useful information found. Exclude noise.

### 3. Read Wiki Concepts

Read `Wiki/index.md` and inspect the `## Concepts` list for related concepts.

- Read relevant `Wiki/Concepts/*.md` files.
- For each useful concept, inspect its `## Sources` list and read the cited summary/source files that materially help the answer.
- Use these notes as the knowledge base for the draft.
- Report useful concept/source information. Exclude irrelevant concepts even if they matched keywords.

### 4. Assess Fit

After reading the question and searching prior writing, classify the question as strong fit, partial fit, or weak fit for the user's demonstrated Zhihu strengths.

Read `references/zhihu-persona.md` before making this call, then use the current search results as the deciding evidence. Keep the classification brief and evidence-backed.

- For strong fit, continue normally.
- For partial fit, continue drafting, but clearly distinguish corpus-grounded claims from new inference.
- For weak fit, pause before drafting and ask the user whether to continue in the user's mechanism-analysis voice, switch to a more generic/source-driven answer, or skip the question.

### 5. Synthesize Stance and Style

Before drafting, summarize:

- The user's values relevant to this question.
- The user's prior related positions, including links to prior Zhihu answers when useful.
- The user's writing style for this topic.

Use `references/zhihu-persona.md` for persona, values, topic affinity, fit levels, and style heuristics. Do not repeat the reference mechanically or treat it as fixed conclusions; the current question and retrieved corpus evidence take priority.

### 6. Draft the Answer

Write a complete Zhihu answer in Markdown.

- Do not assume the answer must agree with prior writing. It may reinforce, update, or invert earlier views when the new question calls for it.
- Embed links to the user's prior Zhihu answers when they directly support the argument.
- The answer should be polished enough for the user to paste into Zhihu after review.
