---
name: design-variants
description: 'Scaffold 3 alternative designs for a component or page with a floating in-browser switcher driven by the URL (?v=1|2|3), then collapse back to a single chosen design on cleanup. Use when the user asks to "try different designs", "explore design variations", "iterate on the design", "compare layouts", or invokes /design-variants. Has two modes: generate (default) and cleanup.'
---

## Purpose

Let the user A/B/C three different visual/UX directions for the same component or page, with a minimal, throwaway in-browser switcher. Once they pick a winner, this skill cleans up so only the winning design remains.

This is a **temporary artifact**. Code added here is meant to be removed by `cleanup` mode — keep the footprint small.

## Modes

- **generate** (default): scaffold variants + selector for the targets the user names.
- **cleanup**: keep the chosen variant, remove the rest and the selector.

Infer the mode from the user's request. If unclear, ask.

---

## Generate mode

### 1. Confirm the targets

The user must name one or more files (pages or components). If they didn't, ask which paths. Don't invent targets.

For each target, **read the file first** and note: what data it renders, whether it's a server or client component, whether it does data fetching, and which UI primitives it uses (e.g. shadcn under `components/ui`).

Check `components.json` + `tailwind.config.*` to see which UI library/tokens are available. Variants must use the project's idioms — don't introduce new dependencies.

### 2. For each target file `<dir>/<Name>.tsx`

**a. Back up the original** to `<dir>/<Name>.original.tsx`. Copy verbatim, but remove the `default` export keyword if leaving it would create a duplicate route (for `page.original.tsx`, `layout.original.tsx`, etc. — these are not Next.js route files, but rename their default export to a named export to be safe and avoid accidental imports).

**b. Create 3 variants** at `<dir>/<Name>.v1.tsx`, `.v2.tsx`, `.v3.tsx`. Each must:

- Export a `default` with the **same signature** as the original (same props, same return type).
- Render the **same data and behaviour** as the original. Behaviour parity is the contract — only the visual/structural treatment differs.
- Take genuinely different design directions. Avoid cosmetic deltas. Examples of meaningfully different takes for a list page: `v1` = dense data table, `v2` = card grid with cover images, `v3` = editorial hero + featured + rest. Pick directions that fit the content.
- Reuse existing UI primitives idiomatically. If shadcn is installed, use it.

**c. Replace the original file with a dispatcher.** Two templates:

**Template A — Next.js App Router `page.tsx`:**

```tsx
import V1 from './page.v1'
import V2 from './page.v2'
import V3 from './page.v3'
import DesignSelector from '@/components/_design-selector'

type PageProps = {
  searchParams: Promise<{ v?: string } & Record<string, string | string[] | undefined>>
  // include `params` here too if the original page had dynamic segments
}

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams
  const v = sp.v ?? '1'
  const Variant = v === '3' ? V3 : v === '2' ? V2 : V1
  return (
    <>
      <Variant />
      <DesignSelector variants={['1', '2', '3']} />
    </>
  )
}
```

If the original page had `params` or other props, forward them to `<Variant />`. If the original did server-side data fetching at the top of the page, **move that fetch into each variant** so the dispatcher stays trivial — or leave it in the dispatcher and pass results down. Pick whichever is less invasive for the case at hand.

**Template B — regular component:**

```tsx
'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import V1 from './<Name>.v1'
import V2 from './<Name>.v2'
import V3 from './<Name>.v3'
import DesignSelector from '@/components/_design-selector'

type Props = React.ComponentProps<typeof V1>

function Dispatcher(props: Props) {
  const v = useSearchParams().get('v') ?? '1'
  const Variant = v === '3' ? V3 : v === '2' ? V2 : V1
  return (
    <>
      <Variant {...props} />
      <DesignSelector variants={['1', '2', '3']} />
    </>
  )
}

export default function <Name>(props: Props) {
  return (
    <Suspense fallback={null}>
      <Dispatcher {...props} />
    </Suspense>
  )
}
```

The `Suspense` wrap is required because `useSearchParams()` triggers a Next.js build-time warning otherwise.

