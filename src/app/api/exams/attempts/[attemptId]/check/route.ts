import { z } from "zod";
import {
  examActor,
  examBody,
  examRepository,
  examResponse,
  examFailure,
} from "@/lib/exams/server";
export async function POST(
  request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  try {
    const actor = await examActor(request, true);
    const body = await examBody(
      request,
      z.object({ taskId: z.string().max(100) }).strict(),
      1000,
    );
    return examResponse(
      await examRepository().checkAnswer(
        z.uuid().parse((await context.params).attemptId),
        actor.id,
        body.taskId,
      ),
    );
  } catch (error) {
    return examFailure(error);
  }
}
