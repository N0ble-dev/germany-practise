import { jsPDF } from "jspdf";
import { autoTable, type RowInput, type UserOptions } from "jspdf-autotable";
import { creatorBrand } from "./creator-brand";
import {
  studyDate,
  type LearningReport,
  type ReportSectionId,
} from "./learning-report";

export type ReportFonts = {
  latin: Uint8Array;
  arabic: Uint8Array;
  bold?: Uint8Array;
  logo?: Uint8Array;
  creatorLogo?: Uint8Array;
  creatorName?: Uint8Array;
};
const titles: Record<ReportSectionId, string> = {
  overview: "Your learner profile",
  words: "Your vocabulary",
  sentences: "Your saved sentences",
  journey: "Your book journey",
  notes: "Your lesson notes",
  planner: "Your study calendar",
  activity: "Your practice history",
  motivation: "Your Germany dream",
};
const descriptions: Record<ReportSectionId, string> = {
  overview:
    "A snapshot of your progress and the goals you are working towards.",
  words: "Cover the meanings, recall the German, then say the example aloud.",
  sentences:
    "Read aloud. Change a word. Make the sentence part of your everyday life.",
  journey: "Your chapter progress, life missions and module challenges.",
  notes: "The ideas and reminders you chose to keep from each lesson.",
  planner: "Make room for a little German in your day.",
  activity: "Every practice session is another step forward.",
  motivation:
    "Keep your reason for learning close. Small steps take you places.",
};
const ink: [number, number, number] = [23, 23, 23];
const muted: [number, number, number] = [91, 99, 111];
const paper: [number, number, number] = [255, 249, 235];
const line: [number, number, number] = [224, 227, 231];
const hasArabic = (value: string) =>
  /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(value);
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
  signal?.throwIfAborted();
  const pdf = new jsPDF({
    format: "a4",
    unit: "mm",
    compress: true,
    putOnlyUsedFonts: true,
  });
  pdf.addFileToVFS("NotoSans.ttf", base64(fonts.latin));
  pdf.addFont("NotoSans.ttf", "Notebook", "normal");
  pdf.addFileToVFS("NotoSans-Bold.ttf", base64(fonts.bold ?? fonts.latin));
  pdf.addFont("NotoSans-Bold.ttf", "Notebook", "bold");
  pdf.addFileToVFS("Amiri.ttf", base64(fonts.arabic));
  pdf.addFont("Amiri.ttf", "Arabic", "normal");
  if (fonts.creatorName) {
    pdf.addFileToVFS("Skranji.ttf", base64(fonts.creatorName));
    pdf.addFont("Skranji.ttf", "Creator", "normal");
  }
  pdf.setProperties({
    title: "Deutsch Journey · My learning notebook",
    author: report.learner,
    subject: "My A1.1 German learning journey",
    creator: "Deutsch Journey",
  });
  pdf.setLanguage("de-DE");
  const left = 18,
    width = 174,
    bottom = 274;
  let y = 36;
  const anchors = new Map<ReportSectionId, { page: number; top: number }>();
  const pageLabels = new Map<number, string>();
  function text(
    value: string,
    x: number,
    top: number,
    size = 10,
    bold = false,
    maxWidth = width,
  ) {
    const rtl = hasArabic(value);
    pdf.setFont(rtl ? "Arabic" : "Notebook", bold && !rtl ? "bold" : "normal");
    pdf.setFontSize(rtl ? size * 1.15 : size);
    pdf.setTextColor(...ink);
    const lines = pdf.splitTextToSize(
      value.replace(/\r/g, ""),
      maxWidth,
    ) as string[];
    pdf.text(
      lines,
      rtl ? x + maxWidth : x,
      top,
      rtl
        ? {
            align: "right",
            isInputVisual: false,
            isOutputVisual: true,
            isInputRtl: true,
            isOutputRtl: false,
          }
        : {},
    );
  }
  function room(height: number) {
    if (y + height > bottom) {
      pdf.addPage();
      y = 36;
    }
  }
  // The cover doubles as a linked contents page. Only selected data is included.
  [ink, [221, 38, 38], [244, 192, 49]].forEach((color, index) => {
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.rect(index * 70, 0, 70, 2, "F");
  });
  if (fonts.logo) pdf.addImage(fonts.logo, "PNG", left, 19, 13, 13);
  text("DEUTSCH JOURNEY", fonts.logo ? 36 : left, 25, 12, true);
  text("A little German, every day.", fonts.logo ? 36 : left, 31, 8.5);
  text("MENSCHEN A1.1 · PERSONAL STUDY NOTEBOOK", left, 57, 9, true);
  text("My German", left, 77, 31, true);
  text("learning notebook.", left, 94, 31, true);
  pdf.setDrawColor(...line);
  pdf.line(left, 107, left + width, 107);
  let nameSize = 21;
  pdf.setFont(
    hasArabic(report.learner) ? "Arabic" : "Notebook",
    hasArabic(report.learner) ? "normal" : "bold",
  );
  while (nameSize > 11) {
    pdf.setFontSize(nameSize);
    if (pdf.getTextWidth(report.learner) <= width) break;
    nameSize--;
  }
  text(report.learner, left, 123, nameSize, true);
  text(
    `Exported ${new Date(report.generatedAt).toLocaleDateString("en", { dateStyle: "long" })}`,
    left,
    137,
    9.5,
  );
  const count = (id: ReportSectionId) =>
    report.sections
      .find((section) => section.id === id)
      ?.entries.filter(
        (entry) =>
          entry.title ||
          entry.lines[0] !==
            "Nothing saved here yet. A small step today is a good beginning.",
      ).length ?? 0;
  [
    [count("words"), "Words included"],
    [count("sentences"), "Saved sentences"],
    [report.sections.length, "Selected sections"],
  ].forEach(([value, label], index) => {
    const x = left + index * 60;
    pdf.setFillColor(...paper);
    pdf.roundedRect(x, 148, 54, 25, 2, 2, "F");
    text(String(value), x + 5, 159, 18, true, 44);
    text(String(label), x + 5, 167, 8, false, 44);
  });
  text("IN THIS NOTEBOOK", left, 191, 9, true);
  report.sections.forEach((section, index) => {
    const top = 203 + index * 7;
    text(titles[section.id], left, top, 10.5);
    pdf.setDrawColor(...line);
    pdf.line(left, top + 2, left + width, top + 2);
  });
  text(
    "Ein kleiner Schritt, jeden Tag. · One small step, every day.",
    left,
    278,
    8.5,
  );
  pdf.addPage();

  function table(options: UserOptions, label: string) {
    autoTable(pdf, {
      startY: y,
      margin: { top: 34, bottom: 23, left, right: left },
      tableWidth: width,
      theme: "plain",
      showHead: "everyPage",
      rowPageBreak: "avoid",
      styles: {
        font: "Notebook",
        fontStyle: "normal",
        fontSize: 9.5,
        cellPadding: 4,
        overflow: "linebreak",
        textColor: ink,
        lineColor: line,
        lineWidth: { bottom: 0.15 },
        valign: "top",
      },
      headStyles: {
        fillColor: ink,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [247, 248, 250] },
      ...options,
      didParseCell(data) {
        if (data.section === "body" && hasArabic(data.cell.text.join(" "))) {
          data.cell.styles.font = "Arabic";
          data.cell.styles.fontStyle = "normal";
          data.cell.styles.fontSize =
            label === titles.words && data.column.index === 2 ? 12 : 11.5;
          data.cell.styles.halign = "right";
        }
      },
      willDrawCell(data) {
        signal?.throwIfAborted();
        if (data.section !== "body" || !hasArabic(data.cell.text.join(" ")))
          return;
        // AutoTable measures and paginates; jsPDF shapes each Arabic line with explicit bidi settings.
        const cell = data.cell;
        if (Array.isArray(cell.styles.fillColor)) {
          pdf.setFillColor(...cell.styles.fillColor);
          pdf.rect(cell.x, cell.y, cell.width, cell.height, "F");
        }
        pdf.setDrawColor(...line);
        pdf.setLineWidth(0.15);
        pdf.line(
          cell.x,
          cell.y + cell.height,
          cell.x + cell.width,
          cell.y + cell.height,
        );
        pdf.setFont("Arabic", "normal");
        pdf.setFontSize(cell.styles.fontSize);
        pdf.setTextColor(...ink);
        const baseline =
          cell.y +
          cell.padding("top") +
          (cell.styles.fontSize / pdf.internal.scaleFactor) * 0.8;
        const spacing = pdf.getLineHeight() / pdf.internal.scaleFactor;
        cell.text.forEach((value, index) =>
          pdf.text(
            value,
            cell.x + cell.width - cell.padding("right"),
            baseline + index * spacing,
            {
              align: "right",
              isInputVisual: false,
              isOutputVisual: true,
              isInputRtl: true,
              isOutputRtl: false,
            },
          ),
        );
        return false;
      },
      willDrawPage() {
        if (!pageLabels.has(pdf.getNumberOfPages()))
          pageLabels.set(pdf.getNumberOfPages(), label);
      },
    });
    y =
      (pdf as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 10;
  }

  for (const section of report.sections) {
    signal?.throwIfAborted();
    const empty =
      section.entries.length === 1 &&
      !section.entries[0].title &&
      section.entries[0].lines[0] ===
        "Nothing saved here yet. A small step today is a good beginning.";
    room(empty ? 29 : 58);
    anchors.set(section.id, { page: pdf.getNumberOfPages(), top: y - 8 });
    if (!pageLabels.has(pdf.getNumberOfPages()))
      pageLabels.set(pdf.getNumberOfPages(), titles[section.id]);
    text(titles[section.id], left, y, empty ? 14 : 20, true);
    y += empty ? 7 : 8;
    text(
      empty
        ? "No saved records yet. Your next small step can begin here."
        : descriptions[section.id],
      left,
      y,
      9.5,
    );
    y += empty ? 14 : 9;
    if (empty) continue;
    for (let offset = 0; offset < section.entries.length; offset += 40) {
      const entries = section.entries.slice(offset, offset + 40);
      if (section.id === "words" && entries.every((entry) => entry.word)) {
        const body: RowInput[] = entries.map((entry) => {
          const word = entry.word!;
          return [
            {
              content: [
                entry.title!,
                ...(word.plural ? [`Plural: ${word.plural}`] : []),
              ].join("\n"),
              styles: { fontStyle: "bold", fontSize: 10 },
            },
            [
              word.english,
              ...(word.example ? [`Example: ${word.example}`] : []),
              ...(word.hint ? [`Hint: ${word.hint}`] : []),
            ].join("\n"),
            word.arabic || "—",
            {
              content: [
                word.topic,
                `Lesson ${word.lesson} · ${word.status}`,
                ...(word.favorite ? ["Favorite"] : []),
                `${word.reviews} reviews · ${word.mistakes} tricky`,
                `Next: ${studyDate(word.due)}`,
              ].join("\n"),
              styles: { fontSize: 8, textColor: muted },
            },
          ];
        });
        table(
          {
            head: [["German", "Meaning & practice", "Arabic", "Your review"]],
            body,
            columnStyles: {
              0: { cellWidth: 38 },
              1: { cellWidth: 66 },
              2: { cellWidth: 34, halign: "right" },
              3: { cellWidth: 36 },
            },
          },
          titles[section.id],
        );
      } else if (section.id === "sentences") {
        table(
          {
            head: [["#", "Your saved sentences"]],
            body: entries.map((entry, index) => [
              String(offset + index + 1).padStart(2, "0"),
              entry.lines.join("\n"),
            ]),
            columnStyles: {
              0: { cellWidth: 14, textColor: muted },
              1: { cellWidth: 160, fontSize: 11 },
            },
          },
          titles[section.id],
        );
      } else {
        table(
          {
            head: [["Record", "Your saved learning"]],
            body: entries.map((entry) => [
              entry.title || "Learning note",
              entry.lines.join("\n"),
            ]),
            columnStyles: {
              0: { cellWidth: 48, fillColor: paper, fontStyle: "bold" },
              1: { cellWidth: 126, fontSize: 10 },
            },
          },
          titles[section.id],
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
      signal?.throwIfAborted();
    }
  }
  pdf.setPage(1);
  report.sections.forEach((section, index) => {
    const anchor = anchors.get(section.id)!;
    pdf.setFont("Notebook", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...ink);
    pdf.text(String(anchor.page), left + width, 203 + index * 7, {
      align: "right",
    });
    pdf.link(left, 199 + index * 7, width, 7, {
      pageNumber: anchor.page,
      top: anchor.top,
    });
  });
  const pages = pdf.getNumberOfPages();
  for (let index = 1; index <= pages; index++) {
    pdf.setPage(index);
    if (index > 1) {
      text("DEUTSCH JOURNEY", left, 17, 9, true);
      pdf.setFont("Notebook", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      pdf.text(
        pageLabels.get(index) ?? "My learning notebook",
        left + width,
        17,
        { align: "right" },
      );
      pdf.setDrawColor(...line);
      pdf.line(left, 24, left + width, 24);
      [ink, [221, 38, 38], [244, 192, 49]].forEach((color, i) => {
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.rect(left + i * 8, 23, 8, 1, "F");
      });
    }
    pdf.setDrawColor(...line);
    pdf.line(left, 282, left + width, 282);
    const footerTextX = left + (fonts.creatorLogo ? 11 : 0);
    if (fonts.creatorLogo) {
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(...line);
      pdf.setLineWidth(0.2);
      pdf.circle(left + 4.5, 288, 4.5, "FD");
      pdf.addImage(fonts.creatorLogo, "PNG", left + 2, 285.2, 5, 5.6);
      pdf.link(left, 283.5, 9, 9, { url: creatorBrand.website });
    }
    text(report.learner, footerTextX, 286, 8, false, 130);
    pdf.setFont("Notebook", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...muted);
    const prefix = `© ${creatorBrand.copyrightYear} `;
    pdf.text(prefix, footerTextX, 291);
    const prefixWidth = pdf.getTextWidth(prefix);
    pdf.setFont(fonts.creatorName ? "Creator" : "Notebook", "normal");
    pdf.setFontSize(7.5);
    pdf.text(creatorBrand.name, footerTextX + prefixWidth, 291);
    const nameWidth = pdf.getTextWidth(creatorBrand.name);
    pdf.setFont("Notebook", "normal");
    pdf.setFontSize(7);
    const suffix = ". All rights reserved.";
    pdf.text(suffix, footerTextX + prefixWidth + nameWidth, 291);
    pdf.link(
      footerTextX,
      288,
      prefixWidth + nameWidth + pdf.getTextWidth(suffix),
      5,
      { url: creatorBrand.website },
    );
    pdf.setFont("Notebook", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    pdf.text(`${index} / ${pages}`, left + width, 289, { align: "right" });
  }
  signal?.throwIfAborted();
  return pdf.output("blob");
}

export async function downloadProfilePdf(
  report: LearningReport,
  signal: AbortSignal,
) {
  const bytes = await Promise.all(
    [
      "/fonts/pdf/NotoSans-Regular.ttf",
      "/fonts/pdf/Amiri-Regular.ttf",
      "/fonts/pdf/NotoSans-Bold.ttf",
      "/brand/deutsch-journey.png",
      creatorBrand.logo,
      "/fonts/pdf/Skranji-Regular.ttf",
    ].map(async (path) => {
      const response = await fetch(path, { signal });
      if (!response.ok)
        throw new Error("The PDF design could not load. Please try again.");
      return new Uint8Array(await response.arrayBuffer());
    }),
  );
  const blob = await createProfilePdf(
    report,
    {
      latin: bytes[0],
      arabic: bytes[1],
      bold: bytes[2],
      logo: bytes[3],
      creatorLogo: bytes[4],
      creatorName: bytes[5],
    },
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
