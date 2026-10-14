# A1–C2 content factory: first implementation

Implemented against `deutsch-journey-a1-c2-content-factory-master-plan.md`, 14 October 2026. This is the curriculum and staging foundation, not a completed A1–C2 course.

## Existing architecture reused

Immutable lesson versions, source evidence, five hash-bound human review categories, recording inspection, effective-publication views and the data-driven lesson renderer already existed. The Exam Arena and private learner snapshots remain separate. No parallel replacement tables or schema migration are needed for this sprint.

## Delivered

- Nine courses, 33 modules, 132 illustrative lesson briefs and 24 original level/skill outcome targets, all labeled planning drafts requiring specialist mapping review.
- All twelve existing A1.1 lesson IDs and prerequisites retained. A1.2–C2 are original Deutsch Journey briefs; advanced authoring explicitly requires discourse, register, inference, synthesis and specialist assessment.
- `/admin/content/coverage`: actual level/skill publication counts, missing/draft/review/revision states, searchable lesson briefs, recording/component blockers and ten source policies.
- Protected editorial previews reuse the existing lesson renderer. No learner progress or human approval is created; missing recordings stay unavailable.
- Original bilingual work/study Lesson 2 and family/friends Lesson 3 drafts, alongside the existing Lesson 1 v2 ZUM-backed pilot. All German/EN/AR text, answer keys and rights remain subject to human review.
- Git release manifest pins one exact immutable revision and SHA-256 per lesson. Explicit dev-only staging preflights every identity and imports idempotently.
- Curated Wikidata adapter accepts up to twenty explicit German lexeme IDs, retains canonical external identities, senses, supplied glosses, form features and source revisions/hashes. Uncertain morphology and missing translations stay unresolved.
- Local Tatoeba/ManyThings importer sampled 100 attributable pairs from the supplied 331,266-row export. Exact sentence IDs, both authors, original rows and the full export SHA-256 are preserved. Candidates are separate Git intake, with no Arabic, CEFR, audio or rights approval. The dashboard shows a read-only sample; they are not lesson or publication counts.
- Content CI now supports the repository's actual `master` branch, alongside `main`, with factory inventory and source-audit reports.

The outcome text is original design guidance informed by the [CEFR reference](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors), not quoted official descriptors or certified mappings. The lesson counts are capacity targets, not evidence of CEFR readiness. Internal subdivisions are not certifications; B2–C2 are not Menschen content.

## Coverage rules

`missing`: no pack. `draft`: Git pack not matched by staging. `needs_review`: staged but pending reviews, recordings or required components. `needs_revision`: latest rejection or same-version hash disagreement. `ready`: existing publication gates and planned activity coverage both passed. `published`: only Neon's effective publication view. An older published version remains visible while a newer draft is pending.

Evidence uses one bounded query for latest versions plus effective publications and the latest hash-bound decision per category. No private learner data is read. Database failures display **unavailable**, not a false zero. APIs authorize verified content roles before reading files/Neon, use private/no-store responses, and reject stale account headers. Account changes hide loaded editorial data.

The v1 renderer has no independent rubric-based writing task. Dictation, sentence builders and a scripted mission do not fill that gap. Current pilots therefore remain incomplete four-skill lessons even if their existing review gates later pass. All are blocked by missing recordings and human approvals; browser speech is not substituted.

## Commands

```sh
npm run content:validate -- --release a1-1-factory-pilot
npm run content:factory -- --release a1-1-factory-pilot
npm run content:brief -- c2-l01
npm run content:license-audit -- --release a1-1-factory-pilot
npm run content:license-audit -- --release a1-1-factory-pilot --strict
npm run content:qa-report -- --release a1-1-factory-pilot
npm run content:test
npm run content:stage -- --release a1-1-factory-pilot
npm run content:verify-production -- --release a1-1-factory-pilot
npm run content:import-wikidata -- L7341
npm run content:import-tatoeba -- --input recources/deu.txt --limit 100 --max-words 12
```

