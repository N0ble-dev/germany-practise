import { z } from "zod";

import { levels, skills } from "./constants.ts";
export {
  levels,
  skills,
  coverageStates,
  type CoverageState,
} from "./constants.ts";
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/);
const text = z.string().trim().min(1).max(5000);
const https = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
});
export const factoryCurriculumSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.literal("planning_draft"),
    mappingStatus: z.literal("needs_specialist_review"),
    description: text,
    references: z.array(https).min(1),
    outcomes: z
      .array(
        z
          .object({
            id,
            level: z.enum(levels),
            skill: z.enum(skills),
            canDo: text,
            referenceUrl: https,
          })
          .strict(),
      )
      .min(24),
    courses: z
      .array(
        z
          .object({
            id,
            level: z.enum(levels),
            subdivision: text,
            title: text,
            origin: z.enum(["original_companion", "deutsch_journey_original"]),
            modules: z
              .array(
                z
                  .object({ id, title: text, lessonIds: z.array(id).min(1) })
                  .strict(),
              )
              .min(1),
            lessons: z
              .array(
                z
                  .object({
                    id,
                    number: z.number().int().positive(),
                    title: text,
                    scene: text,
                    mission: text,
                    outcomeIds: z.array(id).min(4),
                    prerequisites: z.array(id),
                    topics: z.array(id).min(1),
                    grammar: z.array(text).min(1),
                    pronunciationFocus: text,
                    requiredSkills: z.array(z.enum(skills)).length(4),
                    requiredActivities: z
                      .array(
                        z.enum([
                          "vocabulary",
                          "grammar",
                          "dialogue",
                          "listening",
                          "reading",
                          "writing",
                          "speaking",
                          "mission",
                        ]),
                      )
                      .min(8),
                    examCode: id,
                    authoringDirection: text,
                  })
                  .strict(),
              )
              .min(1),
          })
          .strict(),
      )
      .length(9),
  })
  .strict()
  .superRefine((map, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    const unique = (values: string[], name: string) => {
      if (new Set(values).size !== values.length) fail(`Duplicate ${name}.`);
    };
    unique(
      map.courses.map((c) => c.id),
      "course ID",
    );
    unique(
      map.outcomes.map((o) => o.id),
      "outcome ID",
    );
    const lessons = map.courses.flatMap((c) => c.lessons);
    unique(
      lessons.map((l) => l.id),
      "lesson ID",
    );
    unique(
      map.courses.flatMap((c) => c.modules.map((m) => m.id)),
      "module ID",
    );
    const byId = new Map(lessons.map((l) => [l.id, l]));
    const outcomes = new Map(map.outcomes.map((o) => [o.id, o]));
    for (const level of levels)
      for (const skill of skills)
        if (!map.outcomes.some((o) => o.level === level && o.skill === skill))
          fail(`Missing ${level} ${skill} outcome.`);
    for (const course of map.courses) {
      unique(
        course.lessons.map((l) => String(l.number)),
        `${course.id} lesson number`,
      );
      const membership = course.modules.flatMap((m) => m.lessonIds);
      unique(membership, `${course.id} module membership`);
      if (
        membership.length !== course.lessons.length ||
        membership.some((key) => !course.lessons.some((l) => l.id === key))
      )
        fail(`${course.id}: every lesson must belong to exactly one module.`);
      for (const lesson of course.lessons) {
        unique(lesson.requiredSkills, `${lesson.id} skill`);
        unique(lesson.requiredActivities, `${lesson.id} activity`);
        unique(lesson.outcomeIds, `${lesson.id} outcome`);
        const mapped = lesson.outcomeIds.map((key) => outcomes.get(key));
        if (
          mapped.some((o) => !o || o.level !== course.level) ||
          skills.some((skill) => !mapped.some((o) => o?.skill === skill))
        )
          fail(`${lesson.id}: map all four skills at the correct level.`);
        for (const prerequisite of lesson.prerequisites)
          if (prerequisite === lesson.id || !byId.has(prerequisite))
            fail(`${lesson.id}: invalid prerequisite ${prerequisite}.`);
        if (
          lesson.examCode !==
          `goethe-${course.level.toLowerCase()}${course.level === "A1" ? "-sd1" : ""}-adult`
        )
          fail(`${lesson.id}: exam alignment must match the level.`);
      }
    }
    const visiting = new Set<string>(),
      visited = new Set<string>();
    function visit(key: string) {
      if (visiting.has(key)) {
        fail(`Cyclic prerequisite: ${key}.`);
        return;
      }
      if (visited.has(key)) return;
      visiting.add(key);
      for (const next of byId.get(key)?.prerequisites ?? []) visit(next);
      visiting.delete(key);
      visited.add(key);
    }
    for (const key of byId.keys()) visit(key);
  });
export type FactoryCurriculum = z.infer<typeof factoryCurriculumSchema>;
export type FactoryLesson =
  FactoryCurriculum["courses"][number]["lessons"][number];

export const releaseManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    status: z.literal("staging_candidate"),
    changelog: text,
    lessons: z
      .array(
        z
          .object({
            path: z
              .string()
              .regex(/^content\/lessons\/[a-z0-9-]+\/lesson-\d+\.v\d+\.json$/),
            lessonId: id,
            version: z.number().int().positive(),
            contentHash: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict()
  .superRefine((release, ctx) => {
    if (
      new Set(release.lessons.map((l) => l.lessonId)).size !==
      release.lessons.length
    )
      ctx.addIssue({
        code: "custom",
        message: "A release selects one exact revision per lesson.",
      });
  });
export type ReleaseManifest = z.infer<typeof releaseManifestSchema>;

export const sourceCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    sources: z
      .array(
        z
          .object({
            id,
            name: text,
            url: https,
            termsUrl: https,
            lane: z.enum(["reference", "open_content", "structured_data"]),
            importMethod: z.enum([
              "outbound_only",
              "curated_mediawiki",
              "official_entity_json",
              "official_download",
              "manual_permission",
            ]),
            policy: z.enum([
              "reference_only",
              "per_item_review",
              "structured_cc0_only",
              "blocked_pending_permission",
            ]),
            restrictions: text,
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((catalog, ctx) => {
    if (
      new Set(catalog.sources.map((s) => s.id)).size !== catalog.sources.length
    )
      ctx.addIssue({ code: "custom", message: "Source IDs must be unique." });
    for (const source of catalog.sources)
      if (
        source.policy === "reference_only" &&
        source.importMethod !== "outbound_only"
      )
        ctx.addIssue({
          code: "custom",
          message: `${source.id}: reference sources cannot be import feeds.`,
        });
  });
