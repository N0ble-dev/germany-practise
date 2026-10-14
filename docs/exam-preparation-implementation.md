# Goethe exam preparation implementation

Implemented from [the supplied master plan](deutsch-journey-goethe-exam-integration-master-plan.md), starting with adult A1. The resources catalog, its filters and existing material are preserved at `/exams/resources`. `/exams` is now the native Exam Arena inside the learner's workspace.

## Learner experience

- **Arena and level guides:** choose A1–C2; see the selected exam's four skills, official timings and passing rule, preparation priorities, booking/accessibility links and exam-day checklist. Signed-in learners see their saved target. A1's oral guide distinguishes introduction, information exchange, requests and the group setting. Higher levels have distinct guides and official references; native question banks for them are future work.
- **A1 studios:** original multiple-choice listening/reading, a five-field writing form, short-message editor and three speaking cards. German prompts have English/Arabic help, Arabic direction, explanations and actual lesson links. Browser speech supports the listening controls walkthrough. Speaking offers local microphone recording, playback, download, discard and a typed fallback.
- **Plan (`/exams/plan`):** save a private target, planned/booked date, daily study time, timezone and help language. Preview a balanced week across all four skills before adding sessions to the existing planner. Calendar export and Google sync use the existing explicit consent flow; the app does not book an exam or forecast a pass.
- **Private practice:** approved sets create account-owned coach attempts. Responses autosave with revision checks; a scoped browser recovery draft can be restored or exported. Server deadlines govern supported timed reading/writing sections. Submission seals responses/report; timed interruptions are recorded and explanations stay closed until submission.
- **Reports/mistake lab:** raw objective accuracy, authored explanations, evidence snippets, next-lesson and retry links, recent attempts, JSON report/draft export and confirmed deletion. Writing/speaking await a human check; content-point checks are self-review, not a language or pronunciation grade.

Choosing a target, opening a walkthrough or self-checking awards no XP and does not establish readiness. Attempts are relational records separate from notebook backups and mastery. Voice recordings stay in the browser tab unless downloaded; no new upload/transcription service was added. Adult format/scoring references were checked against Goethe sources on 14 October 2026; appointment arrangements must be confirmed with the centre.

## Content review and release

The starter contains **11 original draft tasks**: three listening, three reading, two writing and three speaking. Canonical SHA-256:

```text
39b6f2726604d8d163189c9faf65d037f05a795e2f81386673486e2e34362e64
```

Public examples are explicitly **non-scored format/control walkthroughs**, not approved papers. The private `/admin/exams` workbench stages immutable versions and exposes exact hashes, keys, human review history, real recording checks and blockers. It reuses configured `CONTENT_*_EMAILS` permissions and verified Google sessions. Reviewer identity/time comes from the server, not imported JSON.

The starter has **nine release blockers**: unresolved rights clearance, five applicable human reviews and three missing owned recordings. No approvals, learner attempts, scored publications or official scores were fabricated. Full mocks remain disabled pending a complete teacher-reviewed blueprint/question bank, controlled recordings and validated grading. The starter is not a full mock. Timed listening/speaking and a human assessment service are separate future releases.

Objective keys and listening scripts stay on the server until permitted coach/demo feedback; timed explanations wait until submission. Licensed sets display author, source, license and modification credits in attempts/reports.

```sh
npm run exams:validate
npm run exams:test
npm run exams:import -- content/exams/goethe-a1-sd1-adult/starter-01.v1.json <explicit-branch-env-file>
```

Validation checks translations, declared counts, unique choices, answer-key/evidence membership, rights metadata, audio references and exam-definition revisions, writing `artifacts/exams/draft-validation.json`. Structural success does not replace human approval. Imports require an explicit direct connection and never publish.

Obtain qualified German/pedagogy/Arabic/rights/audio reviews on `vercel-dev`. Recording manifests bind immutable WAV keys, byte/file/script hashes, duration, creator and commercial license evidence. Set `CONTENT_AUDIO_BASE_URL` to immutable HTTPS storage. Actual 16-bit PCM WAV bytes must pass existing signal/clipping checks and manifest/hash/duration checks. No voice provider, storage account or commercial license was provisioned.

The **Exam validation** GitHub workflow runs secret-free checks. **Publish reviewed exam practice** is manually dispatched from `main` with a committed file and exact reviewed hash. Before using it, configure the `exam-production` GitHub environment with required human reviewers, main-branch protection and:

- `CONTENT_REVIEW_DATABASE_URL`: restricted development exam catalog/review access.
- `CONTENT_PUBLICATION_DATABASE_URL`: production release credentials scoped to exam content/review/media/publication, not notebooks or calendar credentials.
- `CONTENT_PUBLISHER_ID`: responsible production publisher UUID.
- `CONTENT_AUDIO_BASE_URL`: immutable reviewed recordings.

`npm run exams:promote -- <file> <sha256>` refuses unapproved execution, hash mismatches, identical branch endpoints, incomplete reviews or changed development gates. It verifies recordings, imports immutable content, preserves real reviewer identities/timestamps and newer production rejections, then publishes through atomic production gates. Referenced reviewer/publisher UUIDs must exist in target managed Auth; the tool does not create identity records. GitHub secrets/environment protection were not configured by this task.

Publishing another approved version retires the former catalog version while preserving historical attempts. A later rejection removes the set from new starts. Republish an older version only if its current gates pass. Promotion copies content; it never resets/merges database branches.

## Database rollout — 14 October 2026

Migration `0004_lean_cassandra_nova.sql` adds ten exam tables, two guarded views, immutable content/audit triggers, sealed-response guards and an atomic publication function. Pending catalog migration `0003` was applied alongside it; `vercel-dev` also needed the older sharing migration `0002`.

The chain passed isolated local PostgreSQL (PGlite), then existing **vercel-dev**, then **production**, using separate explicit direct connections. Both journals now have five entries (`0000`–`0004`). Fingerprints/counts of all original notebook/calendar/profile-sharing/study-space rows were unchanged. Runtime `.env.local`, Auth endpoints and Google Calendar credentials were preserved.

The same starter hash was imported **as a private draft** on both branches; no review decisions or publications were created. Recovery branch `exam-before-2026-10-14` (`br-polished-sound-b5o89xr0`) captures pre-migration production and expires **21 October 2026, 04:00 UTC**, using the project's default idle suspension setting. Recovery remains an operator decision; there is no automatic production reset.

## Verification

- All 128 pre-release unit tests passed before the final release additions; the expanded exam suite now has 21 passing tests, including real PostgreSQL migration, publication, owner/CAS/sealing and review promotion checks.
- Eight exam/resource browser tests passed: native skills, Arabic help, calendar preview, authenticated autosave/submission/report export and preserved resource filters/tips.
- Arena, guide and reading/writing/speaking pages passed serious/critical axe checks, with no horizontal overflow at 320, 390 and 1440 pixels in both themes.
- TypeScript production build and ESLint passed; screenshots are in ignored `artifacts/exam-arena-*.png`.

Live checks validate schema/import/gates without synthetic users, learner attempts or approvals. Private browser interactions use controlled authentication fixtures; real Google OAuth/reminder delivery require the learner's consent. The web application has not been deployed to Vercel by this task.
