import { notFound } from "next/navigation";
import { z } from "zod";
import { PrivateExamAttempt } from "@/components/exams/exam-private";
export const metadata = {
  title: "My private exam practice",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  if (!z.uuid().safeParse(attemptId).success) notFound();
  return <PrivateExamAttempt key={attemptId} attemptId={attemptId} />;
}
