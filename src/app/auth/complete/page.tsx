import type { Metadata } from "next";
import { AuthComplete } from "@/components/auth-complete";
import { authDestination } from "@/lib/auth-navigation";

export const metadata: Metadata = {
  title: "Connecting your Google account · Deutsch Journey",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <AuthComplete destination={authDestination(params.next)} />;
}
