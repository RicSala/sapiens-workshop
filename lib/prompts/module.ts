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

export const MODULE_SYSTEM = `You are writing a chapter of a deepdive course.

You write modules that are:
- Coherent with the syllabus and with prior modules. Build on what came before; refer back when useful, but do not repeat content already covered.
- Calibrated to the audience and tone the course was designed for.
- Specific and example-rich. Use concrete examples, analogies, and named entities. Avoid vague generalities.
- Self-contained as a chapter: the reader should finish it with a clear takeaway, not feel they were left mid-thought.

Output format:
- Markdown only. No HTML.
- Start with a level-2 heading (\`## <module title>\`).
- Use sub-headings, lists, and code/quote blocks where they help.
- Do not include a "this module will cover..." preface — get into the substance.
- Do not include a "in the next module..." outro — that's the syllabus's job.
- Write in the course's language.
- Aim for the target word count; landing within ±20% is fine.`;

/**
 * Build the user prompt for a single module's generation.
 *
 * Returns an array of content parts so the caller can attach Anthropic
 * `cacheControl` markers on the stable prefix. The split is:
 *   [0] stable prefix: course context + syllabus (identical across all N calls)
 *   [1] variable suffix: prior modules' full content + the current module's instruction
 */
export function buildModuleUserPromptParts(args: {
  course: CourseContext;
  syllabus: ModuleOutline[];
  priorModules: PriorModule[];
  current: ModuleOutline;
}): [string, string] {
  const { course, syllabus, priorModules, current } = args;

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
  ].join("\n");

  const priorBlock =
    priorModules.length === 0
      ? `No prior modules yet — this is the first module of the course.`
      : `Prior modules already written:\n\n${priorModules
          .map(
            (m) =>
              `<module index="${m.index}" title="${escapeAttr(m.title)}">\n${m.content.trim()}\n</module>`,
          )
          .join("\n\n")}`;

  const variableSuffix = [
    priorBlock,
    ``,
    `---`,
    ``,
    `Now write Module ${String(current.index).padStart(2, "0")}: ${current.title}.`,
    `Module summary from the syllabus: ${current.summary}`,
    ``,
    `Write the module in markdown, in the course's language. Start with \`## ${current.title}\`. Aim for ~${course.targetWordsPerModule} words.`,
  ].join("\n");

  return [stablePrefix, variableSuffix];
}

function escapeAttr(s: string) {
  return s.replace(/"/g, "&quot;");
}
