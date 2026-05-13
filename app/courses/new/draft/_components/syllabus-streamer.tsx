"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SyllabusSchema, type SyllabusInput } from "@/lib/schemas";
import { readDraftInput, clearDraftInput } from "@/lib/syllabus-draft-store";
import { SyllabusOutline, type ModuleDraft } from "./syllabus-outline";
import { saveCourseFromDraft } from "@/app/actions/courses";

type DraftState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; input: SyllabusInput };

function genId() {
  return crypto.randomUUID();
}

export function SyllabusStreamer() {
  const router = useRouter();
  const [state, setState] = useState<DraftState>({ kind: "loading" });
  const submittedRef = useRef(false);
  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const [edited, setEdited] = useState<ModuleDraft[] | null>(null);

  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/syllabus",
    schema: SyllabusSchema,
  });

  useEffect(() => {
    const stored = readDraftInput();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of sessionStorage (browser-only) on mount
    setState(stored ? { kind: "ready", input: stored } : { kind: "missing" });
  }, []);

  useEffect(() => {
    if (state.kind === "ready" && !submittedRef.current) {
      submittedRef.current = true;
      submit(state.input);
    }
  }, [state, submit]);

  const modules: ModuleDraft[] = useMemo(() => {
    if (edited) return edited;
    const streamed = object?.modules ?? [];
    return streamed.map((m, i) => ({
      id: `s-${i}`,
      title: m?.title,
      summary: m?.summary,
    }));
  }, [edited, object?.modules]);

  function snapshotIntoEdited(prev: ModuleDraft[] | null) {
    return prev ?? modules.map((m) => ({ ...m, id: m.id || genId() }));
  }

  function onAddModule(afterIndex?: number) {
    setEdited((prev) => {
      const list = snapshotIntoEdited(prev);
      const next = [...list];
      const at = afterIndex == null ? next.length : afterIndex + 1;
      next.splice(at, 0, { id: genId(), title: "", summary: "" });
      return next;
    });
  }

  function onDeleteModule(index: number) {
    setEdited((prev) => snapshotIntoEdited(prev).filter((_, i) => i !== index));
  }

  function onMoveModule(fromIndex: number, toIndex: number) {
    setEdited((prev) => {
      const list = snapshotIntoEdited(prev);
      if (
        fromIndex < 0 ||
        fromIndex >= list.length ||
        toIndex < 0 ||
        toIndex >= list.length ||
        fromIndex === toIndex
      ) {
        return list;
      }
      const next = [...list];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }

  function onUpdateModule(
    index: number,
    patch: { title?: string; summary?: string },
  ) {
    setEdited((prev) =>
      snapshotIntoEdited(prev).map((m, i) =>
        i === index ? { ...m, ...patch } : m,
      ),
    );
  }

  function onSave() {
    if (state.kind !== "ready") return;
    const cleanModules = modules
      .map((m) => ({
        title: (m.title ?? "").trim(),
        summary: (m.summary ?? "").trim(),
      }))
      .filter((m) => m.title.length > 0 && m.summary.length > 0);

    if (!object?.title || cleanModules.length === 0) {
      setSaveError("Need a title and at least one complete module to save.");
      return;
    }

    setSaveError(null);
    startSaving(async () => {
      try {
        await saveCourseFromDraft({
          input: state.input,
          title: object.title!,
          modules: cleanModules,
        });
        clearDraftInput();
      } catch (e) {
        // `redirect()` throws a NEXT_REDIRECT — that's the success path, swallow it.
        if (e instanceof Error && /NEXT_REDIRECT/.test(e.message)) return;
        setSaveError(e instanceof Error ? e.message : "Failed to save course.");
      }
    });
  }

  if (state.kind === "loading") {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground italic">
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (state.kind === "missing") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No draft input found</CardTitle>
          <CardDescription>
            Fill out the form first to draft a syllabus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.replace("/courses/new")}>
            Back to form
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <SyllabusOutline
        input={state.input}
        title={object?.title}
        modules={modules}
        isLoading={isLoading}
        error={error}
        onAddModule={onAddModule}
        onDeleteModule={onDeleteModule}
        onMoveModule={onMoveModule}
        onUpdateModule={onUpdateModule}
      />

      <FloatingBar>
        <span className="text-xs text-muted-foreground">
          {modules.length} module{modules.length === 1 ? "" : "s"}
          {edited ? " · edited" : ""}
        </span>
        <div className="flex items-center gap-2">
          {saveError && (
            <span className="text-xs text-destructive">{saveError}</span>
          )}
          {isLoading ? (
            <Button variant="outline" size="sm" onClick={() => stop()}>
              Stop
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/courses/new")}
              >
                ← Edit prompt
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  submittedRef.current = true;
                  setEdited(null);
                  setSaveError(null);
                  submit(state.input);
                }}
              >
                Regenerate
              </Button>
              <Button size="sm" onClick={onSave} disabled={saving}>
                {saving ? "Saving…" : "Save course"}
              </Button>
            </>
          )}
        </div>
      </FloatingBar>
    </div>
  );
}

function FloatingBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-6 py-3">
        {children}
      </div>
    </div>
  );
}
