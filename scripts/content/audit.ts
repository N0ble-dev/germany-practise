import ts from "typescript";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileHash } from "../../src/lib/content-pipeline/hash.ts";

const raw = await readFile("src/lib/journey-content.ts", "utf8");
const source = ts.createSourceFile(
  "journey-content.ts",
  raw,
  ts.ScriptTarget.Latest,
  true,
);
let lessons: ts.ArrayLiteralExpression | undefined;
function walk(node: ts.Node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(source) === "bookLessons" &&
    node.initializer &&
    ts.isArrayLiteralExpression(node.initializer)
  )
    lessons = node.initializer;
  ts.forEachChild(node, walk);
}
walk(source);
if (!lessons || lessons.elements.length !== 12)
  throw new Error(
    "Expected the twelve existing A1.1 lesson objects; review the audit extractor after changing their source layout.",
  );
function field(node: ts.Node, key: string): ts.Expression {
  if (!ts.isObjectLiteralExpression(node))
    throw new Error("Expected a lesson object.");
  const item = node.properties.find(
    (p) => ts.isPropertyAssignment(p) && p.name.getText(source) === key,
  );
  if (!item || !ts.isPropertyAssignment(item))
    throw new Error(`Missing lesson field ${key}`);
  return item.initializer;
}
function string(node: ts.Node) {
  if (ts.isStringLiteralLike(node)) return node.text;
  throw new Error("Expected original literal text.");
}
function array(node: ts.Node) {
  if (ts.isArrayLiteralExpression(node)) return node.elements;
  throw new Error("Expected an original array.");
}
function calledArray(node: ts.Node, argument = 0) {
  if (!ts.isCallExpression(node))
    throw new Error("Expected original helper call.");
  return array(node.arguments[argument]);
}
const grammarFocus = [
  "Present tense: heißen, kommen, wohnen; ich/du/Sie; statements and questions",
  "Present tense; professions; personal questions",
  "Possessives; family; mein/meine",
  "Articles and nouns; describing objects",
  "Identifying objects; indefinite articles and questions",
  "Accusative objects; office equipment",
  "Modal können; activities and ability",
  "Time and weekday expressions; appointments",
  "möchten; food and drink; ordering politely",
  "Separable verbs; transport and travel",
  "Perfekt with haben; personal events",
  "Perfekt with sein; travel and events",
];
const inventory = lessons.elements.map((node) => {
  const number = Number(field(node, "number").getText(source)),
    id = `a1-1-l${String(number).padStart(2, "0")}`;
  const words = calledArray(field(node, "words"), 1).map((row) =>
    array(row).map(string),
  );
  const dialogues = calledArray(field(node, "dialogue"));
  const grammar = array(field(node, "grammar")),
    listening = array(field(node, "listening"));
  return {
    id,
    number,
    title: string(field(node, "title")),
    canDo: array(field(node, "outcomes")).map(string),
    scene: string(field(node, "place")),
    estimatedMinutes: 35,
    prerequisites:
      number === 1 ? [] : [`a1-1-l${String(number - 1).padStart(2, "0")}`],
    introducedGrammar: [grammarFocus[number - 1]],
    pronunciationFocus: string(field(field(node, "sound"), "title")),
    listeningOutcomes: listening.map((question) => {
      if (!ts.isCallExpression(question))
        throw new Error("Expected an original listening question.");
      return string(question.arguments[0]);
    }),
    speakingOutcome: string(field(node, "goal")),
    cefrDescriptorRefs: [
      "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors",
    ],
    vocabularyTargets: words.map((row) => ({
      de: row[0],
      plural: row[4] ?? null,
    })),
    assessmentRules: {
      vocabulary: 80,
      listening: 70,
      grammar: 70,
      speaking: 70,
      missionRequired: true,
    },
    counts: {
      words: words.length,
      dialogueLines: dialogues.length,
      grammarQuestions: grammar.length,
      listeningQuestions: listening.length,
      patterns: array(field(node, "patterns")).length,
    },
    findings: [
      "Existing companion text has no recorded human language/pedagogy/rights approval.",
      "Arabic vocabulary exists; dialogue, exercise and grammar translations need separate review/production.",
      "Browser device speech is not a licensed, reviewed audio asset; recorded audio coverage is zero.",
      "Original helper infers verb types from spelling; verify parts of speech, noun plurals and conjugation forms.",
      "Mission regular expressions and self-check speaking are practice feedback, not CEFR certification.",
    ],
    source: "src/lib/journey-content.ts",
  };
});
await mkdir("content", { recursive: true });
await writeFile(
  "content/a1-1-curriculum.json",
  JSON.stringify(
    {
      schemaVersion: 1,
      courseId: "a1-1",
      cefr: "A1",
      courseSubdivision: "A1.1",
      status: "planning_draft",
      sourceHash: fileHash(Buffer.from(raw)),
      references: [
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors",
        "https://www.goethe.de/de/m/spr/prf/ueb/pa1.html",
      ],
      lessons: inventory,
    },
    null,
    2,
  ) + "\n",
);
await mkdir("docs/content", { recursive: true });
const report = [
  "# Existing A1.1 content audit",
  "",
  "This is an inventory and review queue, not a language or licensing approval. Generated from the twelve original lesson objects; source hash is recorded in `content/a1-1-curriculum.json`.",
  "",
  "| Lesson | Title | Words | Dialogue lines | Grammar / listening tasks | Recorded audio | Reviews |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...inventory.map(
    (l) =>
      `| ${l.number} | ${l.title.replaceAll("|", "/")} | ${l.counts.words} | ${l.counts.dialogueLines} | ${l.counts.grammarQuestions} / ${l.counts.listeningQuestions} | 0 | Pending |`,
  ),
  "",
  "## Findings applying to all twelve lessons",
  "",
  ...inventory[0].findings.map((f) => `- ${f}`),
  "",
  "The existing app remains an original companion experience. It is not relabeled as verified. The new published catalog is separate and exposes only reviewed releases. Lesson 1 is the first editable pilot pack; other rows are curriculum planning records, not publishable packs.",
  "",
  "## Next review work",
  "",
  "Check each lesson's grammar plan against its actual vocabulary and learner prerequisites. Confirm its English and Arabic translations. Record provenance, produce commercially cleared audio after script approval, and review every version in the content studio.",
];
await writeFile("docs/content/a1-1-audit.md", report.join("\n") + "\n");
console.log(
  `Audited ${inventory.length} lessons and ${inventory.reduce((n, l) => n + l.counts.words, 0)} words. All human gates remain pending.`,
);
