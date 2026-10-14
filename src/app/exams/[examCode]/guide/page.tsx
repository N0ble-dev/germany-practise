import { notFound } from "next/navigation";
import { examDefinition } from "@/lib/exams/definitions";
import { ExamGuide } from "@/components/exams/exam-arena";
export default async function Page({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const definition = examDefinition((await params).examCode);
  if (!definition) notFound();
  return <ExamGuide definition={definition} />;
}
