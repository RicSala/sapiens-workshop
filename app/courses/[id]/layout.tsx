import Link from "next/link";
import { CourseTabs } from "@/features/course/components/course-tabs";
import { ChatWidget } from "@/features/chat/components/chat-widget";

export default async function CourseLayout({
  children,
  params,
}: LayoutProps<"/courses/[id]">) {
  const { id } = await params;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10 sm:py-14">
      <Link
        href="/courses"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Courses
      </Link>
      <CourseTabs courseId={id} />
      {children}
      <ChatWidget courseId={id} />
    </main>
  );
}
