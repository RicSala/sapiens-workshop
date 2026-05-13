import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SyllabusEditor } from "./_components/syllabus-editor";

export const dynamic = "force-dynamic";

export default async function SyllabusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
    include: { modules: { orderBy: { order: "asc" } } },
  });
  if (!course) notFound();

  return (
    <SyllabusEditor
      course={{
        id: course.id,
        topic: course.topic,
        audience: course.audience,
        tone: course.tone ?? "neutral",
        language: course.language,
        targetModuleCount: course.targetModuleCount,
        targetWordsPerModule: course.targetWordsPerModule,
        title: course.title,
        status: course.status,
        modules: course.modules.map((m) => ({
          id: m.id,
          title: m.title,
          summary: m.summary,
        })),
      }}
    />
  );
}
