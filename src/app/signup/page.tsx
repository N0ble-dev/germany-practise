import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-pages";
import { authDestination } from "@/lib/auth-navigation";
export const metadata: Metadata = {
  title: "Create your account · Deutsch Journey",
};
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <AuthPage
      mode="signup"
      returnTo={authDestination(params.next)}
      oauthFailed={params.oauth === "error"}
    />
  );
}
