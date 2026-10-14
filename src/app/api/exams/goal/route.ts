import { examGoalSchema } from "@/lib/exams/model";
import {
  examActor,
  examBody,
  examRepository,
  examResponse,
  examFailure,
} from "@/lib/exams/server";
export async function GET(request: Request) {
  try {
    const actor = await examActor(request);
    return examResponse({ goal: await examRepository().goal(actor.id) });
  } catch (error) {
    return examFailure(error);
  }
}
export async function PUT(request: Request) {
  try {
    const actor = await examActor(request, true);
    const goal = await examBody(request, examGoalSchema, 2000);
    return examResponse({
      goal: await examRepository().saveGoal(actor.id, goal),
    });
  } catch (error) {
    return examFailure(error);
  }
}
