import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { CourseGenerateButton } from "@/features/course/components/course-generate-button";
import { CourseReader } from "@/features/course/components/course-reader";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          audio: true,
          annotations: {
            where: { status: "pending" },
            orderBy: { createdAt: "asc" },
            select: { id: true, quotedText: true, note: true },
          },
        },
      },
    },
  });
  if (!course) notFound();

  // Before generation has been started there's nothing to read yet — show
  // a friendly empty state pointing the user at the syllabus.
  const notStarted =
    course.status === "draft" || course.status === "syllabus_ready";

  if (notStarted) {
    const hasSyllabus = course.modules.length > 0;
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight leading-[1.1]">
            {course.title ?? course.topic}
          </h1>
          <p className="text-sm text-muted-foreground">{course.topic}</p>
        </header>
        <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border px-6 py-10">
          <p className="text-sm text-muted-foreground">
            Your course will appear here after the modules are generated.
            {hasSyllabus
              ? " Review the syllabus or kick off generation now."
              : " Open the syllabus to draft the outline first."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant={hasSyllabus ? "outline" : "default"}>
              <Link href={`/courses/${course.id}/syllabus`}>
                Open syllabus →
              </Link>
            </Button>
            {hasSyllabus && <CourseGenerateButton courseId={course.id} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <CourseReader
      course={{
        id: course.id,
        title: course.title,
        topic: course.topic,
        audience: course.audience,
        status: course.status,
        targetModuleCount: course.targetModuleCount,
        targetWordsPerModule: course.targetWordsPerModule,
      }}
      initialModules={course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        summary: m.summary,
        status: m.status,
        content: m.content,
        errorMessage: m.errorMessage,
        audio: m.audio
          ? { url: m.audio.blobUrl, mime: m.audio.mime }
          : null,
        annotations: m.annotations,
      }))}
    />
  );
}
