# Module Annotations — selection-based comments that drive partial regeneration

## Living-document banner

This is a living document. While work is in progress, whoever is executing the plan MUST keep the `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` sections up to date — append-only where possible, timestamped. The governing spec for ExecPlan structure lives at `.claude/skills/execplan/references/PLANS.md`. Read that file when a structural question comes up; otherwise the structure here is sufficient.

## Purpose / Big Picture

We are adding **module annotations** to Sapiens Workshop. A user can highlight any passage in a generated module (status `ready`), attach a free-text note ("make this less academic", "add an example here", "this fact is wrong — it's actually X"), and queue any number of such annotations on a module. They then click **Regenerate with N comments** and the module re-streams in place: the LLM receives the original content plus the list of annotations and is instructed to edit only what the annotations ask, keeping the rest of the module byte-for-byte stable. After the stream completes, annotations whose quoted text no longer appears in the new content are flipped to `applied` and dropped from the active list; annotations whose quoted text is still present remain `pending` for further iteration.

**To see it working at the end:** open a ready course at `/courses/[id]`, drag-select a sentence inside any module, a small popover appears, type a note, hit Save → the selection turns into a colored highlight. Repeat on two more passages. A floating "Regenerate with 3 comments" button now appears on that module. Click it. The module's content blanks and re-streams just like initial generation, but the unannotated regions of the resulting text are essentially identical to before (allowing for surface-level rewording at worst), and the annotated regions reflect the requested changes. After the stream, highlights whose quoted text was preserved stay; the rest are gone (those annotations were applied).

## Progress

Use one checkbox per concrete step. When you start a step, append `(started <YYYY-MM-DD HH:MM>)`; when you finish, append `(done <YYYY-MM-DD HH:MM>)`. If a step is partially done, split it into a "done" sub-bullet and a "remaining" sub-bullet.

- [x] Milestone 1 — Schema + actions (done 2026-05-13 17:45)
  - [x] Add `ModuleAnnotation` model to `prisma/schema.prisma` (done 2026-05-13 17:30)
  - [x] User runs `npm run db:migrate -- --name module_annotations` (done 2026-05-13 17:35)
  - [x] `features/course/schemas.ts` — zod schemas for create/delete annotation (done 2026-05-13 17:38)
  - [x] `features/course/actions/annotation.ts` — `createAnnotation`, `deleteAnnotation`, `listModuleAnnotations` (done 2026-05-13 17:42)
  - [x] Unit-style sanity check via the Prisma client (one create, one list, one delete) inside `npx tsx` (done 2026-05-13 17:44 — output: `created <cuid>`, `found 1 annotations`, `deleted`. tsc + eslint clean.)
- [x] Milestone 2 — Selection + popover UI + highlight rendering (done 2026-05-13 18:05; pending user smoke-test in browser)
  - [x] Install `mark.js` + `@types/mark.js` (done 2026-05-13 17:50)
  - [x] `features/course/components/module-annotation-layer.tsx` — wraps rendered markdown; captures selection on mouseup; paints existing highlights via mark.js with `acrossElements: true`; re-paints in `useLayoutEffect` (done 2026-05-13 17:58)
  - [x] `features/course/components/module-annotation-popover.tsx` — note textarea + Save/Cancel; calls `createAnnotation` via `useTransition`; positioned `fixed` at selection's `bottom + 6px / left` (done 2026-05-13 17:58)
  - [x] `.sw-annotation` style added to `app/globals.css` (light + dark) (done 2026-05-13 18:00)
  - [x] Wire the layer into `module-streaming-section.tsx`; only mounts when `persisted && !streaming` (done 2026-05-13 18:02)
  - [x] `app/courses/[id]/page.tsx` includes `annotations` (pending, asc) in the Prisma query and passes `{id, quotedText, note}` down through `CourseReader` → `ModuleStreamingSection` (done 2026-05-13 18:04)
  - [x] tsc + eslint + build all clean (done 2026-05-13 18:05)
