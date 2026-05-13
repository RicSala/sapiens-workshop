import { Marked } from "marked";

const marked = new Marked({ gfm: true, breaks: false });

// Single seam: when Module content moves from a markdown string to a Tiptap
// JSON document, replace this function with a `@tiptap/html` `generateHTML`
// call. The rest of the EPUB pipeline does not need to change.
export function moduleContentToHtml(markdown: string): string {
  const html = marked.parse(markdown, { async: false });
  if (typeof html !== "string") {
    throw new Error("markdown-to-html: expected sync string output from marked");
  }
  return html;
}
