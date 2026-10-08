import { localDay, type LearningState } from "./learning";
export const defaultWhy =
  "I want to visit these places and build a life in Germany.";
export const dailyEncouragement = [
  {
    german: "Ein kleiner Schritt, jeden Tag.",
    english: "One small step, every day.",
    arabic: "خطوة صغيرة كل يوم.",
    reminder:
      "Five words today could become part of a real conversation there.",
  },
  {
    german: "Ich lerne für mein Leben in Deutschland.",
    english: "I am learning for my life in Germany.",
    arabic: "أتعلم من أجل حياتي في ألمانيا.",
    reminder:
      "Picture introducing yourself to a new neighbor. Practice one sentence for that moment.",
  },
  {
    german: "Heute übe ich ein bisschen Deutsch.",
    english: "Today I am practicing a little German.",
    arabic: "اليوم أتدرّب قليلاً على الألمانية.",
    reminder:
      "A few minutes today keep your plans in view. Start with something small.",
  },
  {
    german: "Ich kann jeden Tag etwas lernen.",
    english: "I can learn something every day.",
    arabic: "أستطيع أن أتعلم شيئاً كل يوم.",
    reminder:
      "Imagine asking for your train, ordering breakfast, or making a friend. Give one moment a few German words.",
  },
  {
    german: "Ich mache weiter, in meinem Tempo.",
    english: "I keep going, at my own pace.",
    arabic: "أواصل التعلّم بالسرعة المناسبة لي.",
    reminder:
      "Missed a day? You can begin again today. Your dream is still worth a small step.",
  },
  {
    german: "Meine Zukunft beginnt mit kleinen Schritten.",
    english: "My future begins with small steps.",
    arabic: "مستقبلي يبدأ بخطوات صغيرة.",
    reminder:
      "The photo is your reminder. A little listening, recall, and speaking is today's next step.",
  },
] as const;
export function motivationForToday(
  state: Pick<LearningState, "activities">,
  now = new Date(),
) {
  const day = localDay(now);
  // Choose by the learner's calendar date, so the note stays the same after a refresh.
  const calendarIndex = Math.floor(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400_000,
  );
  const days = new Set(
    state.activities
      .filter((a) => localDay(new Date(a.at)) <= day)
      .map((a) => localDay(new Date(a.at))),
  );
  return {
    practiced: days.has(day),
    practiceDays: days.size,
    encouragement:
      dailyEncouragement[calendarIndex % dailyEncouragement.length],
  };
}
