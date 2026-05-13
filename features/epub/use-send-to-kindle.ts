"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { sendCourseToKindle } from "@/features/epub/send-to-kindle";

export function useSendToKindle(courseId: string) {
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const toastId = toast.loading("Sending to Kindle…");
      try {
        const result = await sendCourseToKindle(courseId);
        if (result.ok) {
          toast.success("Sent to Kindle", { id: toastId });
        } else {
          toast.error(result.error, { id: toastId });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to send", {
          id: toastId,
        });
      }
    });
  }

  return { pending, send };
}
