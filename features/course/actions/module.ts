"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { delBlob } from "@/features/course/blob";

const AddSchema = z.object({
  courseId: z.string().min(1),
  /** -1 = insert at the very top. Otherwise insert after this 0-based index. */
  afterIndex: z.number().int().min(-1),
  title: z.string().trim().max(500).optional(),
  summary: z.string().trim().max(5000).optional(),
});

export async function addModule(input: z.input<typeof AddSchema>) {
  const { courseId, afterIndex, title, summary } = AddSchema.parse(input);
  const newOrder = afterIndex + 1;

  await db.$transaction(async (tx) => {
    await tx.module.updateMany({
      where: { courseId, order: { gte: newOrder } },
      data: { order: { increment: 1 } },
    });
    await tx.module.create({
      data: {
        courseId,
        order: newOrder,
        title: title ?? "",
        summary: summary ?? "",
        status: "pending",
      },
    });
  });

  revalidatePath(`/courses/${courseId}`);
}

const DeleteSchema = z.object({
  courseId: z.string().min(1),
  moduleId: z.string().min(1),
});

export async function deleteModule(input: z.input<typeof DeleteSchema>) {
  const { courseId, moduleId } = DeleteSchema.parse(input);

  const audio = await db.moduleAudio.findUnique({
    where: { moduleId },
    select: { blobPathname: true },
  });

  await db.$transaction(async (tx) => {
    const m = await tx.module.findUnique({
      where: { id: moduleId },
      select: { order: true, courseId: true },
    });
    if (!m || m.courseId !== courseId) return;
    await tx.module.delete({ where: { id: moduleId } });
    await tx.module.updateMany({
      where: { courseId, order: { gt: m.order } },
      data: { order: { decrement: 1 } },
    });
  });

  if (audio) {
    await delBlob(audio.blobPathname).catch(() => {});
  }

  revalidatePath(`/courses/${courseId}`);
}

const UpdateSchema = z.object({
  courseId: z.string().min(1),
  moduleId: z.string().min(1),
  title: z.string().trim().max(500).optional(),
  summary: z.string().trim().max(5000).optional(),
});

export async function updateModule(input: z.input<typeof UpdateSchema>) {
  const { courseId, moduleId, title, summary } = UpdateSchema.parse(input);
  const patch: { title?: string; summary?: string } = {};
  if (typeof title === "string") patch.title = title;
  if (typeof summary === "string") patch.summary = summary;
  if (Object.keys(patch).length === 0) return;

  await db.module.updateMany({
    where: { id: moduleId, courseId },
    data: patch,
  });

  revalidatePath(`/courses/${courseId}`);
}

const MoveSchema = z.object({
  courseId: z.string().min(1),
  fromIndex: z.number().int().min(0),
  toIndex: z.number().int().min(0),
});

export async function moveModule(input: z.input<typeof MoveSchema>) {
  const { courseId, fromIndex, toIndex } = MoveSchema.parse(input);
  if (fromIndex === toIndex) return;

  await db.$transaction(async (tx) => {
    const modules = await tx.module.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    if (
      fromIndex < 0 ||
      fromIndex >= modules.length ||
      toIndex < 0 ||
      toIndex >= modules.length
    ) {
      return;
    }
    const ordered = [...modules];
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);
    // Two-phase to avoid temporarily violating any future unique constraint.
    // First push them all into a negative range, then rewrite to final order.
    await Promise.all(
      ordered.map((m, i) =>
        tx.module.update({
          where: { id: m.id },
          data: { order: -1000 - i },
        }),
      ),
    );
    await Promise.all(
      ordered.map((m, i) =>
        tx.module.update({ where: { id: m.id }, data: { order: i } }),
      ),
    );
  });

  revalidatePath(`/courses/${courseId}`);
}
