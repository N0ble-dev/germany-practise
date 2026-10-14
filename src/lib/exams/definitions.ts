export const examSkills = [
  "listening",
  "reading",
  "writing",
  "speaking",
] as const;
export type ExamSkill = (typeof examSkills)[number];
export const examLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const examCodes = [
  "goethe-a1-sd1-adult",
  "goethe-a2-adult",
  "goethe-b1-adult",
  "goethe-b2-adult",
  "goethe-c1-adult",
  "goethe-c2-adult",
] as const;
export type ExamCode = (typeof examCodes)[number];
export const skillLabels: Record<
  ExamSkill,
  { de: string; en: string; ar: string }
> = {
  listening: { de: "Hören", en: "Listening", ar: "الاستماع" },
  reading: { de: "Lesen", en: "Reading", ar: "القراءة" },
  writing: { de: "Schreiben", en: "Writing", ar: "الكتابة" },
  speaking: { de: "Sprechen", en: "Speaking", ar: "التحدث" },
};
export type ExamDefinition = {
  code: ExamCode;
  level: (typeof examLevels)[number];
  title: string;
  audience: "adult";
  revision: string;
  checkedAt: string;
  formatUrl: string;
  scoringUrl: string;
  speakingSetup: string;
  minutes: Record<ExamSkill, number>;
  scoring: {
    kind: "overall" | "overall_and_components" | "per_module";
    overallMinimum?: number;
    writtenMinimum?: number;
    oralMinimum?: number;
    moduleMinimum?: number;
  };
  sections: Record<ExamSkill, string>;
  preparation: string[];
};
const shared = {
  audience: "adult" as const,
  revision: "2026-10-14-reference-v1",
  checkedAt: "2026-10-14",
  scoringUrl: "https://www.goethe.de/en/spr/prf/pes.html",
};
export const examDefinitions: ExamDefinition[] = [
  {
    ...shared,
    code: examCodes[0],
    level: "A1",
    title: "Goethe-Zertifikat A1: Start Deutsch 1",
    formatUrl: "https://www.goethe.de/ins/de/en/prf/gzsd1.cfm",
    speakingSetup: "Group speaking · 15 minutes",
    minutes: { listening: 20, reading: 25, writing: 20, speaking: 15 },
    scoring: { kind: "overall", overallMinimum: 60 },
    sections: {
      listening: "Short conversations, telephone messages and announcements.",
      reading: "Short messages, notices, signs and advertisements.",
      writing: "A simple form and a short personal message.",
      speaking:
        "Introduce yourself, exchange information, make and respond to requests.",
    },
    preparation: [
      "Practise basic questions, spelling, times and numbers.",
      "Write short messages covering every requested point.",
      "Rehearse all three oral parts with other learners.",
    ],
  },
  {
    ...shared,
    code: examCodes[1],
    level: "A2",
    title: "Goethe-Zertifikat A2",
    formatUrl: "https://www.goethe.de/ins/de/en/prf/gzsd2.cfm",
    speakingSetup: "Paired speaking · 15 minutes",
    minutes: { listening: 30, reading: 30, writing: 30, speaking: 15 },
    scoring: {
      kind: "overall_and_components",
      overallMinimum: 60,
      writtenMinimum: 45,
      oralMinimum: 15,
    },
    sections: {
      listening: "Everyday conversations, interviews and announcements.",
      reading: "Short articles, emails, advertisements and public information.",
      writing: "Messages about familiar everyday situations.",
      speaking:
        "Answer personal questions, describe your life and agree on a plan with a partner.",
    },
    preparation: [
      "Build routines for everyday messages and conversations.",
      "Practise making suggestions and agreeing on plans.",
      "Prepare both written and oral components; each has its own minimum.",
    ],
  },
  {
    ...shared,
    code: examCodes[2],
    level: "B1",
    title: "Goethe-Zertifikat B1",
    formatUrl: "https://www.goethe.de/ins/de/en/prf/gzb1.cfm",
    speakingSetup: "Paired speaking · 15 minutes",
    minutes: { listening: 40, reading: 65, writing: 60, speaking: 15 },
    scoring: { kind: "per_module", moduleMinimum: 60 },
    sections: {
      listening:
        "Announcements, short talks, conversations and radio discussions.",
      reading: "Blogs, emails, articles, advertisements and instructions.",
      writing:
        "Personal and formal correspondence and an opinion contribution.",
      speaking: "Plan together, give a presentation and answer questions.",
    },
    preparation: [
      "Train each module separately and keep a record of recurring mistakes.",
      "Practise giving reasons and responding to your partner.",
      "Use timed official models after building your B1 language skills.",
    ],
  },
  {
    ...shared,
    code: examCodes[3],
    level: "B2",
    title: "Goethe-Zertifikat B2",
    formatUrl: "https://www.goethe.de/ins/de/en/prf/gzb2.cfm",
    speakingSetup: "Paired speaking · 15 minutes",
    minutes: { listening: 40, reading: 65, writing: 75, speaking: 15 },
    scoring: { kind: "per_module", moduleMinimum: 60 },
    sections: {
      listening:
        "Interviews, talks and conversations; identify details and viewpoints.",
      reading: "Articles, forum contributions, commentary and rules.",
      writing: "An opinion text and a formal professional message.",
      speaking: "Present a topic and exchange arguments in a discussion.",
    },
    preparation: [
      "Separate factual details from the speaker's opinion.",
      "Structure arguments, examples and conclusions in writing.",
      "Practise a presentation followed by spontaneous discussion.",
    ],
  },
  {
    ...shared,
    code: examCodes[4],
    level: "C1",
    title: "Goethe-Zertifikat C1",
    formatUrl: "https://www.goethe.de/ins/de/en/prf/gzc1.cfm",
    speakingSetup: "Paired speaking · 20 minutes",
    minutes: { listening: 40, reading: 65, writing: 75, speaking: 20 },
    scoring: { kind: "per_module", moduleMinimum: 60 },
    sections: {
      listening: "Podcasts, interviews, discussions and lectures.",
      reading:
        "Complex articles and contributions; identify positions and key information.",
      writing: "Develop an opinion and adapt a formal message to its audience.",
      speaking: "Present a complex topic and discuss a controversial issue.",
    },
    preparation: [
      "Work on implicit meaning and the organization of arguments.",
      "Get feedback on register, cohesion and precision.",
      "Practise responding to counterarguments without a prepared script.",
    ],
  },
  {
    ...shared,
    code: examCodes[5],
    level: "C2",
    title: "Goethe-Zertifikat C2: Großes Deutsches Sprachdiplom",
    formatUrl: "https://www.goethe.de/ins/de/en/prf/gzc2.cfm",
    speakingSetup: "Individual speaking · 15 minutes",
    minutes: { listening: 35, reading: 80, writing: 80, speaking: 15 },
    scoring: { kind: "per_module", moduleMinimum: 60 },
    sections: {
      listening: "Natural-speed reports, commentary and expert interviews.",
      reading: "Complex and abstract factual texts, reports and commentary.",
      writing:
        "Rework text and develop a well-structured response to a selected topic.",
      speaking:
        "Present a complex issue, explain arguments and respond to opposing views.",
    },
    preparation: [
      "Practise reconstructing arguments and nuanced meanings.",
      "Seek expert feedback on style and precision.",
      "If choosing a literature topic, check Goethe's current reading list.",
    ],
  },
];
export function examDefinition(code: string) {
  return examDefinitions.find((definition) => definition.code === code);
}
export function officialPassRule(definition: ExamDefinition) {
  const rule = definition.scoring;
  if (rule.kind === "per_module")
    return "Each module needs at least 60 out of 100 points. Strong results in another module do not compensate for a failed module.";
  if (rule.kind === "overall_and_components")
    return "At least 60/100 overall, including at least 45 points in the written component and 15 in the oral component. All sections must be completed.";
  return "At least 60/100 overall, with all sections completed. The written component offers 75 points and the oral component 25.";
}
export const examDisclaimer =
  "Independent preparation for Goethe-Zertifikat exams. Deutsch Journey is not affiliated with Goethe-Institut and does not issue Goethe certificates.";
