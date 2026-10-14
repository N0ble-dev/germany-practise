import registry from "../../../content/source-assets.json" with { type: "json" };
import { sourceAssetSchema } from "./resources.ts";
import { contentHash } from "./hash.ts";
import type { LessonPack } from "./model.ts";
const assets = registry.assets.map((asset) => sourceAssetSchema.parse(asset));
export function sourceEvidenceErrors(
  references: LessonPack["references"],
): string[] {
  const errors: string[] = [];
  for (const ref of references.filter(
    (ref) => ref.use === "licensed_content",
  )) {
    const asset = assets.find((asset) => asset.id === ref.id);
    if (
      !asset ||
      ref.permissionRef !== `content/source-assets/${ref.id}.json` ||
      ref.sourceAssetHash !== contentHash(asset)
    )
      errors.push(`Unregistered or changed source evidence: ${ref.id}`);
    else if (
      ref.url !== asset.revisionUrl ||
      ref.license !== asset.license ||
      ref.licenseUrl !== asset.licenseUrl ||
      ref.revision !== asset.revision ||
      JSON.stringify(ref.authors) !== JSON.stringify(asset.authors) ||
      ref.attribution !== asset.attribution ||
      ref.modifications !== asset.modifications
    )
      errors.push(
        `Source attribution does not match the staged evidence: ${ref.id}`,
      );
  }
  return errors;
}
