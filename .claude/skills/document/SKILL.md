---
name: document
description: 'Snapshot the decisions and reasoning from the current conversation into a self-contained Markdown file under /docs/. Use when the user says "document", "document this", "doc this up", "write this down", "save this decision", or invokes /document. The resulting file must let a future reader (or another Claude session) act on the captured decision without needing the conversation context.'
---

## Purpose

The user has made one or more decisions during this conversation (a design choice, an architectural pick, a chosen approach, etc.) and wants it persisted to `/docs/`. Write a single self-contained Markdown file so the decision survives outside the chat.

Self-contained means: a teammate or a fresh Claude session opening the file cold should understand the situation, the options that were on the table, what was picked, why, and what to do next — without reading the conversation.

## How to write the doc

### 1. Filename

`docs/<YYYY-MM-DD>-<kebab-slug>.md`

- Use today's date.
- Slug describes the topic in 3–6 words: e.g. `design-variants-skill-shape`, `ghostty-notifications-source`, `course-feature-folder-layout`.
- If `docs/` doesn't exist, create it.
- If a file with the same name already exists, append `-2`, `-3`, etc. Don't overwrite.

### 2. Skeleton

Write the file using this exact section structure. Omit a section only if it would be genuinely empty after honest effort (leave *Open questions* as a header even if empty).

```markdown
# <Title>

> <One-line summary of the decision>

**Date:** YYYY-MM-DD
**Status:** decided | open | superseded

## Context

Why this came up — the problem, trigger, and constraints. A reader who never saw the conversation should understand the situation in one short paragraph.

## Options considered

For each meaningful alternative:

- **Option A — short name**: what it is. Pros, cons, why it was on the table.
- **Option B — short name**: …
- **Option C — short name**: …

If only one option was seriously discussed, say so and note why alternatives weren't entertained.

## Decision

State the pick in a single sentence at the top of the section, then add any necessary detail.

## Rationale

Why this option beat the others. Reference specific tradeoffs from *Options considered* — don't just say "it's better."

## Implications / next steps

Concrete follow-ups: files to touch, conventions to adopt, things to remember when implementing. If the decision is already implemented, link the relevant files (use `path:line` format).

## Open questions

Anything unresolved, deferred, or to revisit. Empty is fine — leave the header so future-you knows it was considered.

## References

- Files: `path/to/file.ts:42`
- External: docs, issues, PRs, URLs
- Other docs: `docs/related.md`
```

### 3. What to put in each section

Pull only from the **current conversation**. Don't invent context.

- **Context**: the problem statement the user described, the why-now, any project constraints raised (existing libraries, conventions in `AGENTS.md`, performance, scope).
- **Options considered**: every alternative that came up — your suggestions, the user's counter-proposals, options surfaced via `AskUserQuestion`. If you used `AskUserQuestion`, the option labels and descriptions are first-class material for this section.
- **Decision**: the choice the user made or confirmed.
- **Rationale**: the actual reasoning, theirs and yours. If the user picked something for an aesthetic or pragmatic reason without a hard argument, write that honestly ("simpler footprint" beats inventing a rationale).
- **Implications / next steps**: anything someone implementing this needs to do or watch out for. If files were already created or edited as part of the decision, list them.
- **Open questions**: anything that was set aside, marked TODO, or that the user explicitly deferred.
- **References**: every file path, URL, library, command, or external doc that meaningfully informed the decision.

If the user said something ambiguous, surface it as an open question rather than guessing.

### 4. Tone

Terse and operational. This is a record, not a blog post. Bullets are fine. No recap of what each tool call did — only the decision and its reasoning.

### 5. After writing

Reply with one line: the path to the file created. Don't paste the file contents back.

## Notes

- Multiple decisions in one conversation → multiple files, one per topic. Don't pile unrelated decisions into a single doc.
- If the user says "document" right after several distinct decisions, ask which one (or "all") before creating files.
- Don't commit the new file unless the user asks.
