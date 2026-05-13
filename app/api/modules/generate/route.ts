import { streamText } from "ai";
import { moduleModel } from "@/lib/ai";
import { db } from "@/lib/db";
import {
  MODULE_SYSTEM,
  buildModuleUserPromptParts,
} from "@/features/course/prompts/module";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Body-based variant of the per-module generate endpoint, designed to play
// nicely with `useCompletion` (which sets `api` once at hook-init time).
// The path-based equivalent lives at /api/courses/[id]/modules/[moduleId]/generate.

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { moduleId?: string };
  const moduleId = body.moduleId;
  if (!moduleId) {
    return new Response("moduleId is required", { status: 400 });
  }

  const target = await db.module.findUnique({
    where: { id: moduleId },
    include: {
      course: {
        include: { modules: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!target) {
    return new Response("module not found", { status: 404 });
  }
  const course = target.course;
  if (!course.title) {
    return new Response("course has no title", { status: 400 });
  }

  await db.$transaction([
    db.module.update({
      where: { id: moduleId },
      data: { status: "generating", content: null, errorMessage: null },
    }),
    db.course.update({
      where: { id: course.id },
      data: { status: "generating" },
    }),
  ]);

  const syllabus = course.modules.map((m, i) => ({
    index: i + 1,
    title: m.title,
    summary: m.summary,
  }));
  const priorModules = course.modules
    .filter((m) => m.order < target.order && m.status === "ready")
    .map((m) => ({
      index: m.order + 1,
      title: m.title,
      content: m.content ?? "",
    }));

  const [stable, variable] = buildModuleUserPromptParts({
    course: {
      title: course.title,
      audience: course.audience,
      tone: course.tone,
      language: course.language,
      targetWordsPerModule: course.targetWordsPerModule,
    },
    syllabus,
    priorModules,
    current: {
      index: target.order + 1,
      title: target.title,
      summary: target.summary,
    },
  });

  const result = streamText({
    model: moduleModel,
    system: MODULE_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: stable,
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          { type: "text", text: variable },
        ],
      },
    ],
    onFinish: async ({ text }) => {
      try {
        await db.module.update({
          where: { id: moduleId },
          data: { status: "ready", content: text.trim() },
        });
        await maybeFinalizeCourse(course.id);
      } catch (err) {
        console.error("[generate-module-v2] onFinish persist failed", err);
      }
    },
    onError: async ({ error }) => {
      try {
        await db.module.update({
          where: { id: moduleId },
          data: {
            status: "failed",
            errorMessage:
              error instanceof Error ? error.message : String(error),
          },
        });
        await maybeFinalizeCourse(course.id);
      } catch (err) {
        console.error("[generate-module-v2] onError persist failed", err);
      }
    },
  });

  return result.toTextStreamResponse();
}

async function maybeFinalizeCourse(courseId: string) {
  const counts = await db.module.groupBy({
    by: ["status"],
    where: { courseId },
    _count: { _all: true },
  });
  const byStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  );
  const stillWorking =
    (byStatus.pending ?? 0) + (byStatus.generating ?? 0) > 0;
  if (stillWorking) return;

  await db.course.update({
    where: { id: courseId },
    data: { status: (byStatus.failed ?? 0) > 0 ? "failed" : "ready" },
  });
}
