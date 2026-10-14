import type { LessonPack } from "@/lib/content-pipeline/model";
export function ContentSourceCredits({
  references,
}: {
  references: LessonPack["references"];
}) {
  return (
    <section className="panel source-credits">
      <h2>Sources and credits</h2>
      {references.map((ref) => (
        <article key={ref.id}>
          <a href={ref.url} target="_blank" rel="noopener noreferrer">
            {ref.name} ↗
          </a>
          {ref.use === "licensed_content" ? (
            <>
              <p>{ref.attribution}</p>
              <a
                href={ref.licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {ref.license}
              </a>
              <p className="small muted">Changes: {ref.modifications}</p>
            </>
          ) : (
            <p className="small muted">Learning framework reference.</p>
          )}
        </article>
      ))}
      {references.some((ref) => ref.use === "licensed_content") && (
        <p className="small muted">
          The stated licenses apply to the adapted material and its permitted
          reuse.
        </p>
      )}
    </section>
  );
}