- [x] Milestone 3 — Regenerate endpoint + prompt (done 2026-05-13 18:25)
  - [x] `features/course/prompts/module-regenerate.ts` — `MODULE_REGEN_SYSTEM` + `buildModuleRegenPromptParts` returning `[stable, variable]` (done 2026-05-13 18:18)
  - [x] `features/course/lib/relocate-annotations.ts` — pure `relocateAnnotations(newContent, annotations)` returning `{stillPresentIds, appliedIds}` via exact substring (done 2026-05-13 18:20)
  - [x] `app/api/modules/regenerate/route.ts` — POST handler. Skips `Course.status` updates (single-module edit). 409 if module not ready; 400 if no pending annotations. On finish, txn-updates module + flips applied annotations. On error, sets module `failed` (done 2026-05-13 18:24)
  - [x] tsc + eslint clean (done 2026-05-13 18:25)
- [x] Milestone 4 — Regenerate trigger + client integration (done 2026-05-13 18:35)
  - [x] `features/course/components/module-regenerate-button.tsx` — props `{pendingCount, disabled, isRegenerating, onClick}`; renders nothing when count is 0 (done 2026-05-13 18:30)
  - [x] Second `useCompletion({api: '/api/modules/regenerate'})` in `module-streaming-section.tsx`; while it's loading, the displayed text is the regen `completion` (overrides `m.content`). Layer is gated off during streaming (already covered by the `!streaming` check) (done 2026-05-13 18:34)
  - [x] `router.refresh()` in regen `onFinish` so the new annotation list re-fetches and applied ones drop (done 2026-05-13 18:34)
  - [x] tsc + eslint + build clean (done 2026-05-13 18:35)
- [ ] Milestone 5 — Annotation management polish
  - [ ] Click a highlight: shows the note in a small overlay with a Delete button
  - [ ] Tracker entry as Slice 7 in `docs/tracker.md`

## Surprises & Discoveries

Empty at start. Append `(<date>) <one-paragraph observation + evidence>` whenever the implementation reveals something the plan didn't predict. Examples of what counts: a library doesn't work as expected, an LLM prompt drifts under conditions we didn't foresee, a Prisma constraint blocks a query we assumed would work, a markdown edge case breaks the highlight painter.

## Decision Log

Decisions captured here so we don't relitigate.

| # | Decision | Rationale | Date / Author |
|---|---|---|---|
| 1 | **Full-module rerun, annotation-aware** — over block-level or find-and-replace patches | Modules are ~1000 words; our streaming pipe already exists; minimum new code. Cost manageable with Anthropic prompt caching on (course context + original module content) as the stable prefix. Find-and-replace is brittle in markdown (whitespace, formatting variations); block-level requires threading block IDs through the markdown renderer. | 2026-05-13 / Ric + Claude |
| 2 | **Batch regen** — apply all pending annotations in a single LLM call, not one regen per annotation | Single call lets the model reconcile conflicting/adjacent annotations and is cheaper. The "Regenerate with N comments" button is one action. | 2026-05-13 / Ric + Claude |
| 3 | **Anchor by quoted text + context window** — `quotedText`, `contextBefore` (~100 chars), `contextAfter` (~100 chars) — not character offsets, not paragraph indices | Char offsets are useless after regen; paragraph indices break on restructure. Quoted text + small context is the only anchoring that survives meaningful edits; we can fuzzy-relocate after regen by searching the new content for the quoted text. | 2026-05-13 / Ric + Claude |
| 4 | **Inline popover UI for v1** — not a Google-Docs-style margin sidebar | Cheaper to ship; margin layout is a separate UX project. Sidebar can be a future polish slice. | 2026-05-13 / Ric + Claude |
| 5 | **Highlight rendering: post-render DOM walk via `mark.js`** — over a rehype plugin that injects `<mark>` AST nodes | The annotation's anchor is plain text, but the rendered markdown may have inline formatting (bold/italic/links) splitting that text across HTML elements. `mark.js` handles cross-element substring matching out of the box. A rehype plugin would have to re-implement that. If `mark.js` proves heavy or finicky we can revisit; v1 favors getting selection→highlight→regen working end-to-end. | 2026-05-13 / Ric + Claude |
| 6 | **Separate endpoint `/api/modules/regenerate`** — not a flag on the existing `/api/modules/generate` | The prompts differ substantially (regen ships the original content; initial gen doesn't), the lifecycle differs (regen doesn't roll up course-level status), and the client triggers are different (regen is user-initiated, initial gen runs as a queue). Splitting keeps each route's responsibilities legible. | 2026-05-13 / Ric + Claude |
| 7 | **On regen completion, automatically drop annotations whose quoted text no longer appears** by setting `status = applied` — do not require the user to confirm | The whole point of the flow is "I asked for this change; if the change happened, the comment is resolved." Surfacing a manual confirm step adds friction. The user can recover applied annotations from the history view if needed (Milestone 5+). | 2026-05-13 / Ric + Claude |

