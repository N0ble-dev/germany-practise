import { notFound } from "next/navigation";
import { examDefinition, examSkills } from "@/lib/exams/definitions";
import { examStarter } from "@/lib/exams/content";
import { publicExamTask } from "@/lib/exams/model";
import { ExamStudio } from "@/components/exams/exam-studio";
import { ExamGuide } from "@/components/exams/exam-arena";
export default async function Page({
  params,
}: {
  params: Promise<{ examCode: string; skill: string }>;
}) {
  const { examCode, skill } = await params;
  const definition = examDefinition(examCode);
  if (!definition || !examSkills.some((item) => item === skill)) notFound();
  if (definition.level !== "A1") return <ExamGuide definition={definition} />;
  const tasks = examStarter.tasks
    .filter((task) => task.skill === skill)
    .map((task) => publicExamTask(task));
  return (
    <ExamStudio
      key={skill}
      skill={tasks[0].skill}
      examCode={definition.code}
      tasks={tasks}
    />
  );
}
