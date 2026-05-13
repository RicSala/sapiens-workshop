# EPUB Export — Library Choice and Pipeline

How Slice 4 generates `.epub` files: what we picked, why, and what we deliberately punted on.

Status: design — to be implemented in Slice 4.
Date: 2026-05-13.

---

## 1. What we're solving

The user clicks "Download EPUB" on `/courses/[id]` and gets a valid `.epub` of the finished course. Same artifact is later attached to the email in Slice 5.

Requirements at this stage:
- **On-demand**, inside a Next.js Route Handler. The course lives in Postgres; the response is a download stream to the browser.
- **Serverless-friendly**. We deploy on Vercel; no Pandoc binary, no Puppeteer Chrome layer, no filesystem assumptions.
- **Buffer in memory**, not a file written to disk. The same Buffer feeds both the HTTP response and Resend's attachment field.
- **Text-only for now**. Modules are markdown strings (`Module.content`). No images, no Mermaid, no embedded fonts.
- **One library, swappable**. We want a clean seam so we can replace the implementation without churning callers when the content model evolves.

Out of scope for this slice (kept in mind so the seam fits them later):
- Images, Mermaid diagrams, callouts, syntax highlighting.
- Tiptap JSON as the source format (see §6).
- Cover designer, accessibility metadata, embedded fonts.
- EPUB validation in CI.

---

## 2. Constraints worth naming

- **Runtime**: Node, not Edge. We already rely on `Buffer`, Prisma, and `@vercel/blob`.
- **Input format today**: markdown string per module, rendered client-side via `react-markdown` + `remark-gfm` (`lib/markdown/index.tsx`). The EPUB pipeline needs its own markdown→HTML step because `react-markdown` is `"use client"`.
- **Input format tomorrow**: Tiptap JSON (see `docs/content-architecture.md` §3.1). The EPUB layer should not care which one is canonical.
- **Single-user app**. No throughput pressure. A 3-second export is fine. We optimize for simplicity, not latency.
- **No subscriptions**. Anything that needs a paid SaaS to produce a local file is rejected by default.

---

## 3. Alternatives considered

Full analysis from the conversation that produced this doc; recorded here so we don't re-litigate.

### 3.1 `epub-gen-memory` (npm)
In-memory EPUB builder. HTML strings in, `Buffer`/`Blob` out. JSZip under the hood, no native deps. Covers cover image, global CSS, TOC, EPUB 2/3, optional font embedding, automatic remote image fetching. Last published ~12 months ago — low activity but stable; this is a "done" library, not a dying one.

### 3.2 `@lesjoursfr/html-to-epub` (npm)
Maintained fork of the deprecated `epub-gen`. First-class TypeScript, similar API. Slightly heavier (image utilities, optional ImageMagick). Marginal upside over §3.1 for a text-only course.

### 3.3 Hand-rolled with `jszip`
~150–200 lines: write `mimetype`, `META-INF/container.xml`, `OEBPS/content.opf` (metadata + manifest + spine), `OEBPS/nav.xhtml`, and one XHTML per chapter. Zero abstraction surprises, smallest dependency footprint. Costs ~½ to 1 day to ship cleanly and pass `epubcheck`. The main pitfalls are getting the `mimetype` ZIP entry exactly right (stored, first), well-formed XHTML, and EPUB 3 metadata (`dcterms:modified` etc.).

### 3.4 Tiptap Conversion REST API
Official Tiptap endpoint: `POST /v2/convert/export/epub` accepts Tiptap JSON, returns `.epub`. Requires a paid Tiptap subscription (Start plan, JWT + App ID from Tiptap Cloud). Vendor lock-in for a fundamentally local operation. Legacy `@tiptap-pro/extension-export` is being sunset in 2026.

### 3.5 Pandoc CLI
What `expirytracker` uses (`scripts/build-learning-epub.sh`): markdown files → Pandoc → `.epub`. Excellent typography, mature, callouts/Mermaid via preprocessors. Wrong shape for our use case: it's a local CLI workflow against files on disk, not an on-demand HTTP endpoint. Can't shell out from Vercel serverless.

### 3.6 Pandoc WASM
Pandoc 3.9+ compiles to WebAssembly and runs in the browser. Excellent output quality but a 10–20MB WASM payload; cold-start cost is brutal for an export button. Overkill for ~10 modules of text.

---

## 4. Decision

**Use `epub-gen-memory` for Slice 4.** Wrap it behind `lib/epub.ts` so the library can be swapped without touching callers.

### Reasoning

