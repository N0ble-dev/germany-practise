import {
  reviewCategories,
  type ContentDetail,
  type LessonPack,
} from "../content-pipeline/model.ts";
import { publicationBlockers } from "../content-pipeline/gates.ts";
import { contentHash } from "../content-pipeline/hash.ts";
import {
  skills,
  levels,
  type CoverageState,
  type FactoryCurriculum,
} from "./model.ts";

export type FactoryEvidence = Pick<
  ContentDetail,
  "pack" | "reviews" | "mediaChecks" | "published" | "contentHash"
>;
export function presentActivities(pack: LessonPack): string[] {
  const activities: string[] = ["vocabulary", "grammar", "dialogue", "mission"];
  if (
    pack.exercises.some(
      (e) =>
        e.type === "dictation" ||
        (e.type === "multiple_choice" && e.skill === "listening"),
    )
  )
    activities.push("listening");
  if (
    pack.exercises.some(
      (e) => e.type === "multiple_choice" && e.skill === "reading",
    )
  )
    activities.push("reading");
  if (pack.exercises.some((e) => e.type === "free_speech"))
    activities.push("speaking");
  // A sentence-builder or a scripted mission is not an independent writing task.
  // The v1 lesson engine has no rubric-based writing activity yet.
  return activities;
}
export function buildCoverage(
  map: FactoryCurriculum,
  gitDrafts: LessonPack[],
  evidence: FactoryEvidence[],
  databaseAvailable: boolean,
) {
  const effectivePublications = evidence.filter((e) => e.published);
  const publishedIds = effectivePublications.map((e) => e.pack.id);
  const lessons = map.courses.flatMap((course) =>
    course.lessons.map((lesson) => {
      const staged = evidence
        .filter((e) => e.pack.id === lesson.id)
        .sort((a, b) => b.pack.version - a.pack.version)[0];
      const git = gitDrafts
        .filter((p) => p.id === lesson.id)
        .sort((a, b) => b.version - a.version)[0];
      const active = effectivePublications.find((e) => e.pack.id === lesson.id);
      const candidate =
        git && (!staged || git.version > staged.pack.version)
          ? git
          : (staged?.pack ?? git);
      const matching =
        staged &&
        candidate &&
        staged.pack.version === candidate.version &&
        staged.contentHash === contentHash(candidate)
          ? staged
          : undefined;
      const changedImmutableVersion = !!(
        git &&
        staged &&
        git.version === staged.pack.version &&
        contentHash(git) !== staged.contentHash
      );
      const present = candidate ? presentActivities(candidate) : [];
      const missingActivities = lesson.requiredActivities.filter(
        (a) => !present.includes(a),
      );
      const blockers = candidate
        ? [
            ...publicationBlockers(
              candidate,
              matching?.reviews ?? [],
              matching?.mediaChecks.map((m) => m.id) ?? [],
              publishedIds,
            ),
            ...missingActivities.map(
              (a) =>
                `coverage: add a ${a} activity before calling this a complete lesson.`,
            ),
            ...(changedImmutableVersion
              ? [
                  "integrity: Git and staging disagree for the same immutable version; create a new version.",
                ]
              : []),
          ]
        : ["Author a lesson pack from this brief."];
      const rejected =
        matching &&
        reviewCategories.some(
          (category) =>
            matching.reviews
              .filter(
                (r) =>
                  r.category === category &&
                  r.contentHash === matching.contentHash,
              )
              .at(-1)?.decision === "changes_requested",
        );
      let state: CoverageState = !candidate
        ? "missing"
        : !matching
          ? "draft"
          : rejected || changedImmutableVersion
            ? "needs_revision"
            : blockers.length
              ? "needs_review"
              : "ready";
      if (changedImmutableVersion) state = "needs_revision";
      if (
        active &&
        candidate?.version === active.pack.version &&
        contentHash(candidate) === active.contentHash &&
        !changedImmutableVersion
      )
        state = "published";
      const availableAudio =
        candidate?.dialogues
          .flatMap((d) => d.lines)
          .filter((line) =>
            candidate.media.some(
              (m) =>
                m.lineId === line.id &&
                m.storageKey === line.audioKey &&
                matching?.mediaChecks.some((c) => c.id === m.id),
            ),
          ).length ?? 0;
      const publicActivities = active ? presentActivities(active.pack) : [];
      return {
        ...lesson,
        courseId: course.id,
        subdivision: course.subdivision,
        level: course.level,
        state,
        origin: matching
          ? ("staging" as const)
          : candidate
            ? ("git" as const)
            : ("blueprint" as const),
        version: candidate?.version ?? null,
        publishedVersion: active?.pack.version ?? null,
        blockers,
        missingActivities,
        publishedSkills: skills.filter((s) => publicActivities.includes(s)),
        audioRequired:
          candidate?.dialogues.reduce((n, d) => n + d.lines.length, 0) ?? 0,
        audioChecked: availableAudio,
        contentHash: candidate ? contentHash(candidate) : null,
      };
    }),
  );
  return {
    databaseAvailable,
    lessons,
    totalPlanned: lessons.length,
    totalDrafted: lessons.filter((l) => l.version !== null).length,
    totalPublished: publishedIds.filter((id) =>
      lessons.some((l) => l.id === id),
    ).length,
    levels: levels.map((level) => {
      const rows = lessons.filter((l) => l.level === level);
      return {
        level,
        planned: rows.length,
        drafted: rows.filter((l) => l.version !== null).length,
        published: rows.filter((l) => l.publishedVersion !== null).length,
        skills: Object.fromEntries(
          skills.map((skill) => [
            skill,
            rows.filter((l) => l.publishedSkills.includes(skill)).length,
          ]),
        ) as Record<(typeof skills)[number], number>,
      };
    }),
  };
}
export type FactoryCoverage = ReturnType<typeof buildCoverage>;

