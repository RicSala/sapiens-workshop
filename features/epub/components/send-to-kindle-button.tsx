"use client";

import { Button, type buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSendToKindle } from "@/features/epub/use-send-to-kindle";
import type { VariantProps } from "class-variance-authority";

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

type Props = {
  courseId: string;
  label?: string;
  size?: ButtonVariantProps["size"];
  variant?: ButtonVariantProps["variant"];
  className?: string;
  disabled?: boolean;
};

// Text-based Send-to-Kindle button. Self-contained: parent passes courseId and
// styling props. Feedback surfaces via the app-wide Sonner toaster.
export function SendToKindleButton({
  courseId,
  label = "Send to Kindle",
  size = "sm",
  variant = "outline",
  className,
  disabled,
}: Props) {
  const { pending, send } = useSendToKindle(courseId);

  return (
    <Button
      size={size}
      variant={variant}
      className={cn(className)}
      onClick={send}
      disabled={disabled || pending}
    >
      {pending ? "Sending…" : label}
    </Button>
  );
}
