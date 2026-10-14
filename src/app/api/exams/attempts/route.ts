import { z } from "zod";
import { examSkills } from "@/lib/exams/definitions";
import {
  examActor,
  examBody,
  examRepository,
  examResponse,
  examFailure,
} from "@/lib/exams/server";
const create = z
  .object({
    paperVersionId: z.uuid(),
    idempotencyKey: z.uuid(),
    mode: z.enum(["coach", "timed_section", "preview"]),
    skill: z.enum(examSkills).optional(),
  })
  .strict();
export async function GET(request: Request) {
  try {
    const actor = await examActor(request);
    return examResponse({ attempts: await examRepository().history(actor.id) });
  } catch (error) {
    return examFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await examActor(request, true);
    return examResponse(
      await examRepository().create(
        actor.id,
        await examBody(request, create, 2000),
        actor.roles.includes("author"),
      ),
      201,
    );
  } catch (error) {
    return examFailure(error);
  }
}
