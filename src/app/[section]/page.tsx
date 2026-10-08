import { notFound } from "next/navigation";
import { Vocabulary } from "@/components/vocabulary";
import { Lessons } from "@/components/lessons";
import { Review } from "@/components/review";
import { AudioPractice } from "@/components/audio-practice";
import { SentenceLab, Games, Germany } from "@/components/practice";
import { Progress, Profile } from "@/components/progress-profile";
const views = {
  vocabulary: Vocabulary,
  review: Review,
  listening: AudioPractice,
  speaking: AudioPractice,
  sentences: SentenceLab,
  grammar: Lessons,
  games: Games,
  germany: Germany,
  progress: Progress,
  profile: Profile,
};
export function generateStaticParams() {
  return Object.keys(views).map((section) => ({ section }));
}
export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!(section in views)) notFound();
  const View = views[section as keyof typeof views];
  return <View />;
}
