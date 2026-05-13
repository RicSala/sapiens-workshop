import epub from "epub-gen-memory";
import { moduleContentToHtml } from "./markdown-to-html";
import { slugifyForFilename } from "./slugify";

export type CourseForEpub = {
  id: string;
  title: string | null;
  topic: string;
  language: string;
  modules: ReadonlyArray<{
    order: number;
    title: string;
    content: string | null;
    status: string;
  }>;
};

export type BuildEpubResult = {
  bytes: Buffer;
  filename: string;
  title: string;
};

export async function buildEpub(course: CourseForEpub): Promise<BuildEpubResult> {
  const chapters = [...course.modules]
    .sort((a, b) => a.order - b.order)
    .filter((m) => m.status === "ready" && m.content && m.content.trim())
    .map((m) => ({
      title: m.title,
      content: moduleContentToHtml(m.content!),
    }));

  if (chapters.length === 0) {
    throw new Error(
      "Course has no ready modules with content — cannot build an EPUB yet.",
    );
  }

  const title = course.title?.trim() || course.topic;
  const bytes = await epub(
    {
      title,
      author: "Sapiens Workshop",
      lang: toShortLangCode(course.language),
      tocTitle: "Contents",
      version: 3,
    },
    chapters,
  );

  return {
    bytes,
    filename: `${slugifyForFilename(title)}.epub`,
    title,
  };
}

// EPUB readers expect a BCP-47 language tag. We accept either a tag already
// ("en", "es-ES") or a language name from the course form ("English",
// "Spanish") and map a few common ones. Unknown values fall back to "en".
function toShortLangCode(language: string): string {
  const trimmed = language.trim();
  if (/^[a-z]{2}(-[a-z0-9]{2,8})?$/i.test(trimmed)) return trimmed.toLowerCase();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("eng")) return "en";
  if (lower.startsWith("spa") || lower.startsWith("esp") || lower.startsWith("cas")) return "es";
  if (lower.startsWith("fre") || lower.startsWith("fra")) return "fr";
  if (lower.startsWith("ger") || lower.startsWith("deu")) return "de";
  if (lower.startsWith("ita")) return "it";
  if (lower.startsWith("por")) return "pt";
  if (lower.startsWith("dut") || lower.startsWith("ned")) return "nl";
  if (lower.startsWith("jap")) return "ja";
  if (lower.startsWith("chi") || lower.startsWith("zho")) return "zh";
  return "en";
}
