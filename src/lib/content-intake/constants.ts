export const intakeKinds = [
  "source_document",
  "chapter",
  "source_page",
  "vocabulary",
  "vocabulary_category",
  "activity",
  "grammar_reference",
  "source_link",
  "media_reference",
  "extraction_warning",
  "sentence_pair",
  "wiki_page",
  "quarantine",
] as const;
export const intakeReviewCategories = [
  "language",
  "pedagogy",
  "arabic",
  "rights",
] as const;
export type IntakeKind = (typeof intakeKinds)[number];
export type IntakeReviewCategory = (typeof intakeReviewCategories)[number];
