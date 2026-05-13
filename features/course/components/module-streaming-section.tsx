"use client";

import { useCompletion } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/lib/markdown";
import { ModuleAudioButton } from "./module-audio-button";
import {
  ModuleAnnotationLayer,
  type Annotation,
} from "./module-annotation-layer";
import { BlinkingCursor, Spinner, StatusPill } from "./_atoms";

export type ModuleSnapshot = {
  id: string;
  title: string;
  summary: string;
  status: string;
  content: string | null;
  errorMessage: string | null;
  audio: { url: string; mime: string } | null;
  annotations: Annotation[];
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
          {persisted && !streaming ? (
            <ModuleAnnotationLayer
              moduleId={m.id}
              annotations={m.annotations}
            >
              <Markdown>{showText}</Markdown>
            </ModuleAnnotationLayer>
          ) : (
            <Markdown>{showText}</Markdown>
          )}
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

