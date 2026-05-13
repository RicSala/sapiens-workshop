"use client";

import { Fragment } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SyllabusInput } from "@/features/course/schemas";

export type ModuleDraft = {
  id: string;
  title?: string;
  summary?: string;
};

type Props = {
  input: SyllabusInput;
  title: string | undefined;
  modules: ModuleDraft[];
  isLoading: boolean;
  error?: Error;
  onAddModule: (afterIndex?: number) => void;
  onDeleteModule: (index: number) => void;
  onMoveModule: (fromIndex: number, toIndex: number) => void;
  onUpdateModule: (
    index: number,
    patch: { title?: string; summary?: string },
  ) => void;
};

export function SyllabusOutline({
  input,
  title,
  modules,
  isLoading,
  error,
  onAddModule,
  onDeleteModule,
  onMoveModule,
  onUpdateModule,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = modules.findIndex((m) => m.id === active.id);
    const to = modules.findIndex((m) => m.id === over.id);
    if (from === -1 || to === -1) return;
    onMoveModule(from, to);
  }

  const canEditList = !isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-mono uppercase tracking-wider",
            isLoading
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              isLoading ? "animate-pulse bg-amber-500" : "bg-emerald-500",
            )}
          />
          {isLoading ? "Streaming" : "Ready"}
        </span>
        <span className="truncate">
          {input.topic} · {input.targetModuleCount} modules ·{" "}
          ~{input.targetWordsPerModule} words/module
        </span>
      </div>

      <h2 className="text-4xl font-bold tracking-tight leading-[1.1]">
        {title ?? (
          <span className="italic text-muted-foreground">Drafting title…</span>
        )}
      </h2>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={modules.map((m) => m.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col">
            {canEditList && modules.length > 0 && (
              <InsertionZone onClick={() => onAddModule(-1)} />
            )}
            {modules.length === 0 && (
              <p className="py-6 text-sm italic text-muted-foreground">
                Drafting modules…
              </p>
            )}
            {modules.map((m, i) => (
              <Fragment key={m.id}>
                <SortableRow
                  id={m.id}
                  index={i}
                  module={m}
                  draggable={canEditList}
                  onUpdate={(patch) => onUpdateModule(i, patch)}
                  onDelete={() => onDeleteModule(i)}
                />
                {canEditList && (
                  <InsertionZone onClick={() => onAddModule(i)} />
                )}
              </Fragment>
            ))}

            {canEditList && (
              <button
                type="button"
                onClick={() => onAddModule()}
                className="mt-2 flex items-center gap-3 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-foreground/40 hover:bg-foreground/5 hover:text-foreground"
              >
                <span className="text-lg leading-none">+</span>
                <span>Add a module at the end</span>
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({
  id,
  index,
  module: m,
  draggable,
  onUpdate,
  onDelete,
}: {
  id: string;
  index: number;
  module: ModuleDraft;
  draggable: boolean;
  onUpdate: (patch: { title?: string; summary?: string }) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-md py-3"
    >
      <div className="flex flex-col items-center pt-1.5">
        <button
          type="button"
          title={
            draggable ? "Drag to reorder" : "Reordering disabled while streaming"
          }
          {...(draggable ? attributes : {})}
          {...(draggable ? listeners : {})}
          disabled={!draggable}
          className={cn(
            "flex h-6 w-5 items-center justify-center rounded text-muted-foreground transition-colors",
            draggable
              ? "cursor-grab opacity-30 hover:bg-foreground/10 hover:text-foreground hover:opacity-100 group-hover:opacity-70 active:cursor-grabbing"
              : "opacity-20",
          )}
          aria-label="Drag handle"
        >
          <GripVertical className="size-3.5" />
        </button>
        <span className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <input
          value={m.title ?? ""}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Module title"
          className="bg-transparent text-xl font-semibold leading-tight outline-none placeholder:italic placeholder:text-muted-foreground/60"
        />
        <textarea
          value={m.summary ?? ""}
          onChange={(e) => onUpdate({ summary: e.target.value })}
          placeholder="Module summary…"
          rows={1}
          className="field-sizing-content resize-none overflow-hidden bg-transparent text-sm leading-relaxed text-muted-foreground outline-none placeholder:italic placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="flex items-start pt-1.5">
        <button
          type="button"
          title="Delete module"
          onClick={onDelete}
          className="inline-flex size-7 items-center justify-center rounded text-muted-foreground/60 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          aria-label="Delete module"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function InsertionZone({ onClick }: { onClick: () => void }) {
  return (
    <div className="group/zone relative h-3 -my-1.5">
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-x-0 inset-y-0 flex items-center justify-center"
        title="Add module here"
        aria-label="Add module here"
      >
        <span className="pointer-events-none absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-foreground/20 opacity-0 transition-opacity group-hover/zone:opacity-100" />
        <span className="pointer-events-none relative z-10 inline-flex size-5 items-center justify-center rounded-full border border-border bg-background text-xs leading-none text-muted-foreground opacity-0 transition-opacity group-hover/zone:opacity-100">
          +
        </span>
      </button>
    </div>
  );
}