| Criterion | epub-gen-memory | @lesjoursfr | Hand-rolled JSZip | Tiptap API | Pandoc CLI | Pandoc WASM |
|---|---|---|---|---|---|---|
| Fits Vercel serverless | ✅ | ✅ | ✅ | ✅ (network) | ❌ | ⚠️ (huge cold start) |
| Returns Buffer in-memory | ✅ | ✅ (via `genEpub()`) | ✅ | ✅ | ❌ | ✅ |
| Zero infra dependency | ✅ | ✅ | ✅ | ❌ paid SaaS | ❌ system binary | ⚠️ WASM bundle |
| Time-to-MVP | hours | hours | ~1 day | hours | n/a | days |
| Future image support | native | native | manual | yes | yes | yes |
| Mature / maintained | low activity, stable | active | n/a | first-party | first-party | first-party |

epub-gen-memory wins on **time-to-working-export** for a use case that doesn't yet need anything fancy. The downside (low activity) is mitigated by the `lib/epub.ts` seam: if it ever breaks under us, we swap implementations and re-test, not rewrite the feature.

### What this decision is NOT

- **Not a forever choice.** It's an MVP choice. We expect to revisit when (a) we move to Tiptap JSON, (b) we add images/Mermaid/callouts, or (c) we hit a bug we can't work around.
- **Not a commitment to its API surface in our app code.** Callers will not import `epub-gen-memory` directly — they import from `lib/epub.ts`.
- **Not a rejection of Pandoc forever.** If we later build an offline / CLI export path (e.g., a "publish to a bookstore" workflow), Pandoc via the `expirytracker` pattern is the right answer for that path.

---

## 5. Architecture

### 5.1 Module shape

```
features/epub/                            ← isolated feature module, sibling to features/course/
  build-epub.ts          buildEpub(course): Promise<{ bytes, filename, title }>
  markdown-to-html.ts    moduleContentToHtml(md) — single seam for source-format changes
  slugify.ts             slugifyForFilename(title)
  send-to-kindle.ts      Server Action used by the buttons + dev page
  components/
    download-epub-button.tsx       drop-in: <DownloadEpubButton courseId />
    send-to-kindle-button.tsx      drop-in: <SendToKindleButton courseId /> (toasts feedback)
    course-export-controls.tsx     drop-in: <CourseExportControls courseId /> (cluster of the two)
  index.ts               public exports (server-side helpers only; components are
                         imported from their files; the server action too, per
                         the project convention)

app/courses/[id]/epub/route.ts            ← GET: load course → buildEpub → stream Response
app/dev/epub/page.tsx                     ← standalone dev page: Download / Send-to-Kindle
```

The drop-in components only require `courseId`. They accept optional
`size` / `variant` / `className` / `disabled` / `label` so they fit any
visual context — useful when multiple module-component variants need
the same controls without each variant re-implementing them.

Touch surface in existing files: only `.env.example` and `package.json`. No edits to
`features/course/`, `app/courses/[id]/page.tsx`, the course reader, the syllabus
editor, or any shared layout. The "Download EPUB" button on `/courses/[id]` is
deliberately deferred — see §5.5.

### 5.2 The `moduleContentToHtml` seam

This is the single function that needs to change when the content model evolves.
Lives in `features/epub/markdown-to-html.ts`.

```ts
// Today: Module.content is a markdown string
export function moduleContentToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false });
}

// Future: Module.contentJson is Tiptap JSON
export function moduleContentToHtml(json: TiptapJson): string {
  return generateHTML(json, extensions); // @tiptap/html
}
```

Everything downstream — chapter ordering, TOC, metadata, archive packaging — stays identical.

### 5.3 Markdown→HTML choice

`react-markdown` is client-only, so the EPUB path needs its own renderer. Two reasonable choices:
- **`marked`** — tiny, simple, fast. Recommended for the MVP.
- **`unified`** (`remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-stringify`) — same plugin family as the client renderer. Use if we want guaranteed output parity (rare in practice, but the option exists).

We pick `marked` for the MVP. If we later need a remark plugin (e.g., for callout directives), we switch to `unified` and the rest of the pipeline is unaffected.

### 5.4 Library options we use

```ts
await epub({
  title: course.title ?? course.topic,
  author: "Sapiens Workshop",
  lang: toShortLangCode(course.language),   // "English" → "en", "Spanish" → "es"
  tocTitle: "Contents",
  version: 3,
  // No css yet — readers' default styling is fine for the MVP.
  // No cover yet — empty cover is acceptable.
}, chapters);
```

Chapters:

```ts
const chapters = course.modules
  .sort((a, b) => a.order - b.order)
  .filter((m) => m.status === "ready" && m.content)
  .map((m) => ({
    title: m.title,
    content: moduleContentToHtml(m.content),  // HTML string, NOT markdown
  }));
```

Response (route handler — note the `new Uint8Array(bytes)` to satisfy the
`BodyInit` typing for Buffer):

```ts
return new Response(new Uint8Array(built.bytes), {
  headers: {
    "Content-Type": "application/epub+zip",
    "Content-Disposition": `attachment; filename="${built.filename}"`,
    "Content-Length": String(built.bytes.byteLength),
  },
});
```

