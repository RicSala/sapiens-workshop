import { streamObject } from "ai";
import { defaultModel } from "@/lib/ai";
import {
  SyllabusInputSchema,
  SyllabusSchema,
} from "@/features/course/schemas";
import {
  SYLLABUS_SYSTEM,
  buildSyllabusUserPrompt,
} from "@/features/course/prompts/syllabus";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = SyllabusInputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const result = streamObject({
    model: defaultModel,
    schema: SyllabusSchema,
    system: SYLLABUS_SYSTEM,
    prompt: buildSyllabusUserPrompt(parsed.data),
  });

  return result.toTextStreamResponse();
}
