"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { delBlob } from "@/features/course/blob";
import { SyllabusInputSchema } from "@/features/course/schemas";

const SaveDraftSchema = z.object({
  input: SyllabusInputSchema,
  title: z.string().trim().min(1).max(500),
  modules: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(500),
        summary: z.string().trim().min(1).max(5000),
      }),
    )
    .min(1)
    .max(50),
});

export async function saveCourseFromDraft(
  payload: z.input<typeof SaveDraftSchema>,
) {
  const parsed = SaveDraftSchema.parse(payload);
  const course = await db.course.create({
    data: {
      topic: parsed.input.topic,
      audience: parsed.input.audience,
      tone: parsed.input.tone,
      language: parsed.input.language,
      targetModuleCount: parsed.input.targetModuleCount,
      targetWordsPerModule: parsed.input.targetWordsPerModule,
      title: parsed.title,
      status: "syllabus_ready",
      modules: {
        create: parsed.modules.map((m, i) => ({
          order: i,
          title: m.title,
          summary: m.summary,
          status: "pending",
        })),
      },
    },
    select: { id: true },
  });
  revalidatePath("/courses");
  redirect(`/courses/${course.id}/syllabus`);
}

export async function startGeneration(courseId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { status: true, _count: { select: { modules: true } } },
  });
  if (!course) throw new Error("course not found");
  if (course._count.modules === 0) {
    throw new Error("no syllabus to generate from");
  }
  // Only bump from a pre-generation state; don't clobber an active or finished run.
  if (course.status === "draft" || course.status === "syllabus_ready") {
    await db.course.update({
      where: { id: courseId },
      data: { status: "generating" },
    });
  }
  revalidatePath(`/courses/${courseId}`, "layout");
}

export async function deleteCourse(courseId: string) {
  const audios = await db.moduleAudio.findMany({
    where: { module: { courseId } },
    select: { blobPathname: true },
  });
  await db.course.delete({ where: { id: courseId } });
  await Promise.all(
    audios.map((a) => delBlob(a.blobPathname).catch(() => {})),
  );
  revalidatePath("/courses");
  redirect("/courses");
}
