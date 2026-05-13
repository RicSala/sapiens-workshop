"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { synthesize } from "@/features/course/tts";
import { putAudio, delBlob } from "@/features/course/blob";

const Input = z.object({
  moduleId: z.string().min(1),
  force: z.boolean().optional(),
});

export type AudioResult = {
  url: string;
  mime: string;
};

export async function synthesizeModuleAudio(
  input: z.input<typeof Input>,
): Promise<AudioResult> {
  const { moduleId, force } = Input.parse(input);

  const mod = await db.module.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      content: true,
      courseId: true,
      status: true,
      audio: true,
    },
  });

  if (!mod) throw new Error("Module not found");
  if (mod.status !== "ready" || !mod.content?.trim()) {
    throw new Error("Module is not ready or has no content");
  }

  if (mod.audio && !force) {
    return { url: mod.audio.blobUrl, mime: mod.audio.mime };
  }

  if (mod.audio && force) {
    await delBlob(mod.audio.blobPathname).catch(() => {});
    await db.moduleAudio.delete({ where: { moduleId } });
  }

  const buffer = await synthesize(mod.content);
  const pathname = `courses/${mod.courseId}/modules/${mod.id}.mp3`;
  const uploaded = await putAudio(pathname, buffer, "audio/mpeg");

  const row = await db.moduleAudio.create({
    data: {
      moduleId: mod.id,
      blobUrl: uploaded.url,
      blobPathname: uploaded.pathname,
      mime: "audio/mpeg",
    },
  });

  revalidatePath(`/courses/${mod.courseId}`);

  return { url: row.blobUrl, mime: row.mime };
}
