import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-6 px-6 py-12 sm:py-24">
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">
          Sapiens Workshop
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          Generate deepdive courses on any topic, for any audience. Read them,
          listen to them, or take them with you as an EPUB.
        </p>
      </header>
      <div className="flex items-center gap-3">
        <Button asChild size="lg">
          <Link href="/courses/new">Start a new deepdive</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/courses">Browse courses</Link>
        </Button>
      </div>
    </main>
  );
}
