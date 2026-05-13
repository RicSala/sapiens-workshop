"use client";

import { useCompletion } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { ModuleAudioButton } from "./module-audio-button";

export type ModuleSnapshot = {
  id: string;
  title: string;
  summary: string;
  status: string;
  content: string | null;
  errorMessage: string | null;
  audio: { url: string; mime: string } | null;
};

type Props = {
  index: number;
  module: ModuleSnapshot;
  isActive: boolean;
  onSuccess: () => void;
  onFailure: () => void;
};

export function ModuleStreamingSection({
  index,
  module: m,
  isActive,
  onSuccess,
  onFailure,
}: Props) {
  const persisted = m.status === "ready" && !!m.content;

  const { completion, complete, isLoading, error, stop } = useCompletion({
    api: "/api/modules/generate",
    streamProtocol: "text",
    body: { moduleId: m.id },
    onFinish: () => onSuccess(),
    onError: () => onFailure(),
  });

  const triggeredRef = useRef(false);

  // Auto-trigger streaming when it's our turn in the queue.
  useEffect(() => {
    if (persisted) return;
    if (!isActive || triggeredRef.current) return;
    triggeredRef.current = true;
    void complete("").catch(() => {
      // onError already fires; swallow to avoid unhandled rejection.
    });
  }, [isActive, persisted, complete]);

  // Cancel any in-flight stream if the component unmounts.
  useEffect(() => () => stop(), [stop]);

  function onRetry() {
    triggeredRef.current = true;
    void complete("").catch(() => {});
  }

  const liveText = completion || null;
  const showText = persisted ? m.content : liveText;
  const streaming = isLoading && !!liveText;
  const hasError = !!error && !isLoading;

  const status = persisted
    ? "ready"
    : isLoading
      ? "generating"
      : hasError
        ? "failed"
        : isActive
          ? "generating"
          : "pending";

  return (
    <article className="flex flex-col gap-3 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {String(index).padStart(2, "0")}
        </span>
        <StatusPill status={status} />
      </div>

      {showText ? (
        <div className="flex flex-col gap-3">
          {persisted && (
            <ModuleAudioButton moduleId={m.id} initialAudio={m.audio} />
          )}
          <Markdown>{showText}</Markdown>
          {streaming && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BlinkingCursor />
              <span>Writing…</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold leading-tight">{m.title}</h2>
          <p className="text-sm text-muted-foreground">{m.summary}</p>
          {isLoading && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              <span>Writing…</span>
            </div>
          )}
          {hasError && (
            <div className="mt-2 flex items-center gap-3">
              <p className="text-sm text-destructive">
                {error?.message ?? "stream failed"}
              </p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
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

function Spinner() {
  return (
    <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function BlinkingCursor() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-amber-500/80 align-middle"
    />
  );
}
