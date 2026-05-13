"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button, type buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendCourseToKindle } from "@/features/epub/send-to-kindle";
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

// Self-contained: imports the server action directly and surfaces feedback via
// the app-wide Sonner toaster (already mounted in app/layout.tsx). The parent
// component does not need to wire up state, error handling, or env-var checks
// — a missing KINDLE_EMAIL / EMAIL_FROM / RESEND_API_KEY surfaces as a toast.
export function SendToKindleButton({
  courseId,
  label = "Send to Kindle",
  size = "sm",
  variant = "outline",
  className,
  disabled,
}: Props) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const id = toast.loading("Sending to Kindle…");
      try {
        const result = await sendCourseToKindle(courseId);
        if (result.ok) {
          toast.success("Sent to Kindle", { id });
        } else {
          toast.error(result.error, { id });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to send", { id });
      }
    });
  }

  return (
    <Button
      size={size}
      variant={variant}
      className={cn(className)}
      onClick={onClick}
      disabled={disabled || pending}
    >
      {pending ? "Sending…" : label}
    </Button>
  );
}
