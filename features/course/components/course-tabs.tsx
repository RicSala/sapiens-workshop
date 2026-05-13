"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function CourseTabs({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const readerHref = `/courses/${courseId}`;
  const syllabusHref = `/courses/${courseId}/syllabus`;
  const onSyllabus = pathname === syllabusHref;
  const onReader = !onSyllabus;

  return (
    <nav
      aria-label="Course views"
      className="flex items-center gap-1 border-b border-border"
    >
      <Tab href={readerHref} active={onReader}>
        Course
      </Tab>
      <Tab href={syllabusHref} active={onSyllabus}>
        Syllabus
      </Tab>
    </nav>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "-mb-px inline-flex items-center border-b-2 px-3 py-2 text-sm transition-colors",
        active
          ? "border-foreground font-medium text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
