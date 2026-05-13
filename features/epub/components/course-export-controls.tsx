"use client";

import { Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSendToKindle } from "@/features/epub/use-send-to-kindle";

type Props = {
  courseId: string;
  /** When false, both buttons render disabled. Useful while generation is in flight. */
  enabled?: boolean;
  /** Override per-button (defaults to `enabled`). */
  enableDownload?: boolean;
  /** Override per-button (defaults to `enabled`). */
  enableSendToKindle?: boolean;
  className?: string;
};

// Icon-only export cluster: Download + Send-to-Kindle joined in a button group,
// each with a tooltip. Drop-in: only courseId is required. Place it inside any
// course/module component variant — the visual styling adapts via ButtonGroup.
export function CourseExportControls({
  courseId,
  enabled = true,
  enableDownload,
  enableSendToKindle,
  className,
}: Props) {
  const { pending, send } = useSendToKindle(courseId);
  const canDownload = enableDownload ?? enabled;
  const canSend = enableSendToKindle ?? enabled;

  return (
    <TooltipProvider>
      <ButtonGroup className={cn(className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            {canDownload ? (
              <Button
                asChild
                size="icon-sm"
                variant="outline"
                aria-label="Download EPUB"
              >
                <a href={`/courses/${courseId}/epub`}>
                  <Download />
                </a>
              </Button>
            ) : (
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="Download EPUB"
                disabled
              >
                <Download />
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>Download EPUB</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Send to Kindle"
              onClick={send}
              disabled={!canSend || pending}
            >
              {pending ? <Spinner /> : <Send />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send to Kindle</TooltipContent>
        </Tooltip>
      </ButtonGroup>
    </TooltipProvider>
  );
}
