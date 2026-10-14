import { ExamArena } from "@/components/exams/exam-arena";
import { journeyLevels, type JourneyLevel } from "@/lib/german-journey";
export const metadata = {
  title: "Goethe exam preparation · Exam Arena · Deutsch Journey",
  description:
    "Prepare for your Goethe exam with level-specific guides, four skill studios, a personal exam plan, and targeted lesson practice.",
};
export default async function ExamArenaPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const { level } = await searchParams;
  const initialLevel = journeyLevels.includes(level as JourneyLevel)
    ? (level as JourneyLevel)
    : undefined;
  return (
    <ExamArena key={initialLevel ?? "default"} initialLevel={initialLevel} />
  );
}
