import { GermanJourney } from "@/components/german-journey";
import { journeyLevels, type JourneyLevel } from "@/lib/german-journey";
import { factoryCurriculum } from "@/lib/content-factory/catalog";
export const metadata = {
  title: "Your A1–C2 German journey · Deutsch Journey",
  description:
    "Choose your German practice direction, explore real-life writing and speaking ideas, and find your foundation course and exam resources.",
};
export default async function JourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const { level } = await searchParams;
  const initialLevel: JourneyLevel = journeyLevels.includes(
    level as JourneyLevel,
  )
    ? (level as JourneyLevel)
    : "A1";
  const courses = factoryCurriculum.courses.map(
    ({ id, level, title, modules, lessons }) => ({
      id,
      level,
      title,
      modules,
      lessons: lessons.map(({ id, title, mission, scene }) => ({
        id,
        title,
        mission,
        scene,
      })),
    }),
  );
  return (
    <GermanJourney
      key={initialLevel}
      courses={courses}
      initialLevel={initialLevel}
    />
  );
}
