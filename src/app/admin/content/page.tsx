import Link from "next/link";
import { ContentReviewWorkbench } from "@/components/content-review-workbench";
import { contentActor } from "@/lib/content-pipeline/server";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Content studio · Deutsch Journey",
  robots: { index: false, follow: false },
};
export default async function ContentStudioPage() {
  let actor;
  try {
    actor = await contentActor();
  } catch {
    return (
      <section className="panel">
        <h1>Content studio</h1>
        <p>
          Use your authorized Google account to review and publish original
          lessons.
        </p>
        <Link href="/signin?next=/admin/content">Continue with Google</Link>
      </section>
    );
  }
  return <ContentReviewWorkbench roles={actor.roles} userId={actor.id} />;
}
