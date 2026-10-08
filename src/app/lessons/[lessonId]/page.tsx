import { notFound } from "next/navigation";
import { LessonJourney } from "@/components/journey/book-journey";
export function generateStaticParams() {
  return Array.from({ length: 12 }, (_, i) => ({ lessonId: String(i + 1) }));
}
export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const number = Number(lessonId);
  if (!/^([1-9]|1[0-2])$/.test(lessonId)) notFound();
  return <LessonJourney key={number} number={number} />;
}
