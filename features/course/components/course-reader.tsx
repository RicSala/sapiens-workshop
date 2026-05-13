"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CourseDeleteButton } from "@/features/course/components/course-delete-button";
import { CourseExportControls } from "@/features/epub/components/course-export-controls";
import {
  ModuleStreamingSection,
  type ModuleSnapshot,
} from "./module-streaming-section";

type Props = {
  course: {
    id: string;
    title: string | null;
    topic: string;
    audience: string;
    status: string;
    targetModuleCount: number;
    targetWordsPerModule: number;
  };
  initialModules: ModuleSnapshot[];
};

// Each module owns its own useCompletion() instance via ModuleStreamingSection.
// This component's only job is queue coordination: exactly one child has
// isActive=true at any moment, and `activeIndex` advances when a child reports
// success or failure.
export function CourseReader({ course, initialModules }: Props) {
  const router = useRouter();

  const [readyIds, setReadyIds] = useState<Set<string>>(
    () =>
      new Set(
        initialModules
          .filter((m) => m.status === "ready")
          .map((m) => m.id),
      ),
  );
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  const completed = useMemo(
    () => new Set<string>([...readyIds, ...failedIds]),
    [readyIds, failedIds],
  );

  const activeIndex = useMemo(
    () => initialModules.findIndex((m) => !completed.has(m.id)),
    [initialModules, completed],
  );

  const sessionDidWorkRef = useRef(false);

  function onSuccess(moduleId: string) {
    sessionDidWorkRef.current = true;
    setReadyIds((prev) => {
      const next = new Set(prev);
      next.add(moduleId);
      return next;
    });
    // A retry's success should clear any prior failure entry for this id.
    setFailedIds((prev) => {
      if (!prev.has(moduleId)) return prev;
      const next = new Set(prev);
      next.delete(moduleId);
      return next;
    });
  }
  function onFailure(moduleId: string) {
    sessionDidWorkRef.current = true;
    setFailedIds((prev) => {
      const next = new Set(prev);
      next.add(moduleId);
      return next;
    });
  }

  // Refresh server data once after the queue drains in this session.
  const drainedRef = useRef(false);
  useEffect(() => {
    if (
      activeIndex === -1 &&
      sessionDidWorkRef.current &&
      !drainedRef.current
    ) {
      drainedRef.current = true;
      router.refresh();
    }
  }, [activeIndex, router]);

  const generating = activeIndex !== -1;
  const readyCount = readyIds.size;
  const failedCount = failedIds.size;
  const currentModule =
    activeIndex >= 0 ? initialModules[activeIndex] : null;

  return (
    <div className="flex flex-col gap-8 pb-24">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <HeaderPill
            status={
              generating
                ? "generating"
                : failedCount > 0 && readyCount < initialModules.length
                  ? "failed"
                  : readyCount === initialModules.length &&
                      initialModules.length > 0
                    ? "ready"
                    : course.status
            }
          />
          <span className="truncate">
            {course.topic} · {initialModules.length} modules
          </span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight leading-[1.1]">
          {course.title ?? course.topic}
        </h1>
        {generating && currentModule && (
          <p className="text-sm text-muted-foreground">
            Writing module {activeIndex + 1} of {initialModules.length}:{" "}
            {currentModule.title}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-12">
        {initialModules.map((m, i) => (
          <ModuleStreamingSection
            key={m.id}
            index={i + 1}
            module={m}
            isActive={i === activeIndex}
            onSuccess={() => onSuccess(m.id)}
            onFailure={() => onFailure(m.id)}
          />
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-6 py-3 text-xs text-muted-foreground">
          <span>
            {readyCount} / {initialModules.length} ready
            {failedCount > 0 ? ` · ${failedCount} failed` : ""}
          </span>
          <div className="flex items-center gap-2">
            <CourseExportControls
              courseId={course.id}
              enabled={readyCount === initialModules.length && initialModules.length > 0}
            />
            <CourseDeleteButton courseId={course.id} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/courses")}
            >
              All courses
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderPill({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string; dot?: string }> = {
    pending: {
      label: "Pending",
      cls: "text-muted-foreground bg-muted",
      dot: "bg-muted-foreground/50",
    },
    generating: {
      label: "Writing",
      cls: "text-amber-700 dark:text-amber-300 bg-amber-500/10",
      dot: "bg-amber-500 animate-pulse",
    },
    ready: {
      label: "Ready",
      cls: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
      dot: "bg-emerald-500",
    },
    failed: {
      label: "Failed",
      cls: "text-destructive bg-destructive/10",
      dot: "bg-destructive",
    },
    syllabus_ready: {
      label: "Syllabus ready",
      cls: "text-foreground/70 bg-foreground/5",
    },
    draft: { label: "Draft", cls: "text-muted-foreground bg-muted" },
  };
  const c = config[status] ?? {
    label: status,
    cls: "text-muted-foreground bg-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        c.cls,
      )}
    >
      {c.dot && <span className={cn("size-1.5 rounded-full", c.dot)} />}
      {c.label}
    </span>
  );
}
