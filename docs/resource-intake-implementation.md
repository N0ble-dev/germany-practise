# Full resource intake and the wider German journey

Implemented on 14 October 2026 from the supplied `recources/` guides, extraction, and sentence export. The raw folder is preserved and ignored by Git. Its prototype scripts and SQL were inspected as reference material; they were not executed unchanged.

## Imported source material

| Source                               | Records | Preserved evidence                                                                                                                                                                    |
| ------------------------------------ | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deutsch im Blick extraction          |   3,951 | 10 chapters, 484 original pages, 2,296 vocabulary rows, 149 categories, 316 activities, 76 grammar references, 355 source links, 264 media references, and one source-document record |
| Supplied Tatoeba / ManyThings export | 331,266 | 331,254 attributable sentence pairs and 12 quarantined rows, including original text, line numbers, authors, sentence identities, and claimed license                                 |
| Existing curated ZUM revisions       |       4 | Exact source revisions, attribution, license evidence, and original selected text                                                                                                     |

Total: **335,221 source records**. These are editorial source records, not published lessons, verified CEFR coverage, or recordings. The 2017 book extraction is first-year material; it does not constitute A1–C2 coverage. Arabic translations, confirmed levels, answer keys and licensed recordings must be authored or verified per lesson.

All 36 supplied files are fingerprinted. Read-only native Node SQLite checks database integrity and foreign keys; every canonical JSONL export matches SQLite, its available CSV export, and the extraction report. CSV parsing preserves quoted multiline cells. The full sentence export is streamed and exact identities deduplicated; ambiguous or oversized rows are retained in quarantine. Files are fingerprinted again before accepting the audit. The original PDF is absent from the current folder; its extraction-reported checksum is provenance, not a fresh verification of a PDF binary.

`content/imports/recources-manifest.json` records immutable archive manifests and input hashes after all imports complete. Large raw assets stay out of Git and the app bundle. `artifacts/content/recources-audit.json` is the local audit. Normalized temporary JSONL lives under `.cache/resource-intake/`.

## Database and access

Migration `0007_content_intake` adds a dedicated `content_intake` schema: archives, immutable source items, immutable correction revisions, and append-only review decisions. Source payload changes are rejected. Saving a correction uses an advisory lock and expected revision; it cannot silently overwrite another editor. Each review is bound to an exact correction hash and verified authenticated reviewer. Editing creates a new revision with fresh review requirements.

The migration was tested with all earlier migrations on local PostgreSQL-compatible PGlite, then applied to `vercel-dev`, then production. A no-compute production recovery branch, `resources-before-2026-10-14`, was created before the production migration and expires on 21 October 2026. The full sources live **only in `vercel-dev`**. The app's production Auth/database configuration is preserved. Existing public learner, exam, collaboration and publication records are fingerprinted before and after integration.

Server-only `CONTENT_REVIEW_DATABASE_URL` and `CONTENT_REVIEW_BRANCH_HOST` are mandatory for intake. The guard checks the intended host and refuses production's pooled/direct aliases. It does not silently fall back to the app database. Existing author/reviewer email roles authorize the verified account; they do not automatically grant language or rights approval to an item.

`/admin/content/imports` opens all complete archives; `/admin/content/imports/deutsch-im-blick` starts with the book. Both use `/api/admin/content/imports`, which authorizes before reading source data, returns private/no-store responses, checks exact request origin and learning-account headers for writes, caps request bodies, and validates target lesson/level assignments. Partial archives remain unavailable to editors.

The studio offers bounded keyset pagination, German/English full-text search, chapter/list/kind/status filters, original page context, source attribution, EN/AR correction fields, noun article/plural checks, and language/pedagogy/Arabic/rights decisions. Unsaved corrections disable review/export and require explicit discard before changing items. Session changes hide private editorial data. Four real approvals are needed to export a source bundle; activity outlines still need actual exercises and answer/rubric work. **Export does not publish a lesson.** Owned audio and the existing lesson-publication pipeline remain separate gates.

## Commands and deployment

```sh
npm run content:resources:audit
npm run content:resources:stage -- --write
npm run content:test
npm run production:env
```

Stage validates every saved source hash before skipping it, imports at most three independent 1,000-row batches concurrently, retries transient connection errors, and verifies exact total/per-kind counts before completing an archive. It can resume after an interruption without rewriting existing sources or changing editorial reviews. Node 24 is required for the native SQLite audit.

Local `.env.local` received only absent review connection/expected-host settings. The production-environment preparation script now includes the server-side review connection settings and preserves the existing production cookie secret. The ignored `.env.vercel.production` file is prepared; importing those settings into Vercel Production and redeploying is still required for the hosted editorial studio. Never commit that file or expose its values through public environment variables.

## Learner-facing identity and entry points

The identity is **Deutsch Journey — German for the life you want**. Welcome text, global metadata, sidebar, learner card, and PDF notebook no longer position the whole app as A1.1. Nabil Mohamed's creator branding and personal-site link are retained. The learner card now uses the code-native SVG template with the Google photo, name and actual stats; its fallback also has the wider identity.

`/lessons` is a visible six-level German journey hub. It exposes the original A1–C2 course outlines, distinct self-guided writing/speaking ideas, private notebook saving, resource links, and exam routes that retain the selected level. Course outlines are labeled **in preparation**; practice ideas are not graded or presented as reviewed CEFR lessons. Writing saves only the learner's own text to the existing private notebook, without fabricated XP or course completion. The twelve existing chapters live at `/lessons/foundation`, with all numeric lesson URLs/progress retained. Today provides direct A1–C2 entry links. The reviewed catalog remains `/courses` and only serves effective publications.

The next content step is human correction and per-item language, Arabic, pedagogy, and rights review, then original full lesson authoring with licensed audio. Raw import counts never substitute for published coverage.

## Validation

All 165 unit tests pass. Twenty-one browser scenarios pass across the new journey/source studio and existing profile, PDF, Google-photo card, foundation exercises and study shortcuts. Checks include A1–C2 navigation with the selected exam level, private notebook saving without XP/completion changes, revision-bound review/export, stale-edit recovery, sign-out and unauthorized states, and 320/390/1440px layouts in both themes. The new learner journey and source editor have no serious/critical axe findings in the tested layouts.

The final production build, TypeScript, ESLint, Prettier and Git whitespace checks pass. Anonymous import GET/POST requests return 401 with private/no-store responses. A second complete import verified every saved hash and remained idempotent. The review database contains 335,221 source items, zero correction drafts and zero review decisions; all three archives are complete. Server-side fingerprints confirm all 25 original public tables in each branch are unchanged. Production has the additive schema and no imported source archives. Production file traces contain no raw `recources/` inputs.

Four existing content/exam plan documents were normalized with Prettier to satisfy the repository formatting check; their requirements are unchanged.
