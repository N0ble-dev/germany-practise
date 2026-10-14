import { examSkills, examDefinition, type ExamSkill } from "./definitions.ts";
import type { ExamAnswer, ExamPack, ExamReview, ExamTask } from "./model.ts";

export function answerErrors(task: ExamTask, answer: ExamAnswer): string[] {
  const errors: string[] = [];
  if (
    task.type === "choice" &&
    answer.choice &&
    !task.options.some((option) => option.id === answer.choice)
  )
    errors.push("Choose one of this task's options.");
  if (task.type !== "choice" && answer.choice)
    errors.push("This task uses a written or spoken response.");
  const fields =
    task.type === "writing" ? task.formFields.map((field) => field.id) : [];
  if (Object.keys(answer.fields).some((field) => !fields.includes(field)))
    errors.push("The response contains a field that is not part of this task.");
  const points = task.type === "choice" ? 0 : task.contentPoints.length;
  if (answer.checks.some((index) => index >= points))
    errors.push("The self-review contains an unknown content point.");
  return errors;
}
export function evaluateTask(task: ExamTask, answer: ExamAnswer) {
  if (task.type === "choice")
    return {
      kind: "objective" as const,
      answered: !!answer.choice,
      correct: answer.choice === task.correct,
      earned: answer.choice === task.correct ? task.weight : 0,
      maximum: task.weight,
      correctOption: task.correct,
      explanation: task.explanation,
      evidence: task.evidence,
      passage: task.passage,
    };
  const words = answer.text.trim()
    ? answer.text.trim().split(/\s+/u).length
    : 0;
  const completeFields =
    task.type === "writing"
      ? task.formFields.filter((field) => answer.fields[field.id]?.trim())
          .length
      : 0;
  return {
    kind: "subjective_pending" as const,
    answered:
      !!answer.text.trim() || completeFields > 0 || answer.checks.length > 0,
    wordCount: words,
    completeFields,
    selfReviewedPoints: answer.checks.length,
    contentPoints: task.contentPoints,
    note: "Content-point checks are your own review. A qualified reviewer must assess meaning, language and intelligibility; no exam mark has been assigned.",
  };
}
export function examReport(
  pack: ExamPack,
  answers: Record<string, ExamAnswer>,
  skills: readonly ExamSkill[] = examSkills,
) {
  const items = pack.tasks
    .filter((task) => skills.includes(task.skill))
    .map((task) => ({
      id: task.id,
      title: task.title,
      skill: task.skill,
      objective: task.objective,
      lesson: task.lesson,
      result: evaluateTask(
        task,
        answers[task.id] ?? { text: "", fields: {}, checks: [] },
      ),
    }));
  return {
    label: "Deutsch Journey original practice",
    officialScore: null,
    skills: skills.map((skill) => {
      const section = items.filter((item) => item.skill === skill);
      const objective = section.filter(
        (item) => item.result.kind === "objective",
      );
      return {
        skill,
        answered: section.filter((item) => item.result.answered).length,
        total: section.length,
        correct: objective.filter(
          (item) => item.result.kind === "objective" && item.result.correct,
        ).length,
        objectiveTotal: objective.length,
        reviewPending: section.filter(
          (item) =>
            item.result.kind === "subjective_pending" && item.result.answered,
        ).length,
      };
    }),
    items,
    mistakes: items
      .filter(
        (item) => item.result.kind === "objective" && !item.result.correct,
      )
      .map((item) => ({
        taskId: item.id,
        skill: item.skill,
        objective: item.objective,
        lesson: item.lesson,
        href: `/lessons/${item.lesson}?step=${item.skill === "listening" ? "listen" : "patterns"}`,
      })),
    note: "Raw practice accuracy is not a Goethe score or a prediction of passing. Writing and speaking remain ungraded until reviewed.",
  };
}
export type ExamReport = ReturnType<typeof examReport>;
export function examPublicationBlockers(
  pack: ExamPack,
  hash: string,
  reviews: ExamReview[],
  checkedMedia: string[],
) {
  const blockers: string[] = [];
  if (pack.definitionRevision !== examDefinition(pack.examCode)?.revision)
    blockers.push(
      "The exam format revision no longer matches the reviewed definition.",
    );
  if (pack.kind === "full_mock")
    blockers.push(
      "Full-length mocks require the separate complete-paper release; only drills and section practice are enabled in this release.",
    );
  if (!pack.rights.verified || pack.rights.provenance === "reference_only")
    blockers.push(
      "Verify commercial rights for every original or licensed text and recording.",
    );
  if (
    !["DJ-ORIGINAL", "CC-BY-4.0", "CC0-1.0", "LICENSED"].includes(
      pack.rights.licenseCode,
    )
  )
    blockers.push(
      "Unknown, noncommercial and no-derivatives licenses cannot be published as SaaS exam content.",
    );
  if (
    pack.rights.provenance !== "original" &&
    (!pack.rights.sourceUrl || !pack.rights.licenseUrl)
  )
    blockers.push(
      "Licensed adaptations need source, author, license and modification evidence.",
    );
  if (
    pack.rights.provenance === "original" &&
    pack.rights.licenseCode !== "DJ-ORIGINAL"
  )
    blockers.push(
      "Original text needs the original-content rights declaration.",
    );
  const needsAudio = pack.tasks.some((task) => task.skill === "listening");
  const categories: ExamReview["category"][] = [
    "language",
    "pedagogy",
    "arabic",
    "rights",
    ...(needsAudio ? ["audio" as const] : []),
  ];
  for (const category of categories) {
    const latest = reviews
      .filter((review) => review.category === category)
      .at(-1);
    if (latest?.decision !== "approved" || latest.hash !== hash)
      blockers.push(
        `Human ${category} approval is required for this exact content hash.`,
      );
  }
  for (const task of pack.tasks)
    if (task.type === "choice" && task.skill === "listening" && !task.audioId)
      blockers.push(`${task.id}: owned, reviewed recorded audio is missing.`);
  for (const asset of pack.media)
    if (
      !["DJ-ORIGINAL", "CC-BY-4.0", "CC0-1.0", "LICENSED"].includes(
        asset.licenseCode,
      )
    )
      blockers.push(
        `${asset.id}: the recording's commercial rights are incompatible or unknown.`,
      );
  for (const asset of pack.media)
    if (!checkedMedia.includes(asset.id))
      blockers.push(
        `${asset.id}: audio file, script and rights verification is missing.`,
      );
  if (pack.kind === "full_mock" && !pack.blueprint.complete)
    blockers.push(
      "A complete teacher-approved exam blueprint is required for a full mock.",
    );
  return blockers;
}