## Outcomes & Retrospective

Write at major milestones (after M2, after M4) and at completion. Compare against the Purpose section: did the observable behavior land? What didn't go as planned? What would you do differently? At completion, also tick the corresponding tracker entry in `docs/tracker.md` and add a Decisions-log row there if any cross-cutting decision shifted.

(empty until M2 is done)

## Context and Orientation

The codebase is a Next.js 16 App Router app for generating educational courses. The current state, immediately relevant to this work:

- **Domain shape.** A `Course` has many `Module` rows in order. A `Module` has a markdown `content` field and a `status` (`pending` / `generating` / `ready` / `failed`). Modules are generated sequentially in the reader at `/courses/[id]` — each `ModuleStreamingSection` owns a `useCompletion()` and streams from `POST /api/modules/generate` when its parent's `activeIndex` matches its position.
- **No annotations exist yet.** There is no `ModuleAnnotation` row, no selection capture, no highlight render — the rendered module markdown is just `react-markdown` output.
- **Audio precedent.** A separate per-module action already exists for synthesizing audio (`features/course/actions/module-audio.ts`); its shape (small action, persisted side effect, button component) is the closest analogue for the annotation actions.

Key files (full repo-relative paths):

- `prisma/schema.prisma` — Prisma data model. New `ModuleAnnotation` table goes here.
- `features/course/schemas.ts` — zod schemas. New `CreateAnnotationSchema`, `DeleteAnnotationSchema` go here.
- `features/course/actions/annotation.ts` — **new file**. Server actions for annotations.
- `features/course/prompts/module.ts` — existing module-generation prompt (`MODULE_SYSTEM`, `buildModuleUserPromptParts`).
- `features/course/prompts/module-regenerate.ts` — **new file**. Regen-with-annotations prompt.
- `app/api/modules/generate/route.ts` — existing initial-generation route. We do not modify this; we add a sibling.
- `app/api/modules/regenerate/route.ts` — **new file**. POST handler that streams a regenerated module with annotations applied.
- `features/course/components/module-streaming-section.tsx` — existing per-module client component with its own `useCompletion()` instance. We hook the annotation layer and regen button in here.
- `features/course/components/module-annotation-layer.tsx` — **new file**. Wraps rendered markdown; captures selection; paints highlights.
- `features/course/components/module-annotation-popover.tsx` — **new file**. Small overlay with note input + Save/Cancel.
- `features/course/components/module-regenerate-button.tsx` — **new file**. The "Regenerate with N comments" trigger.
- `lib/markdown/index.tsx` — existing react-markdown wrapper. We do not modify it; the annotation layer wraps its output.
- `docs/tracker.md` — at completion, add a Slice 7 entry and a decisions-log row.

Terms defined for this plan:

