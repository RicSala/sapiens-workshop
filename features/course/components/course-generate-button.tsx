"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startGeneration } from "@/features/course/actions/course";

export function CourseGenerateButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await startGeneration(courseId);
      // revalidatePath in the action invalidates the cache; refresh forces the
      // current route to re-render with the new course status so the empty
      // state gives way to the streaming reader.
      router.refresh();
    });
  }

  return (
    <Button onClick={onClick} disabled={pending}>
      {pending ? "Starting…" : "Generate modules →"}
    </Button>
  );
}
