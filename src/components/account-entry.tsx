"use client";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

export function AccountEntry() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return null;
  return (
    <Button asChild size="sm" variant="outline" className="account-entry">
      <Link href={session ? "/profile" : "/signin"}>
        {session ? "My account" : "Sign in"}
      </Link>
    </Button>
  );
}
