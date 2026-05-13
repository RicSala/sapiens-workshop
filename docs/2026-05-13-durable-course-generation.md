# Durable course generation: move syllabus/module streams off the request lifetime

> Move course generation from "Next.js streaming endpoint tied to the request" to a durable background job that streams progress to the client via pub/sub, so generation survives the user closing the tab.

**Date:** 2026-05-13
**Status:** open (leaning Upstash Workflow + Redis pub/sub)

## Context

Today, syllabus and module generation runs inside a Next.js route handler and streams tokens straight to the client. UX is good, but the work is tied to the request lifetime:

- If the user navigates away or closes the tab, the Next.js function aborts and generation stops.
- Nothing is persisted until generation completes, so an abandoned run produces no saved state.
- Also vulnerable to serverless function timeouts (Vercel: 5min hobby / 15min pro) for longer courses.

Goal: keep the streaming UX, but decouple "who is generating" from "who is watching" so a closed tab no longer kills the job, and partial progress is durable.

## Options considered

- **Resumable streams (AI SDK `experimental_resume` + Redis)** — Server writes the stream to Redis as it generates; client can reconnect mid-stream. Smallest diff from current code. **Rejected by user.** Doesn't actually solve the core problem: generation is still tied to the serverless request lifetime, so timeouts and "last client disconnected" still kill it.

- **Inngest + Redis pub/sub** — Durable background job runs in Inngest; chunks published to a `course:{id}` Redis channel; thin SSE endpoint relays to the client. Survives disconnects, timeouts, redeploys. Nicer DX than QStash (local dashboard). Cost: new dependency the user has never used.

- **Upstash Workflow + Redis pub/sub** — Same shape as the Inngest option, but built on QStash. Step-based workflows (one step per module fits naturally). Likely fewer new dependencies since the project may already have Upstash Redis. DX slightly more bare-bones than Inngest.

- **Trigger.dev Realtime** — Inngest competitor with built-in `useRealtimeRun` / `useRealtimeRunWithStreams` React hooks that stream task progress and AI tokens to the UI out of the box. Packages this exact use case.

- **Convex (chunked writes)** — Reactive DB; client subscribes to a doc, mutations push updates. Token-by-token writes are too granular (rate limits, full-doc resend per change), but chunked (paragraph / ~50 tokens) is fine. Persistence is free — closing the tab and resubscribing "just works". Rejected as the primary path because it means adopting Convex as a reactive layer alongside Prisma/Postgres — too heavy for one feature in an existing app.

- **Cloudflare Durable Objects** — One DO per course holds state + WebSocket. Technically the cleanest model. Not a fit: project is on Vercel/Next.js, not Workers.

- **Postgres LISTEN/NOTIFY (or Supabase Realtime)** — Worker writes chunks to Postgres, Postgres broadcasts to subscribed clients. Still requires a long-running worker (i.e. one of the queue options above), so doesn't stand alone here.

- **Long-running Node worker (Railway/Fly/Render)** — Boring/durable, but reintroduces "you now run and monitor a server" which serverless was meant to avoid.

## Decision

Leaning **Upstash Workflow + Upstash Redis pub/sub**. Not finalized — user has not yet committed.

Shape:
1. Course-generation request triggers an Upstash Workflow.
2. Workflow runs as durable steps: `generateSyllabus → generateModule(1) → generateModule(2) → ...`. Each step persists its output to the DB as soon as it finishes.
3. While a step generates, it publishes incremental chunks to a `course:{id}` Redis channel.
4. The client subscribes via a thin SSE endpoint that relays from Redis. Closing the tab kills only the SSE relay, not the workflow.
5. Returning users resubscribe to the same channel (live), or read the persisted DB state (catch-up).

## Rationale

- Solves the actual problem (durability across disconnects/timeouts) — unlike resumable streams.
- Likely reuses infra the project already has (Upstash Redis), minimizing new deps vs Inngest/Trigger.dev.
- Step-based workflow maps cleanly to the syllabus → modules structure; each module is a natural durable checkpoint already worth persisting.
- Much smaller architectural change than adopting Convex; doesn't require committing to a non-Vercel runtime like Durable Objects.
- DX tradeoff vs Inngest is acceptable for a single feature.

## Implications / next steps

- Verify whether Upstash Redis is already in this project (and whether a QStash/Workflow account exists).
- Inspect the current generation flow to plan the diff:
  - `features/course/components/course-reader.tsx`
  - `features/course/components/module-streaming-section.tsx`
  - `app/api/modules/regenerate/` (untracked) — may be relevant to module-level regeneration after the migration
  - `lib/ai/index.ts`
- Define the Redis channel naming convention: `course:{id}` (and maybe `course:{id}:module:{n}` for finer-grained subscriptions).
- Decide chunk granularity for publishes (token-by-token vs sentence/paragraph) — trade Redis throughput against UI smoothness.
- Decide DB write granularity for partial module output — per-module (simplest) vs per-section (better resume fidelity).
- Client: replace direct `fetch` streaming with an SSE subscription to the relay endpoint; on mount, hydrate from DB first, then attach to live stream if not yet finalized.
- Cancellation: define how a user-initiated "stop generating" propagates from client → workflow.

## Open questions

- Inngest vs Upstash Workflow final call — confirm Upstash after a quick DX spike, or shortlist Inngest as fallback.
- Should Trigger.dev Realtime get a second look before committing? Its hooks remove a lot of the SSE-relay glue.
- What happens to the in-flight Next.js streaming endpoints — do they get deleted, or kept as a fallback for non-durable use cases (e.g. chat)?
- Auth on the SSE relay: how do we authorize a subscriber for `course:{id}`?
- Cost model — Upstash QStash/Workflow pricing for long generations across many users.

## References

- Files mentioned in current state:
  - `features/course/components/course-reader.tsx`
  - `features/course/components/module-streaming-section.tsx`
  - `lib/ai/index.ts`
  - `app/api/modules/regenerate/` (untracked)
- External:
  - Upstash Workflow: https://upstash.com/docs/workflow
  - Upstash Redis pub/sub: https://upstash.com/docs/redis/features/pubsub
  - Inngest: https://www.inngest.com/
  - Trigger.dev Realtime: https://trigger.dev/docs/realtime
  - AI SDK resumable streams: https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence#resuming-ongoing-streams
