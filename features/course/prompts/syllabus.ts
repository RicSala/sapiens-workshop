import type { SyllabusInput } from "@/features/course/schemas";

export const SYLLABUS_SYSTEM = `You are a curriculum designer for in-depth, self-paced courses.

You design syllabi that are:
- Coherent: modules build on each other and form a complete arc.
- Calibrated to the audience: assume their level, jargon tolerance, and goals.
- Specific: module titles are concrete (not "Introduction" or "Advanced topics") and summaries describe what the learner will know after that module.
- Scoped: stay strictly on the topic the user requested.

You always return a syllabus matching the requested schema, with the exact number of modules requested.`;

export function buildSyllabusUserPrompt(input: SyllabusInput): string {
  return `Design a deepdive course syllabus.

Topic: ${input.topic}
Audience: ${input.audience}
Tone: ${input.tone ?? "neutral"}
Language: ${input.language} (write every title and summary in this language)
Number of modules: exactly ${input.targetModuleCount}
Target length per module when generated later: ~${input.targetWordsPerModule} words

Return:
- A course title that names the topic and hints at the angle for this audience.
- Exactly ${input.targetModuleCount} modules, each with:
  - title: a concrete, descriptive title (no generic "Introduction" or "Conclusion").
  - summary: 2–3 sentences describing what the learner will understand after this module, and how it advances the overall arc.

Order matters: the modules should form a progressive learning path.`;
}
