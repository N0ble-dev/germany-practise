import { DraftLessonPreview } from "@/components/draft-lesson-preview";
export const metadata = {
  title: "Editorial lesson preview · Deutsch Journey",
  robots: { index: false, follow: false },
};
export default async function DraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonKey: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const [{ lessonKey }, { version }] = await Promise.all([
    params,
    searchParams,
  ]);
  return <DraftLessonPreview lessonKey={lessonKey} version={version ?? "1"} />;
}
