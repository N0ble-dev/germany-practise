export const journeyLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type JourneyLevel = (typeof journeyLevels)[number];
export type JourneyCourse = {
  id: string;
  level: JourneyLevel;
  title: string;
  modules: { id: string; title: string; lessonIds: string[] }[];
  lessons: { id: string; title: string; mission: string; scene: string }[];
};
