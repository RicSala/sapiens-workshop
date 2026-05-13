"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  CreateAnnotationSchema,
  DeleteAnnotationSchema,
} from "@/features/course/schemas";

export async function createAnnotation(
  input: z.input<typeof CreateAnnotationSchema>,
) {
  const data = CreateAnnotationSchema.parse(input);

  const mod = await db.module.findUnique({
    where: { id: data.moduleId },
    select: { id: true, courseId: true, status: true },
  });
  if (!mod) throw new Error("Module not found");
  if (mod.status !== "ready") {
    throw new Error("Annotations can only be added to ready modules");
  }

  const row = await db.moduleAnnotation.create({ data });

  revalidatePath(`/courses/${mod.courseId}`);

  return row;
}

export async function deleteAnnotation(
  input: z.input<typeof DeleteAnnotationSchema>,
) {
  const { annotationId } = DeleteAnnotationSchema.parse(input);

  const row = await db.moduleAnnotation.findUnique({
    where: { id: annotationId },
    select: { id: true, module: { select: { courseId: true } } },
  });
  if (!row) return;

  await db.moduleAnnotation.delete({ where: { id: annotationId } });

  revalidatePath(`/courses/${row.module.courseId}`);
}

export async function listModuleAnnotations(moduleId: string) {
  return db.moduleAnnotation.findMany({
    where: { moduleId, status: "pending" },
    orderBy: { createdAt: "asc" },
  });
}
