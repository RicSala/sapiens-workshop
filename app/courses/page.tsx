import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  syllabus_ready: "Syllabus ready",
  generating: "Generating",
  ready: "Ready",
  failed: "Failed",
};

export default async function CoursesPage() {
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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12 sm:py-16">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Courses</h1>
        <Button asChild>
          <Link href="/courses/new">New deepdive</Link>
        </Button>
      </header>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          No courses yet. Start one with the button above.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {courses.map((c) => (
            <li key={c.id}>
              <Link
                href={`/courses/${c.id}`}
                className="-mx-3 flex items-baseline justify-between gap-4 rounded-md px-3 py-4 hover:bg-foreground/5"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-medium leading-tight">
                    {c.title ?? c.topic}
                  </h2>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {c.topic} · {c._count.modules} module
                    {c._count.modules === 1 ? "" : "s"} ·{" "}
                    {STATUS_LABEL[c.status] ?? c.status}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {c.createdAt.toLocaleDateString()}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
