import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: string }) {
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

export function Spinner() {
  return (
    <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

export function BlinkingCursor() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-amber-500/80 align-middle"
    />
  );
}
