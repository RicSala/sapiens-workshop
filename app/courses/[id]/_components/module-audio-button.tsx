"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  synthesizeModuleAudio,
  type AudioResult,
} from "@/app/actions/synthesize-audio";

type Props = {
  moduleId: string;
  initialAudio: { url: string; mime: string } | null;
};

type State =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "ready"; audio: AudioResult }
  | { kind: "error"; message: string };

export function ModuleAudioButton({ moduleId, initialAudio }: Props) {
  const [state, setState] = useState<State>(
    initialAudio
      ? { kind: "ready", audio: initialAudio }
      : { kind: "idle" },
  );
  const [, startTransition] = useTransition();

  function run(force: boolean) {
    setState({ kind: "generating" });
    startTransition(async () => {
      try {
        const audio = await synthesizeModuleAudio({ moduleId, force });
        setState({ kind: "ready", audio });
      } catch (err) {
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  if (state.kind === "ready") {
    return (
      <div className="flex flex-col gap-2">
        <audio
          controls
          preload="none"
          src={state.audio.url}
          className="w-full"
        />
        <button
          type="button"
          onClick={() => run(true)}
          className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Regenerate audio
        </button>
      </div>
    );
  }

  if (state.kind === "generating") {
    return (
      <Button size="sm" variant="outline" disabled>
        <Spinner /> Generating audio…
      </Button>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => run(false)}>
          Retry
        </Button>
        <p className="text-xs text-destructive">{state.message}</p>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={() => run(false)}>
      Generate audio
    </Button>
  );
}

function Spinner() {
  return (
    <span className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
