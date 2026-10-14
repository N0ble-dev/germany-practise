import { z } from "zod";
import {
  examActor,
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
    await examRepository().interrupt(
      z.uuid().parse((await context.params).attemptId),
      actor.id,
    );
    return examResponse({ interrupted: true });
  } catch (error) {
    return examFailure(error);
  }
}