- **Annotation** — a saved record `{quotedText, contextBefore, contextAfter, note, status}` linked to one `Module`.
- **Anchor** — the `(quotedText, contextBefore, contextAfter)` triple used to (a) paint the highlight in the rendered markdown, and (b) relocate the annotation in regenerated content.
- **Pending** — annotation status when it is still anchored to the current content and awaiting next regen.
- **Applied** — annotation status when its quoted text no longer appears in the latest module content (we infer the regen executed the user's intent).
- **Regen** — calling `/api/modules/regenerate` for a module: re-streaming its content with original content + pending annotations as the prompt input. Differs from **initial generation** (`/api/modules/generate`), which is the queue-driven first pass with no prior content.
- **Highlight painter** — the client-side code that takes the list of annotations for a module and renders a `<mark>` overlay on top of the markdown DOM (via `mark.js`).

## Plan of Work

Five milestones, each independently verifiable. Acceptance for each is observable behavior or a transcript, not internal attributes.

### Milestone 1 — Schema + actions

Add the persistence layer and server actions before writing any UI. At the end of this milestone there is no UI change; you can create, list, and delete annotations via a one-off script using the Prisma client.

The new `ModuleAnnotation` model goes in `prisma/schema.prisma`:

    model ModuleAnnotation {
      id            String   @id @default(cuid())
      moduleId      String
      module        Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
      quotedText    String
      contextBefore String
      contextAfter  String
      note          String
      status        AnnotationStatus @default(pending)
      createdAt     DateTime @default(now())
      updatedAt     DateTime @updatedAt

      @@index([moduleId, status])
    }

    enum AnnotationStatus {
      pending
      applied
      dismissed
    }

After the model is in, the user (not the agent — per AGENTS.md "NEVER run prisma migrate") runs:

    npm run db:migrate -- --name module_annotations

Server actions in `features/course/actions/annotation.ts`:

- `createAnnotation({ moduleId, quotedText, contextBefore, contextAfter, note })` — validates with zod, inserts row, revalidates `/courses/[courseId]`. Looks up `courseId` from the module.
- `deleteAnnotation({ annotationId })` — looks up the row, deletes it, revalidates.
- `listModuleAnnotations(moduleId)` — returns pending annotations only (the active set). Called server-side from `app/courses/[id]/page.tsx` to seed the client component on load.

Zod schemas live in `features/course/schemas.ts` alongside the existing module-related schemas.

### Milestone 2 — Selection + popover UI + highlight rendering

Now the user-visible surface. Wrap the rendered markdown in a client-side layer that:

1. **Captures selection.** Listen for `selectionchange` (or `mouseup`) inside the container ref. When a non-empty selection ends inside the container, compute `quotedText` (the selected string), `contextBefore` (up to 100 chars of the container's textContent preceding the selection start), and `contextAfter` (up to 100 chars following the selection end). Open a popover positioned near the selection.
2. **Saves the annotation.** The popover holds a `<textarea>` for the note plus Save/Cancel. Save calls `createAnnotation` via a `useTransition`. On success, close popover, clear selection, force a refresh of the highlight layer (the annotation appears as a highlight).
3. **Paints highlights.** Given the list of annotations for this module, the layer paints each annotation's `quotedText` over the rendered markdown. Use `mark.js` (`new Mark(containerEl).mark(text, options)`) — it walks text nodes and wraps matching substrings in `<mark>` even across inline element boundaries (bold/italic/links inside the quoted text).

The annotation layer is **inert during streaming**. When `module.status === 'generating'` (or our local stream state is mid-flight), pointer-events on the layer are disabled and selection-capture is off — annotations only make sense on the stable content of a ready module.

Existing annotations for a module are fetched server-side in the page (or layout) and passed in as a prop, so the highlights paint on first render with no flicker.

### Milestone 3 — Regenerate endpoint + prompt

The prompt template lives in `features/course/prompts/module-regenerate.ts`. Following the precedent of the existing module prompt, it returns `[stablePrefix, variableSuffix]` so we can apply Anthropic `cacheControl: { type: "ephemeral" }` to the prefix.

The **stable prefix** contains: course context (topic / audience / tone / language / target word count), the full syllabus, prior `ready` modules' content (so the regen module continues to reference earlier material correctly), and the **original module content**. This prefix is identical across successive regens of the same module, so calls 2..N hit cache.

The **variable suffix** contains: the current pending annotations, formatted as a numbered list of `(quotedText, note)` pairs, plus the **edit-only instruction**:

    You are editing — not rewriting — this module. Apply each user comment to the
    passage it quotes, plus the minimum surrounding text required to keep the prose
    coherent. Do not modify any passage that is not directly addressed by a comment.
    Preserve voice, structure, headings, ordering, paragraph breaks, and information
    density of the original. Output the full edited module as markdown. Do not add
    a preamble or explanation; output only the module body.

`app/api/modules/regenerate/route.ts` is a POST handler that:

1. Parses `{ moduleId }` from the body (annotations come from DB, not the request).
2. Loads the module + course + prior `ready` modules + the module's pending annotations.
3. Marks `Module.status = generating` (course-level status is left alone — this is a single-module edit, not a course-wide pass).
4. Builds the prompt parts and applies `cacheControl` on the stable prefix.
5. Calls `streamText(...)` and returns `result.toTextStreamResponse()`.
6. In `onFinish`: persists the new `content`, runs the **relocator** (re-search the new content for each pending annotation's `quotedText`; if not found, flip that annotation to `applied`), and marks `Module.status = ready`.
7. In `onError`: persists `errorMessage` and marks `failed`.

The relocator is a small helper in `features/course/relocate-annotations.ts`. It exposes:

    relocateAnnotations(newContent: string, annotations: { id: string; quotedText: string }[]):
      { stillPresentIds: string[]; appliedIds: string[] }

Implementation: for each annotation, check `newContent.includes(quotedText)`. If yes → still present. If no → applied. Future versions can add fuzzy matching (Levenshtein within a small threshold) if exact-match proves too strict; for v1, exact substring is the contract we communicate to the user via the prompt ("preserve voice, structure...").

### Milestone 4 — Regenerate trigger + client integration

`module-regenerate-button.tsx` is a small client component that:

- Receives the count of pending annotations as a prop.
- Renders nothing if count is 0.
- Renders a sticky/floating button labeled "Regenerate with N comments" on the module section it belongs to.
- On click, calls into the parent `ModuleStreamingSection` to trigger the regen.

Wiring inside `ModuleStreamingSection`: this component already owns a `useCompletion()` instance pointed at `/api/modules/generate`. For regen we add a **second** `useCompletion()` instance pointed at `/api/modules/regenerate` with the same `onFinish` semantics (replace local content with the streamed result, then call `router.refresh()` so the server-rendered annotation list re-fetches and the applied ones drop out).

There is a real choice here — one combined `useCompletion()` with a dynamic `api` URL versus two separate instances. Two separate instances is simpler to reason about (each has its own `complete` function and lifecycle), at the cost of a bit of duplicated UI plumbing. We pick **two instances**; see Decision Log entry #6 (separate endpoints).

### Milestone 5 — Annotation management polish

Once the loop works:

- Clicking on an existing highlight opens a small read-only popover with the note and a Delete button (calls `deleteAnnotation`).
- After regen, the highlights that survived stay; the dropped-to-applied ones disappear from the active rendering.
- Tracker: add Slice 7 to `docs/tracker.md` with status `[x]`; append a decisions-log row summarizing the picked approach.

## Concrete Steps

Each step lists the working directory, the command (if any), and the expected observable result. Run from the repo root unless noted.

### M1.1 — Add the Prisma model

Edit `prisma/schema.prisma` to add the `ModuleAnnotation` model and `AnnotationStatus` enum (see Plan of Work / M1 for exact shape).

Then **stop and hand off** the migration command to the user. Paste this in the chat:

    Please run:
        npm run db:migrate -- --name module_annotations

When the user confirms the migration completed, continue.

### M1.2 — Zod schemas

Open `features/course/schemas.ts`. Add `CreateAnnotationSchema` and `DeleteAnnotationSchema`. Keep them next to the existing module schemas.

### M1.3 — Server actions

Create `features/course/actions/annotation.ts` with the three actions (see Plan of Work).

Smoke-test from the command line:

    npx tsx -e "import { db } from './lib/db'; (async () => {
      const m = await db.module.findFirst({ where: { status: 'ready' } });
      if (!m) throw new Error('No ready module in DB; generate one first.');
      const a = await db.moduleAnnotation.create({
        data: {
          moduleId: m.id,
          quotedText: 'test',
          contextBefore: '',
          contextAfter: '',
          note: 'plan smoke test',
        },
      });
      console.log('created', a.id);
      const list = await db.moduleAnnotation.findMany({ where: { moduleId: m.id } });
      console.log('found', list.length, 'annotations');
      await db.moduleAnnotation.delete({ where: { id: a.id } });
      console.log('deleted');
    })()"

Expect three console lines: `created <cuid>`, `found 1 annotations`, `deleted`. If it errors with "No ready module", the user needs to generate at least one course/module first via the existing flow.

### M1.4 — Acceptance (M1)

Run `npx tsc --noEmit` — expect no errors. Run `npx eslint .` — expect no errors. The smoke test above passes.

### M2.1 — Install mark.js

    npm install mark.js
    npm install -D @types/mark.js

### M2.2 — Annotation layer component

Create `features/course/components/module-annotation-layer.tsx`. It is a client component (`"use client"`) that:

- Takes props: `moduleId`, `initialAnnotations` (array), `children` (the rendered markdown).
- Wraps `children` in a `<div ref={containerRef}>`.
- On mount and whenever `initialAnnotations` changes, instantiates `new Mark(containerRef.current)` and calls `.unmark()` then `.mark(text, { ... className: 'sw-annotation', acrossElements: true })` for each annotation's quoted text. Each `<mark>` carries a `data-annotation-id` attribute (use the `each` option in mark.js to set it).
- Attaches a `mouseup` handler that reads `window.getSelection()`, computes `quotedText` + `contextBefore` + `contextAfter`, and opens the popover at the selection's bounding rect.

### M2.3 — Popover component

Create `features/course/components/module-annotation-popover.tsx`. Standard shadcn-ish popover with a `<textarea>` (use the existing `@/components/ui/textarea`) and Save/Cancel buttons. Save calls `createAnnotation` and waits via `useTransition`; on success, calls back to the parent layer to refresh.

### M2.4 — Wire into the streaming section

Edit `features/course/components/module-streaming-section.tsx`. When `module.status === 'ready'` (and no in-flight stream), render the annotation layer wrapping the `<Markdown>` output. Pass `initialAnnotations` (received as a prop from the parent course-reader). When streaming or pending, render the markdown without the layer.

### M2.5 — Seed annotations from the server

Edit `app/courses/[id]/page.tsx`. For each ready module, fetch its pending annotations server-side (one `findMany` per module is fine for now; could batch later). Pass them into `CourseReader` → `ModuleStreamingSection`.

### M2.6 — Acceptance (M2)

Start the dev server (per AGENTS.md, the **user** runs `npm run dev`). Open a ready course. Drag-select text in a module. Expect: popover appears near the selection, type a note, hit Save. Expect: popover closes, selection becomes a yellow (`bg-yellow-200/60` or similar) highlight. Reload the page. Expect: highlight is still there, painted on top of the markdown including across inline formatting if applicable.

Pre-handoff checks the agent runs itself: `npx tsc --noEmit`, `npx eslint .`, then `npm run build` (per AGENTS.md "Before handoff to the user: typecheck + eslint. If relevant changes: build").

### M3.1 — Regen prompt

Create `features/course/prompts/module-regenerate.ts`. Export `MODULE_REGEN_SYSTEM` (a string) and `buildModuleRegenPromptParts({ course, syllabus, priorModules, originalContent, annotations })` returning `[stablePrefix, variableSuffix]`.

The variable suffix renders the annotations as a numbered list:

    Comments to apply to this module (in no particular order):

    1. Quoted passage: "<quotedText 1>"
       User comment: <note 1>

    2. Quoted passage: "<quotedText 2>"
       User comment: <note 2>

    ...

    <edit-only instruction from Plan of Work / M3>

### M3.2 — Route handler

Create `app/api/modules/regenerate/route.ts`. Mirror the structure of `app/api/modules/generate/route.ts` (look at that file for `streamText` setup, status persistence, `onFinish`/`onError` shape) but use the regen prompt and the relocator on completion.

### M3.3 — Relocator

Create `features/course/relocate-annotations.ts` with `relocateAnnotations(newContent, annotations)` returning `{ stillPresentIds, appliedIds }`. Pure function, no DB access. The route handler is responsible for calling `db.moduleAnnotation.updateMany({ where: { id: { in: appliedIds } }, data: { status: 'applied' } })`.

### M3.4 — Acceptance (M3)

Curl test from the command line:

    curl -N -X POST http://localhost:3000/api/modules/regenerate \
      -H "Content-Type: application/json" \
      -d '{"moduleId":"<id of a ready module with at least one pending annotation>"}'

Expect: a text/plain stream of markdown. After it finishes (Ctrl-C or natural end), check the DB:

    npx tsx -e "import { db } from './lib/db'; (async () => {
      const m = await db.module.findUnique({ where: { id: '<id>' }, include: { annotations: true } });
      console.log('status', m?.status);
      console.log('annotations', m?.annotations.map(a => ({ id: a.id, status: a.status })));
    })()"

