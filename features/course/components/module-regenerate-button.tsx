"use client";

import { Button } from "@/components/ui/button";

type Props = {
  pendingCount: number;
  disabled?: boolean;
  isRegenerating?: boolean;
  onClick: () => void;
};

export function ModuleRegenerateButton({
  pendingCount,
  disabled,
  isRegenerating,
  onClick,
}: Props) {
  if (pendingCount === 0) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || isRegenerating}
      onClick={onClick}
    >
      {isRegenerating
        ? "Regenerating…"
        : `Regenerate with ${pendingCount} ${pendingCount === 1 ? "comment" : "comments"}`}
    </Button>
  );
}
