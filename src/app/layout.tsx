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
export const metadata: Metadata = {
  applicationName: "Deutsch Journey",
  creator: creatorBrand.name,
  authors: [
    { name: creatorBrand.name, url: creatorBrand.website || undefined },
  ],
  title: "Deutsch Journey · A little German, every day",
  description:
    "Your personal A1.1 German learning companion. Build a steady habit with vocabulary, spaced reviews, listening, and everyday conversations.",
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
