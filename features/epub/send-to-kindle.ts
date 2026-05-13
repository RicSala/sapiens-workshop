"use server";

import { Resend } from "resend";
import { db } from "@/lib/db";
import { buildEpub } from "./build-epub";

export type SendToKindleResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

export async function sendCourseToKindle(
  courseId: string,
): Promise<SendToKindleResult> {
  const kindleEmail = process.env.KINDLE_EMAIL;
  const from = process.env.EMAIL_FROM;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };
  if (!from) return { ok: false, error: "EMAIL_FROM not configured" };
  if (!kindleEmail) return { ok: false, error: "KINDLE_EMAIL not configured" };

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        select: {
          order: true,
          title: true,
          content: true,
          status: true,
        },
      },
    },
  });
  if (!course) return { ok: false, error: "Course not found" };

  let built;
  try {
    built = await buildEpub(course);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to build EPUB",
    };
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: kindleEmail,
    subject: built.title,
    text: `Your deepdive: ${built.title}`,
    attachments: [
      {
        filename: built.filename,
        content: built.bytes,
      },
    ],
  });

  if (result.error) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, id: result.data?.id ?? null };
}
