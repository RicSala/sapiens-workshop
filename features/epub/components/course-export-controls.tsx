import { cn } from "@/lib/utils";
import { DownloadEpubButton } from "./download-epub-button";
import { SendToKindleButton } from "./send-to-kindle-button";
import type { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

type Props = {
  courseId: string;
  /** Hide individual buttons. Both default to true. */
  show?: { download?: boolean; sendToKindle?: boolean };
  size?: ButtonVariantProps["size"];
  /** Variant for both buttons. Pass null on either to override individually via children. */
  variant?: ButtonVariantProps["variant"];
  className?: string;
  /** When false, both buttons render disabled (e.g. while the course is still generating). */
  enabled?: boolean;
};

// Drop-in cluster of EPUB actions for a course. Combines Download + Send-to-Kindle
// with a sensible gap. Place inside any module/course component variant; the only
// required prop is courseId.
export function CourseExportControls({
  courseId,
  show = { download: true, sendToKindle: true },
  size = "sm",
  variant = "outline",
  className,
  enabled = true,
}: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {show.download !== false && (
        <DownloadEpubButton
          courseId={courseId}
          size={size}
          variant={variant}
          disabled={!enabled}
        />
      )}
      {show.sendToKindle !== false && (
        <SendToKindleButton
          courseId={courseId}
          size={size}
          variant={variant}
          disabled={!enabled}
        />
      )}
    </div>
  );
}
