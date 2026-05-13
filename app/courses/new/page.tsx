import Link from "next/link";
import { SyllabusForm } from "./_components/syllabus-form";

export default function NewCoursePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12 sm:py-16">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Sapiens Workshop
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">New deepdive</h1>
        <p className="text-muted-foreground">
          Describe the topic and audience. We&apos;ll draft a syllabus you can
          refine.
        </p>
      </header>
      <SyllabusForm />
    </main>
  );
}
