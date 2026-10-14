import { z } from "zod";
import {
  examActor,
  examRepository,
  examResponse,
  examFailure,
} from "@/lib/exams/server";
export async function GET(
  request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  try {
    const actor = await examActor(request);
    return examResponse(
      await examRepository().report(
        z.uuid().parse((await context.params).attemptId),
        actor.id,
      ),
    );
  } catch (error) {
    return examFailure(error);
  }
}
