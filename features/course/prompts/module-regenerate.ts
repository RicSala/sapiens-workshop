type CourseContext = {
  title: string;
  audience: string;
  tone: string | null;
  language: string;
  targetWordsPerModule: number;
};

type ModuleOutline = {
  index: number; // 1-based
  title: string;
  summary: string;
};

type PriorModule = {
  index: number; // 1-based
  title: string;
  content: string;
};

type AnnotationInput = {
  quotedText: string;
  note: string;
};

export const MODULE_REGEN_SYSTEM = `You apply user comments to a chapter of a deepdive course. Each comment quotes a passage and tells you what to change about it. Your single most important job is to ACT ON EVERY COMMENT.

How to apply a comment:
- If the comment says "add X" (an example, a list, a code block, ASCII art, a sentence) — ADD X at the quoted passage. Yes, this is a structural change. Do it anyway.
- If the comment says "fix X — it's actually Y" — change X to Y.
- If the comment says "make this shorter / clearer / more concrete" — rewrite that passage accordingly.
- If the comment is vague (e.g. "..."), make a reasonable interpretation; do not skip it silently.
- Never water down a comment. If it asks for ASCII art, you output an ASCII art markdown code block. If it asks for two examples, you add two examples.

Everything else:
- For paragraphs and sentences that no comment references, keep them as close to the original as possible. Same wording where possible, same structure, same voice.
- If applying a comment requires touching adjacent text for coherence (a transition word, a clause), that's fine. Don't rewrite the whole paragraph for one comment.

Output format:
- Markdown only. No HTML.
- Start with the same level-2 heading as the original.
- Output the full edited module body. No preamble, no diff summary, no "here is the updated module" line.
- Write in the course's language.`;

/**
 * Build the user prompt for a regenerate-with-annotations call.
 *
 * Returns `[stablePrefix, variableSuffix]` so the caller can attach Anthropic
 * `cacheControl` to the stable prefix. The stable prefix is identical across
 * successive regens of the same module within a short window, so calls 2..N
 * hit cache for the prefix.
 *   [0] stable: course context + syllabus + prior modules + original content
 *   [1] variable: annotations + edit-only instruction
 */
export function buildModuleRegenPromptParts(args: {
  course: CourseContext;
  syllabus: ModuleOutline[];
  priorModules: PriorModule[];
  current: ModuleOutline;
  originalContent: string;
  annotations: AnnotationInput[];
}): [string, string] {
  const {
    course,
    syllabus,
    priorModules,
    current,
    originalContent,
    annotations,
  } = args;

  const priorBlock =
    priorModules.length === 0
      ? `No prior modules.`
      : priorModules
          .map(
            (m) =>
              `<module index="${m.index}" title="${escapeAttr(m.title)}">\n${m.content.trim()}\n</module>`,
          )
          .join("\n\n");

  const stablePrefix = [
    `Course title: ${course.title}`,
    `Audience: ${course.audience}`,
    `Tone: ${course.tone ?? "neutral"}`,
    `Language: ${course.language} (write the module in this language)`,
    `Target length: ~${course.targetWordsPerModule} words`,
    ``,
    `Full syllabus:`,
    ...syllabus.map(
      (m) => `${String(m.index).padStart(2, "0")}. ${m.title} — ${m.summary}`,
    ),
    ``,
    `Prior modules:`,
    ``,
    priorBlock,
    ``,
    `---`,
    ``,
    `Original content of Module ${String(current.index).padStart(2, "0")}: ${current.title}`,
    ``,
    originalContent.trim(),
  ].join("\n");

  const numbered = annotations
    .map(
      (a, i) =>
        `<comment index="${i + 1}">\n  <passage>${escapeAttr(a.quotedText)}</passage>\n  <instruction>${escapeAttr(a.note)}</instruction>\n</comment>`,
    )
    .join("\n");

  const variableSuffix = [
    `The user left ${annotations.length} comment${annotations.length === 1 ? "" : "s"} on the module above. Each comment quotes a passage and tells you what to change about it.`,
    ``,
    `<comments>`,
    numbered,
    `</comments>`,
    ``,
    `Now output the full edited module as markdown.`,
    ``,
    `Requirements (highest priority first):`,
    `1. APPLY EVERY COMMENT. Each <comment> describes a concrete edit. Make that edit at the location of the quoted passage. If a comment asks for ASCII art, you output a markdown code block with ASCII art. If it asks for an example, you add an example. Do not silently ignore any comment.`,
    `2. For passages NOT referenced by any comment, leave the prose as close to the original as possible — same wording, same structure.`,
    `3. Start with the original level-2 heading. Output only the module body — no preamble, no diff summary, no commentary.`,
  ].join("\n");

  return [stablePrefix, variableSuffix];
}

function escapeAttr(s: string) {
  return s.replace(/"/g, "&quot;");
}
