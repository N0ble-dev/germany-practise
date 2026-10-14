import { ExamMistakeLab } from "@/components/exams/exam-private";
export const metadata = {
  title: "My exam results & mistake lab",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <ExamMistakeLab />;
}
