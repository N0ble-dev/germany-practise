import type { PersonalProfile } from "./journey-model";

// Each option stores one usable German form. Learners choose the form themselves.
export const professions = [
  {
    label: "Software developer",
    forms: ["Softwareentwickler", "Softwareentwicklerin"],
  },
  { label: "Designer", forms: ["Designer", "Designerin"] },
  { label: "Engineer", forms: ["Ingenieur", "Ingenieurin"] },
  { label: "Doctor", forms: ["Arzt", "Ärztin"] },
  { label: "Nurse", forms: ["Pflegefachmann", "Pflegefachfrau"] },
  { label: "Teacher", forms: ["Lehrer", "Lehrerin"] },
  { label: "Accountant", forms: ["Buchhalter", "Buchhalterin"] },
  { label: "Sales assistant", forms: ["Verkäufer", "Verkäuferin"] },
  { label: "Chef / cook", forms: ["Koch", "Köchin"] },
  { label: "Driver", forms: ["Fahrer", "Fahrerin"] },
  { label: "Electrician", forms: ["Elektriker", "Elektrikerin"] },
  { label: "University student", forms: ["Student", "Studentin"] },
  { label: "School student", forms: ["Schüler", "Schülerin"] },
] as const;

export const motivations: {
  id: NonNullable<PersonalProfile["motivation"]>;
  label: string;
  detail: string;
}[] = [
  {
    id: "home",
    label: "Make Germany home",
    detail: "Feel at ease in everyday life.",
  },
  {
    id: "career",
    label: "Grow my career",
    detail: "Meet people and talk about my work.",
  },
  {
    id: "study",
    label: "Study in Germany",
    detail: "Introduce myself and make friends.",
  },
  {
    id: "people",
    label: "Connect with people",
    detail: "Share a little more of myself.",
  },
  {
    id: "travel",
    label: "Explore Germany",
    detail: "Find my way and enjoy the small moments.",
  },
];

export const interests: {
  id: PersonalProfile["interests"][number];
  label: string;
  german: string;
}[] = [
  { id: "coffee", label: "Coffee", german: "Ich trinke gern Kaffee." },
  { id: "cooking", label: "Cooking", german: "Ich koche gern." },
  { id: "music", label: "Music", german: "Ich höre gern Musik." },
  { id: "sport", label: "Sport", german: "Ich mache gern Sport." },
  { id: "reading", label: "Reading", german: "Ich lese gern." },
  { id: "travel", label: "Travel", german: "Ich reise gern." },
];

export const situations: {
  id: PersonalProfile["situations"][number];
  label: string;
  lesson: number;
  german: string;
  english: string;
}[] = [
  {
    id: "work",
    label: "At work",
    lesson: 2,
    german: "Was sind Sie von Beruf?",
    english: "What do you do for work?",
  },
  {
    id: "neighbors",
    label: "Meeting neighbors",
    lesson: 1,
    german: "Hallo! Ich wohne hier.",
    english: "Hello! I live here.",
  },
  {
    id: "cafe",
    label: "At a café",
    lesson: 9,
    german: "Ich möchte einen Kaffee, bitte.",
    english: "I'd like a coffee, please.",
  },
  {
    id: "shopping",
    label: "Shopping",
    lesson: 6,
    german: "Wie viel kostet das?",
    english: "How much does that cost?",
  },
  {
    id: "transport",
    label: "Getting around",
    lesson: 10,
    german: "Wo ist der Bahnhof?",
    english: "Where is the train station?",
  },
  {
    id: "friends",
    label: "Making plans",
    lesson: 8,
    german: "Hast du am Samstag Zeit?",
    english: "Do you have time on Saturday?",
  },
  {
    id: "family",
    label: "My family",
    lesson: 3,
    german: "Das ist meine Familie.",
    english: "This is my family.",
  },
  {
    id: "home",
    label: "My home",
    lesson: 4,
    german: "Der Tisch ist schön.",
    english: "The table is nice.",
  },
];

export function personalIntroduction(
  profile: PersonalProfile,
  name: string,
): string[] {
  return [
    name.trim() && name !== "Guest" ? `Ich heiße ${name.trim()}.` : "",
    profile.country.trim() ? `Ich komme aus ${profile.country.trim()}.` : "",
    profile.city.trim() ? `Ich wohne in ${profile.city.trim()}.` : "",
    profile.profession.trim() ? `Ich bin ${profile.profession.trim()}.` : "",
    profile.languages.trim() ? `Ich spreche ${profile.languages.trim()}.` : "",
    ...profile.interests.map(
      (id) => interests.find((item) => item.id === id)!.german,
    ),
  ].filter(Boolean);
}

const startingSituations: Record<
  NonNullable<PersonalProfile["motivation"]>,
  PersonalProfile["situations"]
> = {
  home: ["neighbors", "shopping", "home"],
  career: ["work", "neighbors", "friends"],
  study: ["neighbors", "friends", "transport"],
  people: ["neighbors", "family", "friends"],
  travel: ["transport", "cafe", "shopping"],
};

export function personalPractice(profile: PersonalProfile) {
  const ids = profile.situations.length
    ? profile.situations
    : profile.motivation
      ? startingSituations[profile.motivation]
      : [];
  return ids.map((id) => situations.find((item) => item.id === id)!);
}

export function personalProfileReport(profile: PersonalProfile): string[] {
  return [
    ...(["country", "city", "profession", "languages"] as const).map((key) =>
      profile[key]
        ? `${key[0].toUpperCase() + key.slice(1)}: ${profile[key]}`
        : "",
    ),
    profile.motivation
      ? `My reason: ${motivations.find((item) => item.id === profile.motivation)!.label}`
      : "",
    profile.interests.length
      ? `Interests: ${profile.interests.map((id) => interests.find((item) => item.id === id)!.label).join(", ")}`
      : "",
    profile.situations.length
      ? `Everyday situations: ${profile.situations.map((id) => situations.find((item) => item.id === id)!.label).join(", ")}`
      : "",
  ].filter(Boolean);
}

export function personalFocus(profile: PersonalProfile, name: string) {
  const intro = personalIntroduction(profile, name);
  const moment = personalPractice(profile)[0];
  const german = profile.profession.trim()
    ? `Ich bin ${profile.profession.trim()}.`
    : profile.interests.length
      ? interests.find((item) => item.id === profile.interests[0])!.german
      : intro[0] || moment?.german || "";
  return {
    configured: personalProfileReport(profile).length > 0,
    german,
    moment,
    reason: motivations.find((goal) => goal.id === profile.motivation)?.label,
    lesson: profile.profession
      ? 2
      : profile.interests.length
        ? 7
        : intro.length
          ? 1
          : (moment?.lesson ?? 1),
  };
}
