import { readFile, writeFile } from "node:fs/promises";
import { resourceCatalogSchema } from "../../src/lib/content-pipeline/resources.ts";
async function main() {
  const path = "content/resources/catalog.json",
    catalog = resourceCatalogSchema.parse(
      JSON.parse(await readFile(path, "utf8")),
    );
  const date = process.argv[2];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? ""))
    throw new Error("Supply the client date as YYYY-MM-DD.");
  for (let start = 0; start < catalog.resources.length; start += 3) {
    await Promise.all(
      catalog.resources.slice(start, start + 3).map(async (row) => {
        try {
          const response = await fetch(row.url, {
            headers: {
              "User-Agent":
                "DeutschJourneyResourceCheck/1.0 (+https://nabil7.site/)",
            },
            signal: AbortSignal.timeout(10000),
            redirect: "follow",
          });
          row.availability = response.ok
            ? "available"
            : [401, 403, 429].includes(response.status)
              ? "restricted"
              : "unavailable";
          await response.body?.cancel();
        } catch {
          row.availability = "unavailable";
        }
        row.checkedAt = date;
        const next = new Date(`${date}T00:00:00Z`);
        next.setUTCDate(next.getUTCDate() + 90);
        row.nextReviewAt = next.toISOString().slice(0, 10);
      }),
    );
    await writeFile(path, JSON.stringify(catalog, null, 2) + "\n");
    console.log(
      `Checked ${Math.min(start + 3, catalog.resources.length)}/${catalog.resources.length} links.`,
    );
  }
  console.log(
    JSON.stringify({
      available: catalog.resources.filter((r) => r.availability === "available")
        .length,
      needsBrowserCheck: catalog.resources
        .filter((r) => r.availability !== "available")
        .map((r) => ({ id: r.id, status: r.availability })),
    }),
  );
}
main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