Expect: `status ready`, and the annotation(s) whose quoted text the regen modified appear with `status applied`.

### M4.1 — Regenerate button

Create `features/course/components/module-regenerate-button.tsx`. Receives `pendingCount` and an `onClick` callback. Renders nothing when count is 0; otherwise a sticky button on the module.

### M4.2 — Wire the second useCompletion

Edit `features/course/components/module-streaming-section.tsx` to instantiate a second `useCompletion({ api: '/api/modules/regenerate' })`. Provide a `regenerate()` method that calls `complete()` with `{ body: { moduleId } }`. Replace `module.content` in local state with the streamed result as it arrives, just like the initial-gen flow.

### M4.3 — Acceptance (M4)

Open the reader. Select text in a ready module, add a comment (you should already be able to from M2). Repeat twice more. Click "Regenerate with 3 comments". Expect: the module's content blanks and re-streams. After it finishes, two specific things are observable:

1. **Untouched regions are essentially identical.** Spot-check 2–3 paragraphs that weren't annotated against the prior version — wording should be the same modulo trivial surface edits.
2. **Annotated regions changed.** The text you commented on is rewritten in the direction the comment asked for.
3. **Applied annotations dropped.** The highlights whose quoted text is no longer in the new content are gone; the highlights for annotations whose quoted text still appears (because the model didn't fully act on them) remain pending.

### M5.1 — Click-to-show-note

In `module-annotation-layer.tsx`, attach a click handler to the `<mark>` elements. On click, open a read-only popover showing the note + a Delete button (`deleteAnnotation` action).

### M5.2 — Update tracker

Edit `docs/tracker.md`. Add Slice 7:

    ### Slice 7 — Module annotations + partial regeneration `[x]`

    **Goal:** users can highlight passages in a ready module, attach comments,
    and regenerate the module with all comments applied in one call — preserving
    untouched content.

    ... (full slice body following the format of slices 1–6) ...

Add a decision-log row capturing the strategy choice.

### M5.3 — Final pre-handoff checks

    npx tsc --noEmit
    npx eslint .
    npm run build

All three must pass. Update `Progress` in this plan with the final timestamps. Write `Outcomes & Retrospective`.

## Validation and Acceptance

Each milestone has its own acceptance step above (M1.4, M2.6, M3.4, M4.3). The plan as a whole is accepted when:

- The reader at `/courses/[id]` supports text selection on every ready module's content.
- Selecting + saving a note paints a persistent highlight.
- A module with at least one pending annotation shows the "Regenerate with N comments" button.
- Clicking that button re-streams the module; the new content keeps unannotated regions essentially identical and reflects the comments on annotated regions.
- Annotations whose quoted text no longer appears in the new content are flipped to `applied` and removed from the active highlight set; the rest remain.
- `npx tsc --noEmit` is clean. `npx eslint .` is clean. `npm run build` is clean.
- `docs/tracker.md` reflects Slice 7 as `[x]`.
- This plan's `Progress` is fully ticked; `Outcomes & Retrospective` is written.

## Idempotence and Recovery

- **Schema migration.** The migration is `module_annotations` and is one-shot. If it fails partway, the user can resolve with their normal Prisma workflow; the agent does not re-run `prisma migrate`.
- **Smoke test (M1.3).** Creates and deletes its own row. Safe to re-run.
- **Curl test (M3.4).** Mutates the module's content and annotation statuses. Re-running it on the same module is fine but will progressively reduce the pending annotations; if you want to re-test from scratch, manually re-create annotations via the UI or by INSERT.
- **Failed regen.** If `/api/modules/regenerate` errors mid-stream, `onError` persists `Module.status = failed` with the error message. The user retries via the button (which clears `failed` and starts again, same as the existing per-module retry pattern in initial generation).
- **Closed tab mid-regen.** Same caveat as the existing initial-generation flow (documented in tracker / Slice 3 known limitations): the module ends in `generating` state if the client closes mid-stream. On next page load the module is not `ready`; we could either auto-retry or surface a "regen interrupted" state with a manual retry button. **Decision deferred** to implementation; default is the same as initial-gen (let the user kick it off again from the button).
- **Rollback.** Reverting this plan means: drop the `ModuleAnnotation` table (`prisma migrate dev` with the table removed from schema), delete the new files listed in Context and Orientation, and revert the edits in `module-streaming-section.tsx` and `app/courses/[id]/page.tsx`. No data outside the new table is touched.

## Artifacts and Notes

### Sample annotation row (DB)

    {
      id: 'cm5xyz...',
      moduleId: 'cm5abc...',
      quotedText: 'The Treaty of Westphalia, signed in 1648, ended the Thirty Years\' War.',
      contextBefore: '... shifted the European order in lasting ways. ',
      contextAfter: ' This had profound implications for the concept of sovereignty.',
      note: 'Add a sentence on why this matters to today\'s reader — what would a non-historian gain from knowing this?',
      status: 'pending',
      createdAt: 2026-05-13T17:42:00Z,
      updatedAt: 2026-05-13T17:42:00Z,
    }

### Sample regen prompt (variable suffix)

    Comments to apply to this module (in no particular order):

    1. Quoted passage: "The Treaty of Westphalia, signed in 1648, ended the Thirty Years' War."
       User comment: Add a sentence on why this matters to today's reader — what would a non-historian gain from knowing this?

    2. Quoted passage: "These structures persisted into the modern era."
       User comment: This is too vague — name two specific structures and one country where each survives today.

    You are editing — not rewriting — this module. Apply each user comment to the
    passage it quotes, plus the minimum surrounding text required to keep the prose
    coherent. Do not modify any passage that is not directly addressed by a comment.
    Preserve voice, structure, headings, ordering, paragraph breaks, and information
    density of the original. Output the full edited module as markdown. Do not add
    a preamble or explanation; output only the module body.

### Notes on prompt caching

The stable prefix (course context + full syllabus + prior modules + original module content) is identical across successive regens of the same module within a session. Applying `cacheControl: { type: 'ephemeral' }` to its last message lets Anthropic cache the prefix for ~5 minutes. The variable suffix (the annotations + edit instruction) is small. Net effect: a user iterating on the same module — comment, regen, read, comment again, regen — pays the full prefix only on the first regen.

## Interfaces and Dependencies

At the end of this plan, the following named interfaces must exist:

- **Prisma model `ModuleAnnotation`** with fields exactly as specified in Plan of Work / M1.
- **`AnnotationStatus` enum** with values `pending`, `applied`, `dismissed`.
- **`createAnnotation(input)`** in `features/course/actions/annotation.ts`:
  - Input: `{ moduleId: string, quotedText: string, contextBefore: string, contextAfter: string, note: string }`
  - Returns: the created `ModuleAnnotation` row.
- **`deleteAnnotation(input)`** in same file: `{ annotationId: string }` → `void`.
- **`listModuleAnnotations(moduleId: string)`** in same file: returns pending annotations only, ordered by `createdAt asc`.
- **`relocateAnnotations(newContent, annotations)`** in `features/course/relocate-annotations.ts`:
  - Input: `newContent: string`, `annotations: { id: string; quotedText: string }[]`.
  - Returns: `{ stillPresentIds: string[]; appliedIds: string[] }`.
- **`buildModuleRegenPromptParts(input)`** in `features/course/prompts/module-regenerate.ts`:
  - Input: `{ course, syllabus, priorModules, originalContent, annotations }`.
  - Returns: `[stablePrefix: string, variableSuffix: string]`.
- **Route `POST /api/modules/regenerate`** at `app/api/modules/regenerate/route.ts`:
  - Body: `{ moduleId: string }`.
  - Response: text/plain stream of the new module markdown.
  - Side effects: persists new content + status, updates annotation statuses, applies prompt caching.

External dependencies added:

- `mark.js` and `@types/mark.js`

Existing dependencies relied on:

- `ai`, `@ai-sdk/anthropic`, `@ai-sdk/react` (for `streamText`, `useCompletion`)
- `@anthropic-ai/sdk` (for `cacheControl`)
- `zod` (action input validation)
- `@prisma/client` (DB access)
- `react-markdown`, `remark-gfm` (existing markdown rendering — the annotation layer wraps the rendered output, does not modify the renderer)

No environment variables added; this feature uses the same `ANTHROPIC_API_KEY` and `DATABASE_URL` as initial generation.
