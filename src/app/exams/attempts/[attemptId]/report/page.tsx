import { notFound } from "next/navigation";
import { z } from "zod";
import { PrivateExamReport } from "@/components/exams/exam-private";
export const metadata = {
  title: "My private practice report",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  if (!z.uuid().safeParse(attemptId).success) notFound();
  return <PrivateExamReport key={attemptId} attemptId={attemptId} />;
}