### 5.5 Verification surface

`/dev/epub` is a standalone page that lists courses with **Download** and
**Send to Kindle** buttons. Lives entirely under `app/dev/epub/` — separate
route segment, no shared file with `/courses/[id]`. Removable in one
`rm -rf app/dev/epub/` when the real "Download EPUB" button lands on the
course reader (Slice 5 territory).

Kindle send uses Resend with the EPUB as an attachment. Three env vars must
all be set, otherwise the Send-to-Kindle button is disabled and the page
explains why:

```
RESEND_API_KEY=...
EMAIL_FROM=Sapiens <noreply@yourdomain.com>   # domain on Amazon's "Approved
                                              # Personal Document E-mail List"
KINDLE_EMAIL=youraddress@kindle.com
```

Modern Kindles accept `.epub` natively (since late 2022) — no "convert" subject
trick needed.

---

## 6. Capability map: what `epub-gen-memory` can and can't do for us

Recorded so future work knows where the library helps and where we own the rendering.

| Capability | Status | Where the work lives |
|---|---|---|
| Multi-chapter EPUB with TOC | library | options + chapter array |
| Cover image | library | `cover: url \| File` option |
| Global CSS | library | `css: string` option |
| Embedded fonts | library | `fonts: [{filename, url}]` |
| External `<a>` links (open in reader's browser) | works natively in readers | just emit `<a href="https://...">` |
| Internal cross-chapter links | works natively in readers | emit `<a href="chapterN.xhtml#id">` |
| Remote images (auto-fetch + embed) | library | `<img src="https://...">` in chapter HTML |
| Mermaid diagrams | **ours** | pre-render to SVG with `mermaid` + `jsdom`, inline as `<svg>` or embed as image |
| Syntax-highlighted code | **ours** | render with `shiki` server-side (static HTML, no client JS) |
| Callouts / admonitions | **ours** | render in the markdown→HTML step to styled `<aside>` blocks + CSS |
| Footnotes | **ours** | standard HTML anchor pattern |
| Tables | **ours** (output) | markdown→HTML gives us tables for free |
| Page break between chapters | library | automatic — each chapter is its own XHTML |
| EPUB 2 vs 3 toggle | library | `version` option |
| Custom OPF metadata, EPUB semantics (`epub:type=...`), accessibility metadata | **not supported** | would require hand-rolled JSZip — revisit if needed |
| Validate with `epubcheck` | **ours** | not part of CI yet; manual spot-check in Apple Books / Thorium for the MVP |

Two principles to keep in mind for future work:
1. **EPUB readers strip `<script>`**. Anything dynamic must be pre-rendered on the server.
2. **The library transforms HTML, not markdown**. Every visual feature lives in our markdown-to-HTML (or JSON-to-HTML) pipeline.

---

## 7. When to revisit this decision

Trigger any of these and we re-open the choice:

- **Tiptap JSON migration** lands. The `toChapterHtml` seam absorbs the source change without re-evaluating the library — but it's a natural moment to check whether the library still fits, especially if we add custom Tiptap nodes that need semantic EPUB markup.
- **Custom EPUB semantics** become important (e.g., `epub:type="chapter"`, accessibility metadata, page lists). epub-gen-memory doesn't expose these; hand-rolled JSZip does.
- **`epub-gen-memory` development stalls hard** or starts breaking on new Node versions. Drop-in alternative: `@lesjoursfr/html-to-epub`.
- **We want an offline / CLI export path**. Pandoc via the `expirytracker` pattern becomes the right tool, separate from the in-app endpoint.
- **`epubcheck` errors keep cropping up** on real reader devices. That's a sign we want to own the XHTML/OPF generation directly.

---

## 8. Reconciliation with `content-architecture.md`

`docs/content-architecture.md` §3.5 sketches a future "Tiptap JSON → HTML → Pandoc → .epub" pipeline. That document describes the long-term target where Tiptap JSON is the canonical content store.

This doc covers the **Slice 4 implementation**, which:
- runs against today's markdown content,
- runs in-process inside a Vercel route handler (so Pandoc is replaced by a Node library), and
- is deliberately swappable so the content-architecture target remains reachable by changing `toChapterHtml` (and optionally the library) — not by rewriting the export feature.

When the Tiptap migration happens, the content-architecture doc's "Pandoc" mention should be re-evaluated against this doc's library choice. The two paths converge once the seam is in place; the only open question at that point is whether to keep `epub-gen-memory`, swap to a more capable library, or fall back to a hand-rolled JSZip implementation.

---

## 9. Dependencies

Installed in this slice:

- `epub-gen-memory` — EPUB packaging
- `marked` — markdown → HTML on the server (until Tiptap JSON lands)
- `resend` — used by the Kindle send action

No system binaries. No native modules. Plays with Node and serverless out of the box.
