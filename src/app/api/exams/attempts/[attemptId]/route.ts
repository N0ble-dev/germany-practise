import { z } from "zod";
import {
  examActor,
  examRepository,
  examResponse,
  examFailure,
} from "@/lib/exams/server";
type Context = { params: Promise<{ attemptId: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const actor = await examActor(request);
    const id = z.uuid().parse((await context.params).attemptId);
    return examResponse(await examRepository().attempt(id, actor.id));
  } catch (error) {
    return examFailure(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await examActor(request, true);
    const id = z.uuid().parse((await context.params).attemptId);
    await examRepository().removeAttempt(id, actor.id);
    return examResponse({ deleted: true });
  } catch (error) {
    return examFailure(error);
  }
}
