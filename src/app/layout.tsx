import type { Metadata, Viewport } from "next";
import { LearningApp } from "@/components/learning-app";
import { isCloudConfigured } from "@/lib/auth";
import { creatorBrand } from "@/lib/creator-brand";
import "./journey.css";
import "./globals.css";
import "./motivation.css";
import "./planner.css";
import "./welcome.css";
import "./profile.css";
import "./review.css";
import "./social.css";
import "./content-studio.css";
import "./exams.css";
import "./exam-arena.css";
import "./personal-life.css";
import "./community.css";
import "./content-factory.css";
import "./content-imports.css";
import "./german-journey.css";
import "./library.css";
export const metadata: Metadata = {
  applicationName: "Deutsch Journey",
  creator: creatorBrand.name,
  authors: [
    { name: creatorBrand.name, url: creatorBrand.website || undefined },
  ],
  title: "Deutsch Journey · German for the life you want",
  description:
    "Make German part of your life. Build a daily practice, collect useful words, study with friends, and prepare for your next exam with Deutsch Journey.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f6f8",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cloudEnabled = isCloudConfigured();
  return (
    <html lang="en">
      <body>
        <LearningApp cloudEnabled={cloudEnabled}>{children}</LearningApp>
      </body>
    </html>
  );
}
