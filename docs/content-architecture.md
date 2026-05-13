# Content Architecture — Editor, AI Generation, and Export

How course content is structured, generated, stored, edited, and exported.

Status: design — not yet implemented.
Date: 2026-05-13.

---

## 1. What we're solving

Courses are produced by an LLM and consumed by humans in multiple ways. The architecture has to satisfy three targets simultaneously:

1. **Web app** — render courses in the browser, eventually with rich interactive blocks (quiz, callout, figure-with-caption, exercise…).
2. **EPUB export** — same content, ebook-shaped.
3. **Manual editing** (future) — a human edits AI-generated content, then re-renders/re-exports.

The current state (per `tracker.md`) stores `Module.content` as a markdown string. This document supersedes that for the post-MVP shape; the markdown column survives as a legacy/export representation, not the canonical form.

---

## 2. The shape we landed on

```
┌──────────────────────┐
│ AI (Claude)          │  generates structured content as JSON
│   structured output  │  constrained by a JSON Schema assembled from
│   ↓                  │  our Tiptap Node extensions
└─────────┬────────────┘
          │ Tiptap JSON (validated per-node with Zod)
          ▼
┌──────────────────────┐
│ DB (Module.contentJson) │   canonical source of truth
└─────────┬───────────────┘
          │
          ├──────────► Editor (Tiptap, future): loads JSON, edits, saves JSON
          │
          ├──────────► Web render: server uses @tiptap/html → HTML → React
          │
          └──────────► EPUB export: same JSON → HTML → Pandoc → .epub
```

Single source of truth: **Tiptap JSON in Postgres**. Every other format (HTML, MD, EPUB) is derived.

---

## 3. Decisions

### 3.1 Editor: Tiptap v3

| Considered | Verdict |
|---|---|
| **Tiptap v3** (ProseMirror-based, React) | ✅ Chosen |
| BlockNote (Notion-style, built on Tiptap) | ❌ Too opinionated; MD export is *explicitly lossy* per their docs and they recommend block-JSON as canonical anyway — at that point we're paying for pre-built UI we don't need yet |
| Lexical (Meta, React-first) | ❌ Architecturally cleaner but smaller ecosystem, less MD tooling, more to build |
| Slate / Plate | ❌ Slate has historical perf/correctness issues; no compelling reason over Tiptap |
| Novel (Vercel) | ❌ Tiptap-based but opinionated; saves time today, costs flexibility later |
| MDX | ❌ Doesn't play well with non-React renderers (EPUB) |

**Why Tiptap**: largest React editor ecosystem, headless (no UX baked in), thin layer on ProseMirror with easy escape hatches, prior team familiarity. The "two layers on ProseMirror" concern is theoretical — Tiptap is a DX layer, not a leaky abstraction.

### 3.2 Source of truth: Tiptap JSON, not Markdown

This is the central decision. Earlier MVP used MD strings; we are migrating to JSON for v2 because:

- **Custom blocks** (quiz, exercise, callout, figure-with-caption, video) cannot be represented in standard Markdown. MD extensions exist (`remark-directive`, MDX) but adherence is fragile when an LLM is the author — parser errors require retries.
- **Lossless storage** — JSON preserves every attribute. MD round-trips silently drop data on custom nodes.
- **Validation** — each node's attributes get a Zod schema. Validation errors are precise (`quiz block at index 4 missing 'answer'`) and inform retry prompts.
- **Editor reads it natively** — when the Tiptap editor ships, no parse step on load/save.

What we lose:
- Portability (JSON is tied to our Tiptap schema).
- Human-diffable history.

Mitigations:
- **`schemaVersion` field on every stored document** from day one. Cheap insurance for migrations when node types change.
- MD/HTML remain as **export formats**, generated on demand.

### 3.3 AI generates Tiptap JSON directly

Two alternatives were considered and rejected:

- **AI generates MD, server converts to JSON** — easier on the LLM but reintroduces the lossy-roundtrip problem for custom blocks, and the conversion step has to invent semantics MD can't carry.
- **AI generates an intermediate `CourseDoc` DSL, server compiles to Tiptap JSON** — clean separation, but it's a second schema to maintain and the next decision (3.4) makes it unnecessary.

The LLM emits Tiptap JSON via Anthropic structured outputs / tool input schema. Each block in the output is validated against the corresponding Zod schema before being accepted.

