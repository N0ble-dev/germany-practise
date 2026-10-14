import { z } from "zod";

export const libraryKinds = [
  "vocabulary",
  "sentence_pair",
  "chapter",
  "source_page",
  "vocabulary_category",
  "activity",
  "grammar_reference",
  "source_link",
  "media_reference",
  "wiki_page",
  "source_document",
] as const;
export const libraryKindLabels: Record<(typeof libraryKinds)[number], string> =
  {
    vocabulary: "Words & expressions",
    sentence_pair: "German–English sentences",
    chapter: "Book chapters",
    source_page: "Book pages",
    vocabulary_category: "Vocabulary topics",
    activity: "Book activities",
    grammar_reference: "Grammar",
    source_link: "Resource links",
    media_reference: "Audio & video references",
    wiki_page: "ZUM readings",
    source_document: "Book credits",
  };
const sourceUrl = z.url().refine((value) => {
  const url = new URL(value);
  return (
    ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
  );
});
export const libraryCreditSchema = z
  .object({
    label: z.string().max(200),
    url: sourceUrl,
    license: z.string().max(200),
    licenseUrl: sourceUrl,
    attribution: z.string().max(2000),
  })
  .strict();
export const libraryBookmarkSchema = z
  .object({
    id: z.number().int().positive(),
    german: z.string().max(1000),
    english: z.string().max(1000),
    source: libraryCreditSchema,
  })
  .strict();
export type LibraryBookmark = z.infer<typeof libraryBookmarkSchema>;
export type LibraryCredit = z.infer<typeof libraryCreditSchema>;
export type LibraryItem = {
  id: number;
  kind: (typeof libraryKinds)[number];
  key: string;
  collection: string;
  german: string;
  english: string;
  topic: string | null;
  chapter: number | null;
  page: number | null;
  listType: string | null;
  article: string | null;
  headword: string | null;
  plural: string | null;
  text: string | null;
  url: string | null;
  source: LibraryCredit;
};
export type LibraryCollection = {
  id: string;
  provider: string;
  title: string;
  counts: Record<string, number>;
  total: number;
  source: LibraryCredit;
};
export type LibraryOverview = {
  collections: LibraryCollection[];
  words: number;
  sentences: number;
  chapters: LibraryItem[];
  available: boolean;
};
export const libraryQuerySchema = z
  .object({
    collection: z
      .enum(["deutsch_im_blick", "tatoeba", "zum"])
      .default("deutsch_im_blick"),
    kind: z.enum(libraryKinds).default("vocabulary"),
    chapter: z.coerce.number().int().min(1).max(10).optional(),
    q: z.string().trim().max(120).default(""),
    cursor: z.coerce.number().int().positive().optional(),
    length: z.enum(["all", "short", "medium", "long"]).default("all"),
    list: z.enum(["core", "expanded"]).optional(),
  })
  .strict();
export type LibraryQuery = z.infer<typeof libraryQuerySchema>;
export type LibraryPage = { items: LibraryItem[]; nextCursor: number | null };
export function safeLibraryUrl(value: unknown): string | null {
  const parsed = sourceUrl.safeParse(value);
  return parsed.success ? parsed.data : null;
}
export function recallText(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .replace(/[.!?]+$/u, "")
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("de");
}
