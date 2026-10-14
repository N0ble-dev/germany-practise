import { examDefinition } from "@/lib/exams/definitions";
import { examRepository, examFailure } from "@/lib/exams/server";
import { isCloudConfigured } from "@/lib/auth";
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("examCode") ?? undefined;
  if (code && !examDefinition(code))
    return Response.json(
      { error: "Choose a supported adult exam." },
      { status: 400 },
    );
  if (!isCloudConfigured()) return Response.json({ papers: [] });
  try {
    return Response.json(
      { papers: await examRepository().catalog(code) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return examFailure(error);
  }
}
