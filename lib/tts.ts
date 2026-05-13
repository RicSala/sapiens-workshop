import OpenAI from "openai";

const OPENAI_TTS_HARD_LIMIT = 4096;
const TARGET_CHUNK_LEN = 800;
const MAX_CONCURRENCY = 5;

export type SynthesizeOptions = {
  voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  model?: "tts-1" | "tts-1-hd";
  format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
};

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export async function synthesize(
  text: string,
  opts: SynthesizeOptions = {},
): Promise<Buffer> {
  const voice = opts.voice ?? "nova";
  const model = opts.model ?? "tts-1";
  const format = opts.format ?? "mp3";

  const trimmed = text.trim();
  if (!trimmed) throw new Error("synthesize: empty input");

  const chunks = chunkForTts(trimmed);

  const buffers = await mapWithConcurrency(
    chunks,
    MAX_CONCURRENCY,
    async (chunk) => {
      const res = await client().audio.speech.create({
        model,
        voice,
        input: chunk,
        response_format: format,
      });
      return Buffer.from(await res.arrayBuffer());
    },
  );

  return Buffer.concat(buffers);
}

// Splits text into small chunks (~target chars) suitable for parallel TTS.
// Prefers paragraph boundaries; falls back to sentence boundaries when a
// paragraph exceeds the hard limit; only as a last resort splits mid-sentence.
export function chunkForTts(
  text: string,
  target = TARGET_CHUNK_LEN,
  limit = OPENAI_TTS_HARD_LIMIT,
): string[] {
  const cleaned = stripMarkdownForSpeech(text);
  if (cleaned.length <= target) return [cleaned];

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const out: string[] = [];
  let buf = "";

  const flush = () => {
    if (buf.trim()) out.push(buf.trim());
    buf = "";
  };

  for (const p of paragraphs) {
    if (p.length > limit) {
      flush();
      out.push(...chunkBySentence(p, target, limit));
      continue;
    }
    const sep = buf ? "\n\n" : "";
    if (buf && buf.length + sep.length + p.length > target) {
      flush();
      buf = p;
    } else {
      buf += sep + p;
    }
  }
  flush();
  return out;
}

function chunkBySentence(
  text: string,
  target: number,
  limit: number,
): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) ?? [text];
  const out: string[] = [];
  let buf = "";

  for (const s of sentences) {
    if (s.length > limit) {
      if (buf) {
        out.push(buf);
        buf = "";
      }
      out.push(...hardSplit(s, limit));
      continue;
    }
    if (buf && buf.length + s.length > target) {
      out.push(buf);
      buf = s;
    } else {
      buf += s;
    }
  }
  if (buf) out.push(buf);
  return out;
}

function hardSplit(text: string, limit: number): string[] {
  const out: string[] = [];
  const words = text.split(/(\s+)/);
  let buf = "";
  for (const w of words) {
    if (buf.length + w.length > limit) {
      if (buf) {
        out.push(buf);
        buf = "";
      }
      if (w.length > limit) {
        for (let i = 0; i < w.length; i += limit) {
          out.push(w.slice(i, i + limit));
        }
      } else {
        buf = w;
      }
    } else {
      buf += w;
    }
  }
  if (buf) out.push(buf);
  return out;
}

// Bounded-concurrency parallel map that preserves input order in results.
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const i = cursor++;
        if (i >= items.length) return;
        results[i] = await fn(items[i], i);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

function stripMarkdownForSpeech(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
