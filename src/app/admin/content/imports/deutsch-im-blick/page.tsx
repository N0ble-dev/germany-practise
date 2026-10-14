import { ContentImportStudio } from "@/components/content-import-studio";
export const metadata = {
  title: "Deutsch im Blick review · Deutsch Journey",
  robots: { index: false, follow: false },
};
export default function DibPage() {
  return <ContentImportStudio initialProvider="deutsch_im_blick" />;
}
