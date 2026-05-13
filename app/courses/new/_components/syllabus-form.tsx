"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SyllabusInputSchema, type SyllabusInput } from "@/lib/schemas";
import { saveDraftInput } from "@/lib/syllabus-draft-store";

type Template = {
  id: string;
  emoji: string;
  title: string;
  values: SyllabusInput;
};

const TEMPLATES: Template[] = [
  {
    id: "tech-history",
    emoji: "📜",
    title: "Tech history",
    values: {
      topic: "The history of the printing press",
      audience:
        "Software engineers curious about how communication technology shaped society. No prior history background assumed; comfortable with technical detail and analogies to modern tech.",
      tone: "neutral",
      language: "English",
      targetModuleCount: 3,
      targetWordsPerModule: 300,
    },
  },
  {
    id: "science-primer",
    emoji: "🧪",
    title: "Science primer",
    values: {
      topic: "How CRISPR works and why it matters",
      audience:
        "Curious adults with a high-school science background. No biology degree assumed; comfortable with metaphors and step-by-step explanations.",
      tone: "warm but precise",
      language: "English",
      targetModuleCount: 3,
      targetWordsPerModule: 300,
    },
  },
  {
    id: "business-case",
    emoji: "💼",
    title: "Business case",
    values: {
      topic: "How Netflix shifted from DVDs to streaming to production",
      audience:
        "Product managers and operators interested in strategic pivots. Familiar with business terminology.",
      tone: "analytical",
      language: "English",
      targetModuleCount: 3,
      targetWordsPerModule: 300,
    },
  },
  {
    id: "philosophy",
    emoji: "🏛️",
    title: "Philosophy primer",
    values: {
      topic: "Stoicism for the modern reader",
      audience:
        "Adults seeking practical philosophy. No prior philosophy reading required; appreciative of historical context and concrete examples.",
      tone: "thoughtful",
      language: "English",
      targetModuleCount: 3,
      targetWordsPerModule: 300,
    },
  },
  {
    id: "geopolitics",
    emoji: "🌍",
    title: "Geopolitics",
    values: {
      topic: "The geopolitics of semiconductors",
      audience:
        "News-aware adults wanting structural understanding behind headlines. Comfortable with economics and policy concepts.",
      tone: "neutral",
      language: "English",
      targetModuleCount: 3,
      targetWordsPerModule: 300,
    },
  },
  {
    id: "creative-craft",
    emoji: "🎨",
    title: "Creative craft",
    values: {
      topic: "Introduction to film editing",
      audience:
        "Curious beginners interested in film and storytelling. No prior production experience required.",
      tone: "casual",
      language: "English",
      targetModuleCount: 3,
      targetWordsPerModule: 300,
    },
  },
];

const BLANK_DEFAULTS: SyllabusInput = {
  topic: "",
  audience: "",
  tone: "neutral",
  language: "English",
  targetModuleCount: 10,
  targetWordsPerModule: 1000,
};

const isDev = process.env.NODE_ENV === "development";

export function SyllabusForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<SyllabusInput>(
    isDev ? TEMPLATES[0].values : BLANK_DEFAULTS,
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    isDev ? TEMPLATES[0].id : null,
  );

  function pick(t: Template) {
    setSelectedId(t.id);
    setValues(t.values);
    setError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const parsed = SyllabusInputSchema.safeParse(values);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("\n"),
      );
      return;
    }
    saveDraftInput(parsed.data);
    router.push("/courses/new/draft");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3" />
          <span>Need inspiration? Try an example to pre-fill the form:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => {
            const active = selectedId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => pick(t)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                <span>{t.emoji}</span>
                <span>{t.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New deepdive</CardTitle>
          <CardDescription>
            Describe the topic and audience. We&apos;ll draft a syllabus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                name="topic"
                required
                value={values.topic}
                onChange={(e) =>
                  setValues((v) => ({ ...v, topic: e.target.value }))
                }
                placeholder="e.g. The history of the printing press"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="audience">Audience</Label>
              <Textarea
                id="audience"
                name="audience"
                required
                rows={3}
                value={values.audience}
                onChange={(e) =>
                  setValues((v) => ({ ...v, audience: e.target.value }))
                }
                placeholder="e.g. Software engineers curious about media history, no prior knowledge assumed"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="tone">Tone</Label>
                <Input
                  id="tone"
                  name="tone"
                  value={values.tone ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, tone: e.target.value }))
                  }
                  placeholder="neutral, casual, academic…"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="language">Language</Label>
                <Input
                  id="language"
                  name="language"
                  value={values.language ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, language: e.target.value }))
                  }
                  placeholder="English, Spanish…"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="targetModuleCount">Number of modules</Label>
                <Input
                  id="targetModuleCount"
                  name="targetModuleCount"
                  type="number"
                  min={3}
                  max={20}
                  value={values.targetModuleCount}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      targetModuleCount: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="targetWordsPerModule">
                  Words per module (target)
                </Label>
                <Input
                  id="targetWordsPerModule"
                  name="targetWordsPerModule"
                  type="number"
                  min={200}
                  max={3000}
                  step={100}
                  value={values.targetWordsPerModule}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      targetWordsPerModule: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive whitespace-pre-wrap">
                {error}
              </p>
            )}

            <div>
              <Button type="submit">Generate syllabus</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
