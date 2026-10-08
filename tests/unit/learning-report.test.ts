import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initialState } from "../../src/lib/content";
import { buildLearningReport } from "../../src/lib/learning-report";
import { createProfilePdf } from "../../src/lib/profile-pdf";

it("includes complete learning records while excluding session and database information", () => {
  const state = initialState();
  state.savedSentences = ["Ich heiße Amina. Grüße aus Ägypten!"];
  state.lessonNotes = { "1": "Practice the German umlauts." };
  const report = buildLearningReport(
    state,
    "Amina",
    undefined,
    new Date("2030-01-01T12:00:00Z"),
  );
  expect(report.sections).toHaveLength(8);
  expect(
    report.sections.find((section) => section.id === "words")!.entries,
  ).toHaveLength(state.words.length);
  expect(JSON.stringify(report)).toContain(state.savedSentences[0]);
  expect(JSON.stringify(report)).toContain(state.lessonNotes["1"]);
  expect(JSON.stringify(report)).not.toMatch(
    /userId|cookie|secret|password|access_token|refresh_token/,
  );
});
it("honors section selections and preserves all saved sentences beyond the visible page", () => {
  const state = initialState();
  state.savedSentences = Array.from(
    { length: 21 },
    (_, index) => `Satz ${index + 1}.`,
  );
  const report = buildLearningReport(state, "Amina", ["sentences"]);
  expect(report.sections).toHaveLength(1);
  expect(report.sections[0].entries).toHaveLength(21);
  expect(report.sections[0].entries.at(-1)!.lines[0]).toBe("Satz 21.");
});
it("creates a real, paginated PDF with embedded German/Arabic fonts", async () => {
  const state = initialState();
  state.savedSentences = Array.from(
    { length: 90 },
    () => "Ich heiße Amina. Grüße aus Ägypten! مرحبا، أتعلم الألمانية كل يوم.",
  );
  const report = buildLearningReport(state, "Amina", ["sentences"]);
  const blob = await createProfilePdf(report, {
    latin: readFileSync("public/fonts/pdf/NotoSans-Regular.ttf"),
    arabic: readFileSync("public/fonts/pdf/Amiri-Regular.ttf"),
    bold: readFileSync("public/fonts/pdf/NotoSans-Bold.ttf"),
    logo: readFileSync("public/brand/deutsch-journey.png"),
    creatorLogo: readFileSync("public/brand/nabil-logo.png"),
    creatorName: readFileSync("public/fonts/pdf/Skranji-Regular.ttf"),
  });
  const pdf = Buffer.from(await blob.arrayBuffer());
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.toString("latin1")).toContain("/ToUnicode");
  expect(
    Number(pdf.toString("latin1").match(/\/Count (\d+)/)?.[1]),
  ).toBeGreaterThan(1);
  // Only the selected sentences section gets a contents link.
  expect(pdf.toString("latin1").match(/\/Dest \[/g)).toHaveLength(1);
  const pages = Number(pdf.toString("latin1").match(/\/Count (\d+)/)?.[1]);
  // Every page's logo and copyright credit lead to the creator's actual site.
  expect(
    pdf.toString("latin1").match(/\/URI \(https:\/\/nabil7\.site\/\)/g),
  ).toHaveLength(pages * 2);
  expect(blob.size).toBeGreaterThan(10_000);
});
it("cancels generation when the account changes", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    createProfilePdf(
      buildLearningReport(initialState(), "Amina"),
      {
        latin: readFileSync("public/fonts/pdf/NotoSans-Regular.ttf"),
        arabic: readFileSync("public/fonts/pdf/Amiri-Regular.ttf"),
      },
      controller.signal,
    ),
  ).rejects.toThrow();
});
