import {
  contentRepository,
  contentFailure,
} from "@/lib/content-pipeline/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const course = new URL(request.url).searchParams.get("course");
  if (course && !/^[a-z0-9][a-z0-9-]{0,99}$/.test(course))
    return Response.json({ error: "Invalid course." }, { status: 400 });
  try {
    return Response.json(
      { lessons: await contentRepository().published(course ?? undefined) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return contentFailure(error);
  }
}
