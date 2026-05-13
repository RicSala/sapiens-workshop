"use client";

import { useCompletion } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/lib/markdown";
import { ModuleAudioButton } from "./module-audio-button";
import {
  ModuleAnnotationLayer,
  type Annotation,
} from "./module-annotation-layer";
import { ModuleRegenerateButton } from "./module-regenerate-button";
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
  const router = useRouter();
  const persisted = m.status === "ready" && !!m.content;

  const { completion, complete, isLoading, error, stop } = useCompletion({
    api: "/api/modules/generate",
    streamProtocol: "text",
    body: { moduleId: m.id },
    onFinish: () => onSuccess(),
    onError: () => onFailure(),
  });

  const regen = useCompletion({
    api: "/api/modules/regenerate",
    streamProtocol: "text",
    body: { moduleId: m.id },
    onFinish: () => router.refresh(),
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

  // Cancel any in-flight stream if the component unmounts. Depend on the
  // (stable) stop callback, NOT the whole `regen` object — `regen` has a fresh
  // identity every render, which would re-fire this cleanup and abort the
  // in-flight stream on every state update.
  useEffect(() => () => stop(), [stop]);
  const regenStop = regen.stop;
  useEffect(() => () => regenStop(), [regenStop]);

  function onRetry() {
    triggeredRef.current = true;
    void complete("").catch(() => {});
  }

  const regenInFlightRef = useRef(false);
  function onRegenerate() {
    if (regenInFlightRef.current || regen.isLoading) return;
    regenInFlightRef.current = true;
    void regen
      .complete("")
      .catch(() => {})
      .finally(() => {
        regenInFlightRef.current = false;
      });
  }

  const regenStreaming = regen.isLoading;
  const liveText = completion || null;
  // Prefer in-flight or just-finished regen text over persisted content so
  // the stream displays as it arrives. After regen finishes, router.refresh()
  // updates m.content; until then, regen.completion keeps the new text visible.
  const showText = regen.completion || (persisted ? m.content : liveText);
  const streaming = (isLoading && !!liveText) || (regenStreaming && !!regen.completion);
  const hasError = (!!error && !isLoading) || (!!regen.error && !regenStreaming);

  const status = persisted
    ? regenStreaming
      ? "generating"
      : "ready"
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
            <div className="flex items-center gap-2">
              <ModuleAudioButton moduleId={m.id} initialAudio={m.audio} />
              <ModuleRegenerateButton
                pendingCount={m.annotations.length}
                isRegenerating={regenStreaming}
                onClick={onRegenerate}
              />
            </div>
          )}
          {persisted ? (
            <ModuleAnnotationLayer
              moduleId={m.id}
              annotations={streaming ? [] : m.annotations}
              disabled={streaming}
            >
              <Markdown>{showText}</Markdown>
            </ModuleAnnotationLayer>
          ) : (
            <Markdown>{showText}</Markdown>
          )}
          {streaming && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BlinkingCursor />
              <span>{regenStreaming ? "Regenerating…" : "Writing…"}</span>
            </div>
          )}
          {regen.error && !regenStreaming && (
            <p className="text-sm text-destructive">
              Regen failed: {regen.error.message}
            </p>
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

