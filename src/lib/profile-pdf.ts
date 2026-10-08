import { jsPDF } from "jspdf";
import type { LearningReport } from "./learning-report";

export type ReportFonts = { latin: Uint8Array; arabic: Uint8Array };
function base64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export async function createProfilePdf(
  report: LearningReport,
  fonts: ReportFonts,
  signal?: AbortSignal,
) {
  const pdf = new jsPDF({
    format: "a4",
    unit: "mm",
    compress: true,
    putOnlyUsedFonts: true,
  });
  pdf.addFileToVFS("NotoSans.ttf", base64(fonts.latin));
  pdf.addFont("NotoSans.ttf", "Notebook", "normal");
  pdf.addFileToVFS("Amiri.ttf", base64(fonts.arabic));
  pdf.addFont("Amiri.ttf", "Arabic", "normal");
  pdf.setProperties({
    title: "Deutsch Journey · My learning notebook",
    author: report.learner,
    subject: "My A1.1 German learning journey",
    creator: "Deutsch Journey",
  });
  pdf.setLanguage("de-DE");
  const left = 18,
    width = 174,
    bottom = 277;
  let y = 38;
  function font(text: string) {
    pdf.setFont(
      /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(text)
        ? "Arabic"
        : "Notebook",
      "normal",
    );
  }
  function heading() {
    pdf.setFillColor(245, 244, 250);
    pdf.rect(0, 0, 210, 26, "F");
    pdf.setFont("Notebook", "normal");
    pdf.setFontSize(15);
    pdf.setTextColor(45, 38, 70);
    pdf.text("Deutsch Journey", left, 12);
    pdf.setFontSize(9);
    pdf.text("MY A1.1 LEARNING NOTEBOOK", left, 19);
  }
  function room(height: number) {
    if (y + height > bottom) {
      pdf.addPage();
      heading();
      y = 36;
    }
  }
  function text(value: string, size = 10, indent = 0) {
    font(value);
    pdf.setFontSize(size);
    pdf.setTextColor(42, 46, 56);
    const rtl = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(value);
    const lines = pdf.splitTextToSize(
      value.replace(/\r/g, ""),
      width - indent,
    ) as string[];
    const height = size * 0.46 + (rtl ? 1 : 0);
    for (const line of lines) {
      room(height);
      pdf.text(
        line,
        rtl ? left + width : left + indent,
        y,
        rtl ? { align: "right", isInputRtl: true, isOutputRtl: false } : {},
      );
      y += height;
    }
  }
  heading();
  text(report.learner, 18);
  y += 2;
  text(
    `Exported ${new Date(report.generatedAt).toLocaleDateString("en", { dateStyle: "long" })}`,
    9,
  );
  text(
    "Your saved learning on this device. Keep practicing, one small step at a time.",
    9,
  );
  y += 6;
  let processed = 0;
  for (const section of report.sections) {
    signal?.throwIfAborted();
    room(18);
    pdf.setDrawColor(205, 199, 224);
    pdf.line(left, y, left + width, y);
    y += 7;
    text(section.title, 14);
    y += 3;
    for (const entry of section.entries) {
      room(14);
      if (entry.title) text(entry.title, 11);
      for (const line of entry.lines) text(line);
      y += 4;
      if (++processed % 40 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        signal?.throwIfAborted();
      }
    }
  }
  const pages = pdf.getNumberOfPages();
  for (let index = 1; index <= pages; index++) {
    pdf.setPage(index);
    pdf.setFont("Notebook", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 104, 113);
    pdf.text(`Deutsch Journey · ${index} / ${pages}`, left, 288);
  }
  signal?.throwIfAborted();
  return pdf.output("blob");
}
export async function downloadProfilePdf(
  report: LearningReport,
  signal: AbortSignal,
) {
  const bytes = await Promise.all(
    ["NotoSans-Regular.ttf", "Amiri-Regular.ttf"].map(async (file) => {
      const response = await fetch(`/fonts/pdf/${file}`, { signal });
      if (!response.ok)
        throw new Error("The PDF fonts could not load. Please try again.");
      return new Uint8Array(await response.arrayBuffer());
    }),
  );
  const blob = await createProfilePdf(
    report,
    { latin: bytes[0], arabic: bytes[1] },
    signal,
  );
  signal.throwIfAborted();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `deutsch-journey-notebook-${report.generatedAt.slice(0, 10)}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
