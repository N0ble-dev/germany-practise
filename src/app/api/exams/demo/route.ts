import { z } from "zod";
import { examStarter } from "@/lib/exams/content";
import { examAnswerSchema, publicExamTask } from "@/lib/exams/model";
import { answerErrors, evaluateTask } from "@/lib/exams/evaluation";
import { examBody, examFailure } from "@/lib/exams/server";
const response = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export function GET() {
  return response({
    label: "Original format walkthrough · non-scored examples",
    reviewed: false,
    tasks: examStarter.tasks.map((task) => publicExamTask(task)),
  });
}
const input = z
  .object({
    taskId: z.string().max(100),
    action: z.enum(["script", "explain"]),
    answer: examAnswerSchema.optional(),
  })
  .strict();
export async function POST(request: Request) {
  if (
    request.headers.get("origin") !==
    new URL(process.env.APP_URL ?? request.url).origin
  )
    return response({ error: "Open this action from Deutsch Journey." }, 403);
  let parsed;
  try {
    parsed = {
      success: true as const,
      data: await examBody(request, input, 60000),
    };
  } catch (error) {
    return examFailure(error);
  }
  const task = examStarter.tasks.find((item) => item.id === parsed.data.taskId);
  if (!task) return response({ error: "Example not found." }, 404);
  if (parsed.data.action === "script")
    return task.type === "choice" && task.skill === "listening"
      ? response({
          script: task.passage,
          note: "Browser-voice control demo; not a scored listening test.",
        })
      : response(
          { error: "This example does not have a listening script." },
          400,
        );
  const answer = parsed.data.answer ?? { text: "", fields: {}, checks: [] };
  const errors = answerErrors(task, answer);
  if (errors.length) return response({ error: errors.join(" ") }, 400);
  return response({
    result: evaluateTask(task, answer),
    label: "Example explanation · no exam score or readiness evidence recorded",
  });
}
