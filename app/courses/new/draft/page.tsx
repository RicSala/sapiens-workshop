import Link from "next/link";
import { SyllabusStreamer } from "@/features/course/components/syllabus-streamer";

export default function DraftPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10 sm:py-14">
      <Link
        href="/courses/new"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to form
      </Link>
      <SyllabusStreamer />
    </main>
  );
}
