import { ExamPlan } from "@/components/exams/exam-plan";
export const metadata = {
  title: "My exam preparation plan",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <ExamPlan />;
}
