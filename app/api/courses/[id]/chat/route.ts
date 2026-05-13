import {
  convertToModelMessages,
  streamText,
  type ModelMessage,
  type UIMessage,
} from "ai";
import { defaultModel } from "@/lib/ai";
import { db } from "@/lib/db";
import { buildChatSystemPrompt } from "@/features/chat/prompts/chat";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as {
    messages?: UIMessage[];
  };
  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return new Response("messages is required", { status: 400 });
  }

  const course = await db.course.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      topic: true,
      audience: true,
      tone: true,
      language: true,
      modules: {
        orderBy: { order: "asc" },
        select: { order: true, title: true, summary: true },
      },
    },
  });
  if (!course) {
    return new Response("course not found", { status: 404 });
  }

  const system = buildChatSystemPrompt(course);
  const modelMessages = await convertToModelMessages(messages);
  const systemMessage: ModelMessage = {
    role: "system",
    content: system,
    providerOptions: {
      anthropic: { cacheControl: { type: "ephemeral" } },
    },
  };

  const result = streamText({
    model: defaultModel,
    messages: [systemMessage, ...modelMessages],
  });

  return result.toUIMessageStreamResponse();
}
