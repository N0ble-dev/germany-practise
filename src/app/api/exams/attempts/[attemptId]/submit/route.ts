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
    const id = z.uuid().parse((await context.params).attemptId);
    const body = await examBody(
      request,
      z.object({ revision: z.number().int().min(0) }).strict(),
      1000,
    );
    return examResponse(
      await examRepository().submit(id, actor.id, body.revision),
    );
  } catch (error) {
    return examFailure(error);
  }
}