**Caveat:** template B forces the component to be a client component. If the original was a server component doing async work, port that work into each variant (each variant can be a server component on its own — but its parent dispatcher being a client component means the variants must also be client, or be passed in as `children` from a server parent — pick the smaller refactor and flag the tradeoff to the user before writing).

### 3. Create the selector once

Create `components/_design-selector.tsx` (the underscore marks it as temporary). If it already exists from a previous run, leave it alone.

```tsx
'use client'
import { Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

function Inner({ variants }: { variants: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const current = sp.get('v') ?? variants[0]

  function pick(v: string) {
    const next = new URLSearchParams(sp.toString())
    next.set('v', v)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        background: 'rgba(20,20,20,0.92)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: 10,
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      }}
    >
      <span style={{ opacity: 0.6, marginRight: 4 }}>design</span>
      {variants.map((v) => (
        <button
          key={v}
          onClick={() => pick(v)}
          style={{
            background: v === current ? 'white' : 'transparent',
            color: v === current ? 'black' : 'white',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 6,
            padding: '4px 10px',
            cursor: 'pointer',
            fontWeight: v === current ? 600 : 400,
          }}
        >
          v{v}
        </button>
      ))}
    </div>
  )
}

export default function DesignSelector({ variants }: { variants: string[] }) {
  return (
    <Suspense fallback={null}>
      <Inner variants={variants} />
    </Suspense>
  )
}
```

Inline styles on purpose: zero coupling to the project's design tokens, so cleanup is a single file delete.

### 4. Record a manifest

Write `.claude/design-variants/manifest.json` (create the directory if missing). If a manifest already exists, **append** to its `targets` array rather than overwriting.

```json
{
  "createdAt": "<ISO timestamp>",
  "selector": "components/_design-selector.tsx",
  "targets": [
    {
      "dispatcher": "app/courses/page.tsx",
      "original": "app/courses/page.original.tsx",
      "variants": [
        "app/courses/page.v1.tsx",
        "app/courses/page.v2.tsx",
        "app/courses/page.v3.tsx"
      ]
    }
  ]
}
```

### 5. Verify and hand off

Per `AGENTS.md`:

- Run typecheck (`npx tsc --noEmit` or the project's script).
- Run eslint.
- Run `build` if the changes are non-trivial.

Then tell the user (in 1–3 lines):

- Which files were created.
- How to switch: append `?v=2` or `?v=3` to the URL, or click the floating widget bottom-right.
- That cleanup runs by saying e.g. "keep v2" or `/design-variants cleanup 2`.

---

## Cleanup mode

Triggered by phrases like "keep v2", "go with variant 3", "lock in the second design", `/design-variants cleanup 1`, etc.

### 1. Read the manifest

Read `.claude/design-variants/manifest.json`. If missing, tell the user there's nothing to clean up and stop.

### 2. Confirm the choice

If the user didn't state which variant to keep, ask. Don't guess.

### 3. For each entry in `targets`

- Read the chosen `<Name>.v<chosen>.tsx`.
- Overwrite the dispatcher (`<Name>.tsx`) with its contents.
  - Remove any leftover variant-specific cruft (no imports of other variants, no `DesignSelector`, etc. — variants shouldn't reference these, but verify).
  - If the original was a server component and the chosen variant has `'use client'` that isn't actually needed, leave it — don't speculatively edit. Only remove if you can prove it's unused.
- Delete the other `.vN.tsx` files and the `.original.tsx` backup.

### 4. Delete the selector

Delete `components/_design-selector.tsx`.

### 5. Delete the manifest

Delete `.claude/design-variants/manifest.json`. If `.claude/design-variants/` is empty, remove the directory.

### 6. Verify

Typecheck + eslint per `AGENTS.md`. Build if changes are non-trivial.

### 7. Report

Tell the user what was kept and what was removed, in one or two lines.

---

## Notes

- Variants must be behaviourally identical — same data, same interactions, same accessibility. Only the design differs.
- Don't let the dispatcher grow. If you find yourself adding logic to it beyond picking the variant, that logic belongs in each variant or in a shared helper.
- Don't commit while in generate mode unless the user explicitly asks. This is meant to be a short-lived branch state.
- If a previous run left a stale manifest pointing at files that no longer exist, tell the user before doing anything destructive.
