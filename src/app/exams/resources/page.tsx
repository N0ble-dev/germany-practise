import catalog from "../../../../content/resources/catalog.json";
import { resourceCatalogSchema } from "@/lib/content-pipeline/resources";
import { ExamResources } from "@/components/exam-resources";
export const metadata = { title: "Exam resources library · Deutsch Journey" };
export default function Page() {
  return (
    <ExamResources resources={resourceCatalogSchema.parse(catalog).resources} />
  );
}
