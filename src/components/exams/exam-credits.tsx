import type { ExamPack } from "@/lib/exams/model";

export function ExamCredits({ credits }: { credits?: ExamPack["rights"] }) {
  if (!credits) return null;
  return (
    <details className="arena-demo-note arena-credits">
      <summary>Practice content & credits</summary>
      <p>
        {credits.authors.join(", ")} · {credits.license}
      </p>
      {credits.modified && <p>Adapted for independent German exam practice.</p>}
      {credits.sourceUrl && (
        <p>
          <a href={credits.sourceUrl} target="_blank" rel="noreferrer">
            Original source ↗
          </a>
        </p>
      )}
      {credits.licenseUrl && (
        <p>
          <a href={credits.licenseUrl} target="_blank" rel="noreferrer">
            License terms ↗
          </a>
        </p>
      )}
    </details>
  );
}
