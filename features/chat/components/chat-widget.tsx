"use client";

import { useEffect, useState } from "react";
import { MessageCircleIcon, SparklesIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils/index";

import { ChatConversation } from "./chat-conversation";

type Props = {
  courseId: string;
};

export function ChatWidget({ courseId }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div
        role="dialog"
        aria-label="Course chat"
        aria-hidden={!open}
        className={cn(
          "fixed right-4 bottom-24 z-50 flex h-[min(640px,calc(100dvh-7rem))] w-[400px] max-w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl transition-all duration-200 ease-out",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-95 opacity-0",
        )}
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <SparklesIcon className="size-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <h2 className="truncate text-sm font-semibold">Course chat</h2>
              <p className="truncate text-xs text-muted-foreground">
                Grounded in this course&apos;s syllabus
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </header>

        <ChatConversation courseId={courseId} />
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close course chat" : "Open course chat"}
        aria-expanded={open}
        className={cn(
          "fixed right-4 bottom-4 z-50 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200",
          "hover:scale-105 hover:shadow-xl active:scale-95",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        <MessageCircleIcon
          className={cn(
            "absolute size-6 transition-all duration-200",
            open ? "rotate-45 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
          )}
        />
        <XIcon
          className={cn(
            "absolute size-6 transition-all duration-200",
            open ? "rotate-0 scale-100 opacity-100" : "-rotate-45 scale-0 opacity-0",
          )}
        />
      </button>
    </>
  );
}
