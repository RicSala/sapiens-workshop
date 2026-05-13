import { db } from "@/lib/db";

export async function maybeFinalizeCourse(courseId: string) {
  const counts = await db.module.groupBy({
    by: ["status"],
    where: { courseId },
    _count: { _all: true },
  });
  const byStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  );
  const stillWorking =
    (byStatus.pending ?? 0) + (byStatus.generating ?? 0) > 0;
  if (stillWorking) return;

  await db.course.update({
    where: { id: courseId },
    data: { status: (byStatus.failed ?? 0) > 0 ? "failed" : "ready" },
  });
}
