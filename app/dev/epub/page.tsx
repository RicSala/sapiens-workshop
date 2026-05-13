import Link from "next/link";
import { db } from "@/lib/db";
import { CourseExportControls } from "@/features/epub/components/course-export-controls";

export const dynamic = "force-dynamic";

export default async function DevEpubPage() {
  const courses = await db.course.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      topic: true,
      status: true,
      createdAt: true,
      _count: { select: { modules: true } },
    },
  });

  const kindleConfigured =
    Boolean(process.env.KINDLE_EMAIL) &&
    Boolean(process.env.EMAIL_FROM) &&
    Boolean(process.env.RESEND_API_KEY);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Dev surface
        </p>
        <h1 className="text-3xl font-bold tracking-tight">EPUB verification</h1>
        <p className="text-sm text-muted-foreground">
          Download a course as EPUB to inspect locally (Apple Books, Thorium,
          Calibre), or send it to your Kindle for real-device verification.
        </p>
        {!kindleConfigured && (
          <p className="mt-2 rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            Kindle send is disabled: set <code>RESEND_API_KEY</code>,{" "}
            <code>EMAIL_FROM</code>, and <code>KINDLE_EMAIL</code> in{" "}
            <code>.env</code>.
          </p>
        )}
      </header>

      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No courses yet.{" "}
          <Link className="underline" href="/courses/new">
            Create one
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {courses.map((c) => {
            const canExport = c.status === "ready";
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {c.title ?? c.topic}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c._count.modules} modules · {c.status}
                  </div>
                </div>
                <CourseExportControls
                  courseId={c.id}
                  enableDownload={canExport}
                  enableSendToKindle={canExport && kindleConfigured}
                  className="shrink-0"
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
