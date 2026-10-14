import { getDb } from "@/db";
import {
  contentActor,
  contentFailure,
  contentResponse,
} from "@/lib/content-pipeline/server";
import {
  factoryCurriculum,
  factorySources,
  readFactoryDrafts,
} from "@/lib/content-factory/catalog";
import { factoryEvidence } from "@/lib/content-factory/repository";
import { buildCoverage } from "@/lib/content-factory/coverage";
import { readCandidateIntake } from "@/lib/content-factory/intake";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await contentActor(request);
    const drafts = await readFactoryDrafts();
    const intake = await readCandidateIntake();
    const ids = factoryCurriculum.courses.flatMap((c) =>
      c.lessons.map((l) => l.id),
    );
    try {
      const evidence = await factoryEvidence(
        (query) => getDb().execute(query),
        ids,
      );
      return contentResponse({
        coverage: buildCoverage(factoryCurriculum, drafts, evidence, true),
        sources: factorySources.sources,
        intake,
      });
    } catch {
      // Auth succeeded, but publication state is unknown. Never turn a DB failure into a zero-publication claim.
      return contentResponse({
        coverage: buildCoverage(factoryCurriculum, drafts, [], false),
        sources: factorySources.sources,
        intake,
        warning:
          "Staging could not be checked. Showing Git drafts and planning targets; publication counts are unavailable. Retry to check Neon.",
      });
    }
  } catch (error) {
    return contentFailure(error);
  }
}
