import { streamText } from "ai";
import { moduleModel } from "@/lib/ai";
import { db } from "@/lib/db";
import {
  MODULE_REGEN_SYSTEM,
  buildModuleRegenPromptParts,
} from "@/features/course/prompts/module-regenerate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
      annotations: {
        where: { status: "pending" },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!target) {
    return new Response("module not found", { status: 404 });
  }
  if (target.status !== "ready" || !target.content) {
    return new Response(
      `module is not ready (status=${target.status}, hasContent=${!!target.content})`,
      { status: 409 },
    );
  }
  if (target.annotations.length === 0) {
    return new Response("module has no pending annotations", { status: 400 });
  }
  const course = target.course;
  if (!course.title) {
    return new Response("course has no title", { status: 400 });
  }

  // Single-module edit: do not touch Course.status.
  await db.module.update({
    where: { id: moduleId },
    data: { status: "generating", errorMessage: null },
  });

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

  const [stable, variable] = buildModuleRegenPromptParts({
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
    originalContent: target.content,
    annotations: target.annotations.map((a) => ({
      quotedText: a.quotedText,
      note: a.note,
    })),
  });

  // Every annotation that was sent into the regen is considered consumed once
  // the regen finishes, regardless of whether its quoted text still appears in
  // the new content. The user invoked regen WITH these comments — they're done.
  const consumedAnnotationIds = target.annotations.map((a) => a.id);

  const result = streamText({
    model: moduleModel,
    system: MODULE_REGEN_SYSTEM,
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
        const newContent = text.trim();
        await db.$transaction([
          db.module.update({
            where: { id: moduleId },
            data: { status: "ready", content: newContent },
          }),
          db.moduleAnnotation.updateMany({
            where: { id: { in: consumedAnnotationIds } },
            data: { status: "applied" },
          }),
        ]);
      } catch (err) {
        console.error("[regenerate-module] onFinish persist failed", err);
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
      } catch (err) {
        console.error("[regenerate-module] onError persist failed", err);
      }
    },
  });

  return result.toTextStreamResponse();
}
