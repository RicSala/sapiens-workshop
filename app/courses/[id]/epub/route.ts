import { db } from "@/lib/db";
import { buildEpub } from "@/features/epub";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        select: {
          order: true,
          title: true,
          content: true,
          status: true,
        },
      },
    },
  });
  if (!course) {
    return new Response("Course not found", { status: 404 });
  }

  let built;
  try {
    built = await buildEpub(course);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to build EPUB";
    return new Response(message, { status: 409 });
  }

  return new Response(new Uint8Array(built.bytes), {
    headers: {
      "Content-Type": "application/epub+zip",
      "Content-Disposition": `attachment; filename="${built.filename}"`,
      "Content-Length": String(built.bytes.byteLength),
    },
  });
}
