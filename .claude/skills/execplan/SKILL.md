---
name: execplan
description: Design an ExecPlan (executable specification) before implementing a non-trivial feature or refactor. Use when the user wants to plan/spec/design before coding — triggers include "let's plan", "design a plan for", "write an ExecPlan for", "spec this out before we implement", "make a plan for the X refactor", "plan out the migration", and any greenfield feature or refactor that the user signals should start with a design doc rather than code edits.
---

# ExecPlan

An ExecPlan is a single self-contained design document that a coding agent (or human novice with no prior repo context) can follow top-to-bottom to deliver a working, observable feature.

## When this skill fires

The user has signaled they want to design before implementing. Your job is to produce an ExecPlan, save it, and — only after the plan is approved — execute against it. Do not begin implementation until the user has reviewed and approved the plan.

## Where new plans go

Save every new plan as:

    .agents/skills/execplan/plans/<short-kebab-case-name>-<YYYY-MM-DD>.md

(or via the symlink: `.claude/skills/execplan/plans/...`).

Use today's absolute date — never relative ("Friday"). One plan per file. Never overwrite an existing plan; bump the date or add a `-v2` suffix.

## Non-negotiable rules

These come from `references/PLANS.md`. Follow them to the letter.

1. **Self-contained.** A novice with no prior context can read the plan top-to-bottom and succeed. Do not say "as in the previous plan" — embed everything they need.
2. **Living document.** As work proceeds, you (or whoever picks it up) MUST keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` up to date. Those four sections are mandatory.
3. **Outcome-focused.** Acceptance is phrased as observable behavior ("after starting the server, GET /health returns 200 OK"), not internal attributes ("added a HealthCheck struct").
4. **Define every term inline.** If you use jargon ("middleware", "RPC gateway"), define it the first time it appears and name where it manifests in this repo.
5. **No external pointers.** Do not say "see the architecture doc" or link to blog posts. Embed the relevant content.
6. **Format envelope.** When the file's content IS the plan (e.g., a `.md` file containing only the plan), omit outer triple-backtick fences. Use indentation for inner code/transcripts so you don't prematurely close fences.
7. **Prose first.** Write paragraphs, not bullet lists. Lists are allowed in `Progress` (mandatory checkboxes there) and where brevity demands.

## Required structure

Every ExecPlan has these sections in this order. Do not omit any.

1. **Title** — short, action-oriented (`# Migrate auth to BetterAuth v1.6`).
2. **Living-document banner** — one paragraph stating that `Progress` / `Surprises & Discoveries` / `Decision Log` / `Outcomes & Retrospective` must be kept up to date, and pointing to `references/PLANS.md` (or the source path) as the governing spec.
3. **Purpose / Big Picture** — what the user gains and how to see it working.
4. **Progress** — checkbox list, every stopping point recorded with timestamp; split partial work into "done" and "remaining".
5. **Surprises & Discoveries** — observation + evidence pairs.
6. **Decision Log** — Decision / Rationale / Date+Author triples.
7. **Outcomes & Retrospective** — written at major milestones and at completion. Compare against original purpose.
8. **Context and Orientation** — current state, key files (full repo-relative paths), terms defined.
9. **Plan of Work** — concrete sequence of edits in prose, named files and locations.
10. **Concrete Steps** — exact commands with working dirs, expected transcripts.
11. **Validation and Acceptance** — observable behavior, exact test commands, expected counts ("expect 14 passed; the new test foo fails before and passes after").
12. **Idempotence and Recovery** — repeat-safety, rollback paths, retry guidance.
13. **Artifacts and Notes** — short transcripts, diffs, snippets as indented examples.
14. **Interfaces and Dependencies** — named libs, types, function signatures that must exist at end of milestone.

## Milestones

If the work is large enough to phase, introduce milestones inside `Plan of Work` and `Concrete Steps`. Each milestone:

- Has a brief paragraph describing scope, what will exist that did not before, commands to run, and observable acceptance.
- Is independently verifiable.
- Incrementally implements the goal — no milestone leaves the system in a worse state than the previous one.

Prototyping milestones are encouraged for de-risking unknowns. Label them clearly as "prototyping" and state the criteria for promoting or discarding the prototype.

## Workflow

1. Read this `SKILL.md` (you've done that).
2. If the user's request is at all unclear, ask one or two crisp questions before writing.
3. Draft the plan. Start from the structure above and flesh out each section. Skim `references/PLANS.md` only when you need the full prescriptive language for a tricky section.
4. Save to `.agents/skills/execplan/plans/<name>-<YYYY-MM-DD>.md`.
5. Show the user the path; ask whether to revise or proceed to execution.
6. After approval: execute the plan. As you work, update `Progress`, `Decision Log`, and (when surprised) `Surprises & Discoveries`. Commit frequently.
7. At completion, write `Outcomes & Retrospective`.

## When to read the full reference

Skim `references/PLANS.md` when:
- A reviewer or user disputes a structural choice.
- You need the exact phrasing of a non-negotiable requirement.
- You're writing a particularly novel section and want to anchor against the canonical source.

Otherwise, the structure above is sufficient.