Offline inventory/QA reports in ignored `artifacts/content/` have unknown database approvals/publications. The source audit lists unresolved rights; `--strict` fails when incomplete. A structural pass never grants approval.

Stage/production verification require separate `CONTENT_REVIEW_DATABASE_URL` and `CONTENT_PUBLICATION_DATABASE_URL`. Stage additionally checks `CONTENT_REVIEW_BRANCH_HOST` against the intended dev endpoint: `ep-delicate-mouse-b5r4uqqx.c-7.us-east-2.aws.neon.tech` for this project. Credentials remain local/CI secrets. These tools never fall back to the app's production `DATABASE_URL`.

The release is a staging candidate. Imports are atomic per pack, not one batch transaction: identities are preflighted before writes and a partial connection failure can be safely retried. No user data or reviewer identity is copied. Existing manual, hash-bound `content:promote` remains the production path per lesson; full transactional release approval/rollback is a later ticket. `content:verify-production` is read-only and fails when exact effective releases are absent.

Wikidata staging uses only official structured entity JSON, validates German language and form/sense identities, limits response size, records actual retrieval time and never overwrites an existing revision. Gender and number/case interpretation stay unresolved rather than guessed. [Wikidata's policy](https://www.wikidata.org/wiki/Wikidata:Licensing) distinguishes structured CC0 entities from documentation prose. No external recordings are imported. Protected publisher/reference sites remain outbound-only; reusable assets need exact per-item evidence.

The local sentence adapter accepts only rows with explicit CC-BY 2.0 France and both author/ID pairs; ambiguous rows are skipped. It deduplicates exact pair identities and caps each batch at 500. Shortness is a selection filter, not a CEFR classifier. The original supplied `recources` archive/scripts/PDF and full text export are not modified or committed by this implementation. Their document instructions are treated as reference material, not executed. The [Tatoeba reuse guide](https://en.wiki.tatoeba.org/articles/show/using-the-tatoeba-corpus) requires attribution and recommends proofreading; recordings have independent licenses. Rights and contextual suitability remain pending per candidate.

Live staging imported only the three pilot lesson revisions into `vercel-dev`; both branches still have zero lesson publications/reviews and seven existing migrations. Server-side fingerprints of 21 protected tables stayed unchanged, including learner state and exam attempts. Production curriculum was unchanged. The Wikidata sample fetch was attempted but terminal DNS/connectivity to `www.wikidata.org` failed, so no Wikidata entity is claimed as downloaded.

## Next work

1. Specialists verify curriculum depth/sequence and expand the summary targets into descriptor-specific outcomes. German/pedagogy and bilingual editors review the three pilot texts/answers.
2. Add a new lesson schema version for independent writing, reading sets, matching/cloze and open speaking rubrics. Preserve v1 hashes/attempts; add canonical lexeme/sense and grammar links through additive migrations after the lexical pilot is reviewed.
3. Approve scripts, provision licensed audio and immutable storage, produce recordings, inspect actual files and obtain real German listener decisions. No provider/voice license is assumed.
4. Add a transactional release ledger, exact release-hash approval, multi-lesson promotion and rollback, preserving newer production rejections and old learner attempts.
5. Complete the four-skill pilot and publish after human approval, then author remaining A1.1/A1.2 lessons through the same engine. Advanced levels need specialist texts and calibrated assessment.

The original notebook/SRS, shared spaces, public sentences, sessions/calendar, `/exams/resources` and Goethe preparation remain intact. The learner catalog still exposes only effective reviewed publications.

## Validation

All 156 unit tests and three browser tests pass, alongside production build/TypeScript and ESLint. Browser checks cover level/status/search filters, no-progress bilingual draft previews, absent recording requests, guest/unauthorized states, unavailable database status, and 320/390/1440px layouts in both themes. The editorial page has zero serious/critical axe findings in those checks. Production file traces contain the lesson drafts and source-intake batch; supplied raw resource files are not packaged. Anonymous coverage/draft API requests return 401 with private/no-store and no content payload. The strict rights audit intentionally fails for the unapproved pilot release.
