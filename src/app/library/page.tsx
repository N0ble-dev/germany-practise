import { ContentLibrary } from "@/components/content-library";
import { libraryQuerySchema } from "@/lib/library/model";
export const metadata = {
  title: "German content library · Deutsch Journey",
  description:
    "Explore the supplied German book chapters, vocabulary, grammar, activities, and full German–English sentence collection. Save source texts and practise recall.",
};
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const input = libraryQuerySchema.safeParse(
    Object.fromEntries(
      Object.entries(params).filter(
        ([key, value]) => key !== "item" && typeof value === "string",
      ),
    ),
  );
  const initial = input.success ? input.data : libraryQuerySchema.parse({});
  const item = Number(params.item);
  return (
    <ContentLibrary
      key={JSON.stringify(initial)}
      initial={{
        ...initial,
        ...(Number.isSafeInteger(item) && item > 0 ? { item } : {}),
      }}
    />
  );
}
