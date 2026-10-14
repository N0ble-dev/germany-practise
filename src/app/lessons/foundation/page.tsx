import { BookJourney } from "@/components/journey/book-journey";
import Link from "next/link";
export const metadata = { title: "A1.1 foundation course · Deutsch Journey" };
export default function FoundationPage() {
  return (
    <>
      <Link href="/lessons" className="text-link">
        ← Explore your wider German journey
      </Link>
      <BookJourney />
    </>
  );
}
