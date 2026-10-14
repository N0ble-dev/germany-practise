import catalog from "../../../../content/resources/catalog.json";
import { resourceCatalogSchema } from "@/lib/content-pipeline/resources";
import { ExamResources } from "@/components/exam-resources";
import Link from "next/link";
export const metadata = { title: "Exam resources library · Deutsch Journey" };
export default function Page() {
  return (
    <>
      <nav className="arena-top-links" aria-label="Resources navigation">
        <Link href="/exams">← Exam Arena</Link>
        <Link href="/exams/plan">My exam plan</Link>
      </nav>
      <ExamResources
        resources={resourceCatalogSchema.parse(catalog).resources}
      />
    </>
  );
}
