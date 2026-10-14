import { notFound } from "next/navigation";
import { contentRepository } from "@/lib/content-pipeline/server";
import { PublishedLesson } from "@/components/published-lesson";
export const dynamic = "force-dynamic";
export default async function PublishedLessonPage({
  params,
}: {
  params: Promise<{ lessonKey: string }>;
}) {
  const { lessonKey } = await params;
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(lessonKey)) notFound();
  const lessons = await contentRepository().published();
  const lesson = lessons.find((l) => l.lessonKey === lessonKey);
  if (!lesson) notFound();
  return <PublishedLesson pack={lesson.pack} />;
}
