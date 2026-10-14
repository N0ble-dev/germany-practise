import { contentHash } from "./hash.ts";
import { sourceEvidenceErrors } from "./source-evidence.ts";
import {
  reviewCategories,
  type ContentReview,
  type LessonPack,
} from "./model.ts";

export function publicationBlockers(
  pack: LessonPack,
  reviews: ContentReview[],
  checkedAssets: string[],
  availablePrerequisites: string[],
): string[] {
  const hash = contentHash(pack),
    blockers: string[] = sourceEvidenceErrors(pack.references);
  for (const category of reviewCategories) {
    const latest = reviews
      .filter((r) => r.category === category && r.contentHash === hash)
      .at(-1);
    if (latest?.decision !== "approved")
      blockers.push(
        `${category}: human approval required for this exact version.`,
      );
  }
  if (!pack.rights.commercialUseCleared)
    blockers.push("rights: commercial distribution is not cleared.");
  if (
    pack.vocabulary.some((w) => w.type === "noun" && w.pluralKind === "unknown")
  )
    blockers.push("vocabulary: resolve unknown noun plurals.");
  for (const prerequisite of pack.prerequisites)
    if (!availablePrerequisites.includes(prerequisite))
      blockers.push(`prerequisite: ${prerequisite} is not published.`);
  blockers.push(...recordingBlockers(pack, checkedAssets));
  return blockers;
}

export function recordingBlockers(
  pack: LessonPack,
  checkedAssets: string[],
): string[] {
  const blockers: string[] = [];
  for (const line of pack.dialogues.flatMap((d) => d.lines)) {
    const asset = pack.media.find(
      (m) => m.lineId === line.id && m.storageKey === line.audioKey,
    );
    if (!asset) blockers.push(`audio: ${line.id} has no recording.`);
    else {
      if (asset.scriptHash !== contentHash(line.text.de))
        blockers.push(
          `audio: ${line.id} no longer matches its approved script.`,
        );
      if (!checkedAssets.includes(asset.id))
        blockers.push(`audio: ${asset.id} needs file verification.`);
    }
  }
  return blockers;
}

export function validateRelationships(
  packs: LessonPack[],
  plannedIds = packs.map((p) => p.id),
  plannedEdges: Record<string, string[]> = {},
): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  const byId = new Map<string, { prerequisites: string[] }>(
    Object.entries(plannedEdges).map(([id, prerequisites]) => [
      id,
      { prerequisites },
    ]),
  );
  for (const pack of [...packs].sort((a, b) => a.version - b.version))
    byId.set(pack.id, pack);
  for (const pack of packs) {
    const key = `${pack.id}@${pack.version}`;
    if (keys.has(key)) errors.push(`Duplicate version: ${key}`);
    keys.add(key);
    for (const prerequisite of pack.prerequisites)
      if (!plannedIds.includes(prerequisite))
        errors.push(`${key}: unknown prerequisite ${prerequisite}`);
  }
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(key: string) {
    if (visiting.has(key)) {
      errors.push(`Cyclic prerequisite: ${key}`);
      return;
    }
    if (visited.has(key)) return;
    visiting.add(key);
    for (const next of byId.get(key)?.prerequisites ?? []) visit(next);
    visiting.delete(key);
    visited.add(key);
  }
  for (const key of byId.keys()) visit(key);
  return errors;
}
