"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  SyllabusOutline,
  type ModuleDraft,
} from "@/features/course/components/syllabus-outline";
import {
  addModule,
  deleteModule,
  moveModule,
  updateModule,
} from "@/features/course/actions/module";
import { CourseDeleteButton } from "@/features/course/components/course-delete-button";

type CourseProp = {
  id: string;
  topic: string;
  audience: string;
  tone: string;
  language: string;
  targetModuleCount: number;
  targetWordsPerModule: number;
  title: string | null;
  status: string;
  modules: ModuleDraft[];
};

type OptimisticAction =
  | { type: "add"; afterIndex: number; tempId: string }
  | { type: "delete"; moduleId: string }
  | { type: "move"; fromIndex: number; toIndex: number }
  | {
      type: "update";
      moduleId: string;
      patch: { title?: string; summary?: string };
    };

function reducer(
  modules: ModuleDraft[],
  action: OptimisticAction,
): ModuleDraft[] {
  switch (action.type) {
    case "add": {
      const at = action.afterIndex + 1;
      const next = [...modules];
      next.splice(at, 0, { id: action.tempId, title: "", summary: "" });
      return next;
    }
    case "delete":
      return modules.filter((m) => m.id !== action.moduleId);
    case "move": {
      if (
        action.fromIndex < 0 ||
        action.fromIndex >= modules.length ||
        action.toIndex < 0 ||
        action.toIndex >= modules.length
      ) {
        return modules;
      }
      const next = [...modules];
      const [item] = next.splice(action.fromIndex, 1);
      next.splice(action.toIndex, 0, item);
      return next;
    }
    case "update":
      return modules.map((m) =>
        m.id === action.moduleId ? { ...m, ...action.patch } : m,
      );
  }
}

export function SyllabusEditor({ course }: { course: CourseProp }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic(course.modules, reducer);

  function onUpdateModule(
    index: number,
    patch: { title?: string; summary?: string },
  ) {
    const m = optimistic[index];
    if (!m) return;
    startTransition(async () => {
      applyOptimistic({ type: "update", moduleId: m.id, patch });
      await updateModule({ courseId: course.id, moduleId: m.id, ...patch });
    });
  }

  function onDeleteModule(index: number) {
    const m = optimistic[index];
    if (!m) return;
    startTransition(async () => {
      applyOptimistic({ type: "delete", moduleId: m.id });
      await deleteModule({ courseId: course.id, moduleId: m.id });
    });
  }

  function onAddModule(afterIndex?: number) {
    const at = afterIndex == null ? optimistic.length - 1 : afterIndex;
    startTransition(async () => {
      applyOptimistic({
        type: "add",
        afterIndex: at,
        tempId: crypto.randomUUID(),
      });
      await addModule({ courseId: course.id, afterIndex: at });
    });
  }

  function onMoveModule(fromIndex: number, toIndex: number) {
    startTransition(async () => {
      applyOptimistic({ type: "move", fromIndex, toIndex });
      await moveModule({ courseId: course.id, fromIndex, toIndex });
    });
  }

  function onGenerateModules() {
    const incomplete = optimistic.some(
      (m) => !m.title?.trim() || !m.summary?.trim(),
    );
    if (incomplete) {
      toast.warning("Every module needs a title and summary before generating.");
      return;
    }
    // The reader auto-starts streaming any non-ready modules on mount, so we
    // just navigate. No server-side coordinator action needed.
    router.push(`/courses/${course.id}`);
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <SyllabusOutline
        input={{
          topic: course.topic,
          audience: course.audience,
          tone: course.tone,
          language: course.language,
          targetModuleCount: course.targetModuleCount,
          targetWordsPerModule: course.targetWordsPerModule,
        }}
        title={course.title ?? undefined}
        modules={optimistic}
        isLoading={false}
        onAddModule={onAddModule}
        onDeleteModule={onDeleteModule}
        onMoveModule={onMoveModule}
        onUpdateModule={onUpdateModule}
      />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-6 py-3">
          <span className="text-xs text-muted-foreground">
            {optimistic.length} module{optimistic.length === 1 ? "" : "s"} ·
            saved
          </span>
          <div className="flex items-center gap-2">
            <CourseDeleteButton courseId={course.id} />
            <Button
              size="sm"
              onClick={onGenerateModules}
              disabled={optimistic.length === 0}
            >
              Generate modules →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
