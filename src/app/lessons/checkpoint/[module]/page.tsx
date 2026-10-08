import { notFound } from "next/navigation";
import { ModuleCheckpoint } from "@/components/journey/book-journey";
export function generateStaticParams() {
  return [1, 2, 3, 4].map((n) => ({ module: String(n) }));
}
export default async function CheckpointPage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  if (!/^[1-4]$/.test(module)) notFound();
  return <ModuleCheckpoint key={module} number={Number(module)} />;
}
