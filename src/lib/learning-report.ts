import { lessons } from "./content";
import { destinations } from "./destinations";
import { formatWord, streak, type LearningState, type Word } from "./learning";
import { stepLabels } from "./journey-model";
import { studyLabels } from "./planner-model";
import { personalProfileReport } from "./personal-life";

export const reportSections = [
  { id: "overview", label: "Profile and progress" },
  { id: "words", label: "Vocabulary, translations and examples" },
  { id: "sentences", label: "Saved sentences" },
  { id: "journey", label: "Book journey, missions and challenges" },
  { id: "notes", label: "Lesson notes" },
  { id: "planner", label: "Study calendar and reminders" },
  { id: "activity", label: "Practice history" },
  { id: "motivation", label: "My Germany dream" },
] as const;
export type ReportSectionId = (typeof reportSections)[number]["id"];
export type ReportEntry = {
  title?: string;
  lines: string[];
  word?: Pick<
    Word,
    | "english"
    | "arabic"
    | "plural"
    | "example"
    | "hint"
    | "topic"
    | "lesson"
    | "status"
    | "favorite"
    | "reviews"
    | "mistakes"
    | "due"
    | "source"
  >;
};
export type ReportSection = {
  id: ReportSectionId;
  title: string;
  entries: ReportEntry[];
};
export type LearningReport = {
  learner: string;
  generatedAt: string;
  sections: ReportSection[];
};
export function lessonTitle(number: string | number) {
  const lesson = lessons[Number(number) - 1];
  return `Lesson ${number}${lesson ? ` · ${lesson.title}` : ""}`;
}
export function studyDate(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
export function addedWords(state: LearningState) {
  return state.words.filter(
    (word) => !word.id.startsWith("seed-") && !word.id.startsWith("book-"),
  );
}
export function buildLearningReport(
  state: LearningState,
  learner: string,
  selected: readonly ReportSectionId[] = reportSections.map(
    (section) => section.id,
  ),
  now = new Date(),
): LearningReport {
  const sections: ReportSection[] = [];
  function add(id: ReportSectionId, entries: ReportEntry[]) {
    if (selected.includes(id))
      sections.push({
        id,
        title: reportSections.find((section) => section.id === id)!.label,
        entries: entries.length
          ? entries
          : [
              {
                lines: [
                  "Nothing saved here yet. A small step today is a good beginning.",
                ],
              },
            ],
      });
  }
  if (selected.includes("overview"))
    add("overview", [
      {
        title: learner,
        lines: [
          `Learning name: ${state.name}`,
          `${state.xp} XP · ${state.words.length} words · ${state.savedSentences.length} saved sentences`,
          `${streak(state, now)} consecutive study days · ${state.completedLessons.length}/12 chapters completed`,
          `${state.goal} minutes of practice · ${state.goal * 2} XP daily intention`,
          ...personalProfileReport(state.personalProfile),
        ],
      },
    ]);
  if (selected.includes("words"))
    add(
      "words",
      [...state.words]
        .sort((a, b) => a.german.localeCompare(b.german, "de"))
        .map((word) => ({
          title: formatWord(word),
          word: {
            english: word.english,
            arabic: word.arabic,
            plural: word.plural,
            example: word.example,
            hint: word.hint,
            topic: word.topic,
            lesson: word.lesson,
            status: word.status,
            favorite: word.favorite,
            reviews: word.reviews,
            mistakes: word.mistakes,
            due: word.due,
            source: word.source,
          },
          lines: [
            word.english,
            ...(word.arabic ? [word.arabic] : []),
            ...(word.plural ? [`Plural: ${word.plural}`] : []),
            ...(word.example ? [`Example: ${word.example}`] : []),
            ...(word.hint ? [`Your hint: ${word.hint}`] : []),
            `${word.topic} · ${word.source ? "Content library" : `Lesson ${word.lesson}`} · ${word.status}${word.favorite ? " · Favorite" : ""}`,
            ...(word.source
              ? [
                  `Source: ${word.source.attribution}`,
                  word.source.url,
                  `${word.source.license} · ${word.source.licenseUrl}`,
                ]
              : []),
            `${word.reviews} reviews · ${word.mistakes} tricky moments · Next review: ${studyDate(word.due)}`,
          ],
        })),
    );
  if (selected.includes("sentences"))
    add("sentences", [
      ...state.savedSentences.map((sentence) => ({ lines: [sentence] })),
      ...(state.libraryBookmarks ?? []).map((item) => ({
        title: `Source text · ${item.source.label}`,
        lines: [
          item.german,
          item.english,
          item.source.attribution,
          item.source.url,
          `${item.source.license} · ${item.source.licenseUrl}`,
        ],
      })),
    ]);
  if (selected.includes("journey"))
    add("journey", [
      ...Object.entries(state.journey.lessons).map(([number, progress]) => ({
        title: lessonTitle(number),
        lines: [
          progress.completedAt
            ? `Completed: ${studyDate(progress.completedAt)}`
            : "In progress",
          `Steps: ${progress.steps.map((step) => stepLabels[step]).join(", ") || "Getting started"}`,
          ...(["vocabulary", "listening", "speaking", "grammar"] as const)
            .filter((skill) => progress[skill] !== null)
            .map((skill) => `${skill}: ${Math.round(progress[skill]!)}%`),
          ...(progress.missionResponse
            ? [
                `Life mission (${progress.missionPassed ? "passed" : "practice"}):`,
                progress.missionResponse,
              ]
            : []),
        ],
      })),
      ...Object.entries(state.journey.checkpoints).map(
        ([module, checkpoint]) => ({
          title: `Module ${module} challenge`,
          lines: [
            checkpoint.completedAt
              ? `Completed: ${studyDate(checkpoint.completedAt)}`
              : "In progress",
            `${checkpoint.passed.length} tasks passed`,
            ...Object.entries(checkpoint.responses).map(
              ([question, response]) => `${question}: ${response}`,
            ),
          ],
        }),
      ),
    ]);
  if (selected.includes("notes"))
    add(
      "notes",
      Object.entries(state.lessonNotes)
        .filter(([, note]) => note.trim())
        .map(([number, note]) => ({
          title: lessonTitle(number),
          lines: [note],
        })),
    );
  if (selected.includes("planner"))
    add(
      "planner",
      [...state.planner.sessions]
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((session) => ({
          title: session.title,
          lines: [
            `${studyDate(session.startsAt, session.timeZone)} · ${session.timeZone} · ${session.duration} minutes`,
            `${studyLabels[session.kind]} · Lesson ${session.lesson} · ${session.status}`,
            session.reminder === null
              ? "No reminder"
              : session.reminder === 0
                ? "Reminder at start time"
                : `Reminder ${session.reminder} minutes before`,
            ...(session.note ? [session.note] : []),
          ],
        })),
    );
  if (selected.includes("activity"))
    add(
      "activity",
      [...state.activities].reverse().map((activity) => ({
        title: activity.label,
        lines: [
          `${studyDate(activity.at)} · Lesson ${activity.lesson} · +${activity.xp} XP`,
        ],
      })),
    );
  const destination = destinations.find(
    (place) => place.id === state.motivation.destination,
  )!;
  if (selected.includes("motivation"))
    add("motivation", [
      {
        title: destination.name,
        lines: [
          destination.landmark,
          state.motivation.why || "A little German, every day.",
          destination.phrase,
          destination.meaning,
        ],
      },
    ]);
  return { learner, generatedAt: now.toISOString(), sections };
}
