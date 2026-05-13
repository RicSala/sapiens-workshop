"use client";

import { useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

type Props = {
  courseId: string;
};

const SUGGESTIONS = [
  "Give me a quick overview of this course.",
  "Which module should I start with?",
  "Quiz me on the main themes.",
];

export function ChatConversation({ courseId }: Props) {
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/courses/${courseId}/chat`,
    }),
  });

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Chat failed");
    }
  }, [error]);

  const isBusy = status === "submitted" || status === "streaming";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-6 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-2 py-8 text-center">
              <h3 className="text-sm font-medium">
                Ask anything about this course
              </h3>
              <p className="max-w-[28ch] text-xs text-muted-foreground">
                I have the syllabus and can help you plan, review, or explore.
              </p>
              <div className="mt-2 flex w-full flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isBusy}
                    onClick={() => sendMessage({ text: s })}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent>
                  {m.parts.map((part, i) =>
                    part.type === "text" ? (
                      <MessageResponse key={`${m.id}-${i}`}>
                        {part.text}
                      </MessageResponse>
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-background p-3">
        <PromptInput
          onSubmit={({ text }) => {
            const trimmed = text.trim();
            if (!trimmed) return;
            sendMessage({ text: trimmed });
          }}
        >
          <PromptInputTextarea
            placeholder="Ask about this course…"
            className="min-h-12 max-h-32"
          />
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
