import type { Metadata } from "next";
import { StudySpacePage } from "@/components/study-space";
export const metadata: Metadata = {
  title: "Study together · Deutsch Journey",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function SpacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const invite =
    typeof params.invite === "string" && /^[a-f0-9]{64}$/.test(params.invite)
      ? params.invite
      : null;
  return <StudySpacePage invite={invite} />;
}