export function authoringBrief(
  map: FactoryCurriculum,
  lessonId: string,
  drafts: LessonPack[],
) {
  const course = map.courses.find((c) =>
    c.lessons.some((l) => l.id === lessonId),
  );
  const lesson = course?.lessons.find((l) => l.id === lessonId);
  if (!course || !lesson)
    throw new Error("Choose a lesson ID from the curriculum map.");
  return {
    status: "authoring_brief",
    lessonId,
    courseId: course.id,
    level: course.level,
    goal: lesson.mission,
    scene: lesson.scene,
    allowedGrammar: lesson.grammar,
    knownVocabulary: [
      ...new Set(
        lesson.prerequisites.flatMap(
          (id) =>
            drafts
              .filter((p) => p.id === id)
              .sort((a, b) => b.version - a.version)[0]
              ?.vocabulary.map((w) => w.de) ?? [],
        ),
      ),
    ],
    novelVocabulary:
      "Choose and review a sense-specific vocabulary set for this scenario; do not invent missing forms.",
    outcomes: map.outcomes.filter((o) => lesson.outcomeIds.includes(o.id)),
    requiredActivities: lesson.requiredActivities,
    direction: lesson.authoringDirection,
    examAlignment: lesson.examCode,
    bilingualStyle:
      "Natural German with clear English and Modern Standard Arabic instructions; preserve formal/informal address and RTL text.",
    culturalGuidance:
      "Use inclusive original characters; avoid assumptions about the learner's nationality, job, family or legal situation.",
    answerPolicy:
      "Validate objective keys and accepted variants. Open writing/speaking require an explicit rubric and human calibration, never a fabricated accuracy percentage.",
    sourceConstraints:
      "Original authoring or exact licensed source assets with attribution. Goethe/Hueber/DW/vhs are references, not copied inputs.",
    approvalPolicy:
      "This brief grants no language, translation, rights, audio or publication approval.",
  };
}
