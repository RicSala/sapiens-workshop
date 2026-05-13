import { Button, type buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

// Self-contained: parent only needs to pass courseId. Renders as a link to the
// /courses/[id]/epub route, which streams the EPUB as an attachment. No client
// JS needed.
export function DownloadEpubButton({
  courseId,
  label = "Download EPUB",
  size = "sm",
  variant = "outline",
  className,
  disabled,
}: Props) {
  if (disabled) {
    return (
      <Button
        size={size}
        variant={variant}
        className={cn(className)}
        disabled
      >
        {label}
      </Button>
    );
  }
  return (
    <Button asChild size={size} variant={variant} className={cn(className)}>
      <a href={`/courses/${courseId}/epub`}>{label}</a>
    </Button>
  );
}
