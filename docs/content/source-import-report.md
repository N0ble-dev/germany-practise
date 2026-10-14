# First trusted-source content batch

Prepared 14 October 2026 using the supplied [exam guide](../deutsch-journey-exam-resources-and-tips.md) and [trusted-source survey](../deutsch-journey-trusted-german-content-sources.md).

## Imported teaching candidates

Four exact ZUM Deutsch Lernen revisions were fetched through its public MediaWiki API. Only selected wiki text is staged. External H5P exercises, worksheets, videos, recordings and images were not imported.

| Asset            | Revision | Selected items                          | Contributors                      | Suggested lessons |
| ---------------- | -------- | --------------------------------------- | --------------------------------- | ----------------- |
| Sich vorstellen  | 78352    | 6 introductory question/answer patterns | Karl Kirst                        | 1–2               |
| Personalpronomen | 86838    | 8 distinct nominative forms             | Karl Kirst, Susanne               | 1–2               |
| Possessivartikel | 79259    | 9 nominative possessive examples/forms  | Karl Kirst                        | 3                 |
| Sätze            | 87581    | 8 short example statements              | Ralf Klötzke, Karl Kirst, Susanne | 1, 8–9            |

Each asset records the exact revision and history URLs, contributors, source timestamp, source-text SHA-256, selected source excerpt, normalized fragments, license/evidence URLs, modification notice and next-review date. All are `draft` with an **unreviewed** A1 estimate. The site documents CC BY 4.0 for its wiki text with individual media exceptions. [ZUM policy](https://deutsch-lernen.zum.de/wiki/%C3%9Cber_ZUM_Deutsch_Lernen). Attribution, license linking and modification notices accompany adapted material. [CC BY 4.0 terms](https://creativecommons.org/licenses/by/4.0/).

Files are in `content/source-assets/`; `content/source-assets.json` is the compiled evidence registry. The server importer rejects unregistered, changed or mismatched source evidence. CI checks registry/file consistency and each lesson reference. Contributors and reuse notices are displayed in both the private review studio and the published lesson template.

`lesson-01.v2.json` preserves the original twelve vocabulary entries and eight exercises, adds three source-backed grammar sections and a sixth dialogue line. New teaching explanations and English/Arabic translations remain drafts. Version 1 is unchanged. Version 2 has twelve publication blockers: five human reviews, commercial-rights clearance, and six recordings. The adapted material retains its declared license; branding does not replace source attribution or grant different rights over those fragments.

## Learner resources

`content/resources/catalog.json` contains 26 records covering official Goethe models A1–C2, online A1 listening/speaking, exam rules, Goethe/vhs/DW/telc learning links, ZUM, Austrian OER and potential language-data sources. `content/resources/a1-exam-guide.json` adds original preparation suggestions adapted from the supplied guide, the adult A1 format facts, and a four-week plan after completing A1.

The new `/exams` page exposes official provider links, level selection/search, the A1 section guide, tips and planning links. It has no copied Goethe question bank and does not imply Goethe affiliation. A1.1 learners receive a clear route back to their foundation lessons. Official timings and the adult A1 passing rule were checked against [Goethe's format page](https://www.goethe.de/ins/eg/de/sta/alx/prf/gzsd1/inf.html) and [scoring rules](https://www.goethe.de/de/spr/prf/pes.html).

The direct HTTP checker received 14 successful responses and 12 access restrictions. Restrictions include Goethe, Council of Europe and ondaz; they are recorded as `restricted`, not asserted to be broken or bypassed. Official Goethe A1–C2 pages were also inspected through the web reader. The catalog preserves its current transport-check result and dated follow-up requirement.

Publisher resources and default noncommercial content remain links. Dataset rows describe future item-level curation, not a complete CEFR course. No Tatoeba, Wiktionary, commercial textbook or third-party audio dataset was bulk-imported in this batch.

## Repeatable checks

```sh
npm run content:fetch-zum -- 2026-10-14
npm run content:check-links -- 2026-10-14
npm run content:validate
npm run content:test
npm run content:qa-report
```

Pass the current client date when rechecking sources. ZUM imports are idempotent for the selected revision/normalization and retain earlier asset records. Any change to normalization or contributor/license evidence should use a new auditable asset revision, update affected lesson references, increment the lesson version, and repeat the human gates.

The new assets and lesson remain staged in Git. No live database migration, draft import, review decision or production publication was performed. Human review, distributable audio and the already pending Neon development-branch setup still precede publication.
