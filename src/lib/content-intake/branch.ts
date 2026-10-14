import { ContentError } from "../content-pipeline/repository.ts";
export function intakeConnection(
  env: Record<string, string | undefined> = process.env,
) {
  const review = env.CONTENT_REVIEW_DATABASE_URL,
    production = env.CONTENT_PUBLICATION_DATABASE_URL ?? env.DATABASE_URL,
    expected = env.CONTENT_REVIEW_BRANCH_HOST;
  if (!review || !production || !expected)
    throw new ContentError(
      "Configure the separate content review database and its expected branch host to open imports.",
      503,
    );
  const parse = (value: string) => {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol))
      throw new ContentError("Use Postgres review credentials.", 503);
    return url;
  };
  const source = parse(review),
    target = parse(production),
    host = (u: URL) => u.hostname.replace("-pooler", "");
  if (
    host(source) !== expected.replace("-pooler", "") ||
    `${host(source)}${source.pathname}` === `${host(target)}${target.pathname}`
  )
    throw new ContentError(
      "Content intake must use the explicitly configured review branch, separate from production.",
      503,
    );
  return review;
}