Short-term hybrid escape hatch if model quality on JSON proves weak: keep `prose` nodes containing MD strings, so the LLM writes paragraph-level prose in MD (where it's strongest) while the outer structure is JSON. This is a localized concession, not an architectural shift.

### 3.4 Single source of truth: Node extension owns both schemas

This is the pattern that makes the whole thing maintainable. Each Tiptap custom Node extension owns *both*:

- The editor schema (`addAttributes`, `parseHTML`, `renderHTML`).
- The AI-facing schema (a method returning name, description, Zod attribute shapes).

Pattern is inspired by Tiptap's official `addJsonSchemaAwareness` (part of their **paid** Server AI Toolkit — see 3.7). We replicate the *pattern*, not the toolkit.

```ts
// extensions/alert.ts (sketch)
import { Node } from '@tiptap/core'
import { z } from 'zod'

export const Alert = Node.create({
  name: 'alert',
  group: 'block',
  content: 'inline*',

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: el => el.getAttribute('data-type'),
        renderHTML: attrs => attrs.type ? { 'data-type': attrs.type } : {},
      },
    }
  },

  parseHTML()  { return [{ tag: 'div[data-alert]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-alert': '' }, 0]
  },
})

// AI metadata lives next to the extension, not in a separate registry.
export const AlertAiSchema = {
  type: 'alert',
  description: 'A highlighted box for info, warnings, tips. Inline content only.',
  attributes: z.object({
    type: z.enum(['info', 'warning', 'error', 'success'])
      .describe('Alert severity'),
  }),
}
```

A small builder iterates registered extensions, collects each `AiSchema`, and assembles the JSON Schema handed to the LLM. ~30 lines of glue, no subscription.

Adding a new block type = one file change. The editor and the AI learn about it simultaneously.

### 3.5 EPUB export: JSON → HTML → Pandoc

`@tiptap/html` (server-side) renders our stored JSON to HTML using the same extensions the editor uses. HTML feeds Pandoc, which produces `.epub` with TOC, metadata, and image embedding handled.

Why HTML→Pandoc instead of MD→Pandoc:
- HTML can represent custom nodes (via `data-*` attributes / custom tags) cleanly.
- Avoids the second lossy conversion we were trying to escape in 3.2.
- Pandoc consumes HTML natively, no extra mapping.

**Verify early**: round-trip a real generated module through `AI → JSON → HTML → Pandoc → EPUB` before custom blocks accumulate. Catch serialization gaps while there's only one of them.

### 3.6 Images

Established pattern (web + EPUB compatible):

- **Assets stored externally** (Vercel Blob, same as audio) with stable IDs. The Tiptap document references them by canonical URL.
- **Custom `figure` Node** carries `src`, `alt`, `caption`, `credit`, `prompt` (the AI's description of what the image should show), and `assetId`. Plain `<img>` doesn't carry caption/credit/license; a `figure` node does.
- **Image resolution is a second pass**: AI emits `figure` nodes with `prompt` populated and `src` empty. A resolver walks the doc and fills `src` by either:
  1. **Stock search** (Unsplash/Pexels) — cheap, good for hero/section images.
  2. **Generation** (gpt-image-1, FLUX, etc.) — flexible but expensive; reserve for cases stock can't cover.
  3. **Mermaid** in a fenced `code` node with `language=mermaid` — rendered client-side for web, pre-rendered to SVG server-side for EPUB. The right answer for diagrams; the AI should prefer this for technical content.
- The Tiptap node knows how to render in both targets, so EPUB and web share one definition.

Open: which stock provider, which generative model, when to choose which. Decide after the first pipeline runs end-to-end.

### 3.7 Why we are not paying for Tiptap's AI Toolkit

Tiptap sells a paid **Server AI Toolkit** that includes `addJsonSchemaAwareness` and related doc-AI tools. Pricing (verified 2026-05-13 from `tiptap.dev/pricing`):

| Plan | Price | AI in plan |
|---|---|---|
| Start | $49/mo | "In-line AI extension" (autocomplete only) |
| Team | $149/mo | Same |
| Business | $999/mo | Same + beta access |
| Enterprise | Custom | Everything |
| **AI Toolkit add-on** | **"Talk to sales"** | Server AI Toolkit, schema awareness, doc-level AI |

Reasoning:
- We only want **one architectural idea** from the toolkit (schema-aware AI generation). The toolkit's broader value (patch operations, agent tooling, hosted streaming) is not on our roadmap.
- Replicating the pattern is ~30 lines (see 3.4).
- "Talk to sales" pricing for a single-developer course-gen app is not justifiable.

Revisit if/when we want agent-style editing (LLM applying patches to live documents), where the toolkit's value is real.

---

## 4. What changes in the existing schema

`tracker.md` currently has:

```prisma
model Module {
  // ...
  content   String?   // markdown, populated in Slice 3
}
```

Post-migration:

```prisma
model Module {
  // ...
  content        String?   // markdown — legacy / kept until backfill confirmed
  contentJson    Json?     // Tiptap JSON, new canonical
  schemaVersion  Int       @default(1)
}
```

Migration path is deferred to its own slice; not part of this design doc. The MVP can keep shipping with the `content` (markdown) column until the editor work begins.

---

## 5. Open questions

- **Tiptap extensions catalog** — exact list of custom Nodes for v2 (quiz? exercise? callout variants? code-with-output?). Decide alongside the editor slice.
- **JSON-mode reliability** — measure how well Claude follows the assembled JSON Schema on long courses. Falls back to `prose` blocks containing MD if needed (per 3.3).
- **Image resolver implementation** — provider choices and cost ceilings.
- **EPUB styling** — CSS for ebook reader compatibility, font embedding decisions.
- **Editor UI** — slash menu, drag handles, etc. Headless Tiptap means we build (or borrow from `shadcn-editor`-style projects). Out of scope for this doc.

---

## 6. Discarded ideas (kept here so we don't relitigate)

- **Pure MD as source of truth with `remark-directive`** for custom blocks. Rejected: LLM adherence to directive syntax is unreliable enough to make retries painful; JSON+Zod gives deterministic validation.
- **MDX** as source of truth. Rejected: locks rendering to React, EPUB path becomes hand-rolled.
- **BlockNote** as editor. Rejected: paying in opinions for UI we'll build later anyway; their lossy-MD pattern doesn't add value when JSON is canonical.
- **Intermediate `CourseDoc` DSL → compiler → Tiptap JSON**. Rejected: extra schema to maintain when the Node extension can carry both representations (3.4) and the AI can target Tiptap JSON directly.
- **Generate images at the same time as content.** Rejected: better to let the writer-LLM emit prompts inline (where it has full context), then resolve in a separate pass with the resolver best suited to each image's purpose.
