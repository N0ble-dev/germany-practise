import { z } from "zod";
import { examAnswerSchema } from "@/lib/exams/model";
import {
  examActor,
  examBody,
  examRepository,
  examResponse,
  examFailure,
} from "@/lib/exams/server";
const input = z
  .object({
    taskId: z.string().max(100),
    answer: examAnswerSchema,
    revision: z.number().int().min(0),
  })
  .strict();
export async function PATCH(
  request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  try {
    const actor = await examActor(request, true);
    const id = z.uuid().parse((await context.params).attemptId);
    const body = await examBody(request, input, 60000);
    return examResponse(
      await examRepository().saveAnswer(
        id,
        actor.id,
        body.taskId,
        body.answer,
        body.revision,
      ),
    );
  } catch (error) {
    return examFailure(error);
  }
}
