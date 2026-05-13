"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createAnnotation,
  deleteAnnotation,
} from "@/features/course/actions/annotation";

type Rect = { top: number; left: number; bottom: number; right: number };

function clampLeft(left: number, width: number) {
  if (typeof window === "undefined") return left;
  const pad = 8;
  return Math.min(Math.max(pad, left), window.innerWidth - width - pad);
}

type CreateProps = {
  mode: "create";
  moduleId: string;
  quotedText: string;
  contextBefore: string;
  contextAfter: string;
  rect: Rect;
  onSaved: () => void;
  onCancel: () => void;
};

type ViewProps = {
  mode: "view";
  annotationId: string;
  quotedText: string;
  note: string;
  rect: Rect;
  onDeleted: () => void;
  onClose: () => void;
};

const WIDTH = 320;

export function ModuleAnnotationPopover(props: CreateProps | ViewProps) {
  const baseStyle = {
    top: props.rect.bottom + 6,
    left: clampLeft(props.rect.left, WIDTH),
    width: WIDTH,
  };

  if (props.mode === "create") {
    return (
      <CreatePopover {...props} style={baseStyle} />
    );
  }
  return <ViewPopover {...props} style={baseStyle} />;
}

function CreatePopover({
  moduleId,
  quotedText,
  contextBefore,
  contextAfter,
  onSaved,
  onCancel,
  style,
}: CreateProps & { style: React.CSSProperties }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function onSave() {
    if (!note.trim()) return;
    startTransition(async () => {
      await createAnnotation({
        moduleId,
        quotedText,
        contextBefore,
        contextAfter,
        note: note.trim(),
      });
      onSaved();
    });
  }

  return (
    <div
      data-annotation-popover
      className="fixed z-50 rounded-md border border-border bg-popover p-3 shadow-lg"
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="mb-2 line-clamp-2 text-xs italic text-muted-foreground">
        &ldquo;{quotedText}&rdquo;
      </p>
      <Textarea
        autoFocus
        placeholder="Comment on this passage…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSave();
          }
        }}
        className="min-h-20 text-sm"
        disabled={pending}
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={pending || !note.trim()}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function ViewPopover({
  annotationId,
  quotedText,
  note,
  onDeleted,
  onClose,
  style,
}: ViewProps & { style: React.CSSProperties }) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      await deleteAnnotation({ annotationId });
      onDeleted();
    });
  }

  return (
    <div
      data-annotation-popover
      className="fixed z-50 rounded-md border border-border bg-popover p-3 shadow-lg"
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="mb-2 line-clamp-2 text-xs italic text-muted-foreground">
        &ldquo;{quotedText}&rdquo;
      </p>
      <p className="whitespace-pre-wrap text-sm">{note}</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          disabled={pending}
        >
          Close
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onDelete}
          disabled={pending}
        >
          {pending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </div>
  );
}
