import { z } from "zod";
import { examActor, examRepository, examFailure } from "@/lib/exams/server";
import { readExamMedia } from "@/lib/exams/media";
export async function GET(
  request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  try {
    const actor = await examActor(request);
    const id = z.uuid().parse((await context.params).attemptId);
    const taskId = z
      .string()
      .min(1)
      .max(100)
      .parse(new URL(request.url).searchParams.get("taskId"));
    const { asset, script } = await examRepository().audioTask(
      id,
      actor.id,
      taskId,
    );
    const { bytes } = await readExamMedia(asset, script);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
      },
    });
  } catch (error) {
    return examFailure(error);
  }
}
