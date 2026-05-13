"use client";

import Mark from "mark.js";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ModuleAnnotationPopover } from "./module-annotation-popover";

export type Annotation = {
  id: string;
  quotedText: string;
  note: string;
};

type Rect = { top: number; left: number; bottom: number; right: number };

type Active =
  | {
      kind: "create";
      quotedText: string;
      contextBefore: string;
      contextAfter: string;
      rect: Rect;
    }
  | { kind: "view"; annotation: Annotation; rect: Rect };

type Props = {
  moduleId: string;
  annotations: Annotation[];
  children: React.ReactNode;
};

const CONTEXT_CHARS = 100;
const SCROLL_CLOSE_DELAY_MS = 120;

function toRect(r: DOMRect): Rect {
  return { top: r.top, left: r.left, bottom: r.bottom, right: r.right };
}

export function ModuleAnnotationLayer({
  moduleId,
  annotations,
  children,
}: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Active | null>(null);

  const close = useCallback(() => {
    setActive(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const repaint = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const instance = new Mark(container);
    instance.unmark({
      done: () => {
        for (const a of annotations) {
          instance.mark(a.quotedText, {
            acrossElements: true,
            separateWordSearch: false,
            className: "sw-annotation",
            each: (el) => {
              (el as HTMLElement).dataset.annotationId = a.id;
            },
          });
        }
      },
    });
  }, [annotations]);

  useLayoutEffect(() => {
    repaint();
  }, [repaint, children]);

  // Selection-to-create + click-mark-to-view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onMouseUp(e: MouseEvent) {
      if (!container) return;
      const target = e.target as Node | null;
      if (!target || !container.contains(target)) return;

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      if (
        !container.contains(range.startContainer) ||
        !container.contains(range.endContainer)
      ) {
        return;
      }

      const quotedText = sel.toString().trim();
      if (quotedText.length < 2) return;

      const full = container.textContent ?? "";
      const idx = full.indexOf(quotedText);
      const contextBefore =
        idx >= 0 ? full.slice(Math.max(0, idx - CONTEXT_CHARS), idx) : "";
      const contextAfter =
        idx >= 0
          ? full.slice(
              idx + quotedText.length,
              idx + quotedText.length + CONTEXT_CHARS,
            )
          : "";

      setActive({
        kind: "create",
        quotedText,
        contextBefore,
        contextAfter,
        rect: toRect(range.getBoundingClientRect()),
      });
    }

    function onClick(e: MouseEvent) {
      if (!container) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const markEl = target.closest("mark.sw-annotation") as HTMLElement | null;
      if (!markEl || !container.contains(markEl)) return;

      // If the user just finished a selection, prefer create flow.
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim().length >= 2) return;

      const id = markEl.dataset.annotationId;
      if (!id) return;
      const annotation = annotations.find((a) => a.id === id);
      if (!annotation) return;

      setActive({
        kind: "view",
        annotation,
        rect: toRect(markEl.getBoundingClientRect()),
      });
    }

    document.addEventListener("mouseup", onMouseUp);
    container.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("click", onClick);
    };
  }, [annotations]);

  // ESC closes
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, close]);

  // Click outside closes (popover stops propagation via data-annotation-popover)
  useEffect(() => {
    if (!active) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-annotation-popover]")) return;
      // Clicks inside the container open new popovers via mouseup/click — let
      // those flows handle it; just close the current one here.
      close();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [active, close]);

  // Scroll closes (debounced so a single jolt doesn't dismiss)
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    function onScroll() {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        close();
      }, SCROLL_CLOSE_DELAY_MS);
    }
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      if (timer) clearTimeout(timer);
    };
  }, [active, close]);

  function onSavedOrDeleted() {
    close();
    router.refresh();
  }

  return (
    <>
      <div ref={containerRef} className="sw-annotation-root">
        {children}
      </div>
      {active?.kind === "create" && (
        <ModuleAnnotationPopover
          mode="create"
          moduleId={moduleId}
          quotedText={active.quotedText}
          contextBefore={active.contextBefore}
          contextAfter={active.contextAfter}
          rect={active.rect}
          onSaved={onSavedOrDeleted}
          onCancel={close}
        />
      )}
      {active?.kind === "view" && (
        <ModuleAnnotationPopover
          mode="view"
          annotationId={active.annotation.id}
          quotedText={active.annotation.quotedText}
          note={active.annotation.note}
          rect={active.rect}
          onDeleted={onSavedOrDeleted}
          onClose={close}
        />
      )}
    </>
  );
}
