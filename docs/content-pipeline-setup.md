# Content pipeline implementation and setup

This implementation follows [the supplied verification plan](deutsch-journey-content-verification-pipeline.md). It adds a shared catalog alongside existing personal learning snapshots. It does not convert the current companion lessons into verified releases.

## Available now in the repository

- `npm run content:audit`: inventory the twelve existing lessons and 144 words; generate `content/a1-1-curriculum.json` and [the audit](content/a1-1-audit.md).
- `npm run content:validate`: validate lesson JSON, translated text, articles/plurals, conjugations, unique IDs, answer keys, manifest relationships and lesson prerequisites.
- `npm run content:qa-report`: write outstanding review/audio/rights checks to `artifacts/content/qa-report.json`. Drafts may pass structural validation while remaining unpublishable.
- `npm run content:audio-check`: inspect local recording files and reject missing recordings, wrong hashes, invalid WAV data, silence, excessive clipping or unsupported formats.
- `npm run content:test`: exercise the validators and real PostgreSQL schema/repository/API using an ephemeral PGlite database.
- `/admin/content`: private lesson queue, JSON import, new-version creation, revision comparison, language/translation/exercise/audio previews, named review history, recording checks and explicit publication confirmation.
- `/courses` and `/api/catalog`: read only the current approved publication pointers. The lesson page provides practice previews, not a new mastery tracker. Practice answers currently remain in the tab; existing book progress stays in its original snapshot.
- Two GitHub workflows: secret-free PR validation and a separate manually triggered production promotion workflow.

The checked-in [Lesson 1 pilot](../content/lessons/a1-1/lesson-01.v1.json) has twelve words, five dialogue lines and eight exercises. It is an original companion draft with new draft translations/explanations. It has no human approvals, no recordings and no completed rights clearance. Its eleven blockers are intentional. No real reviewer decisions were fabricated by development or tests.

## Database setup

Migration `drizzle/neon/0003_yielding_eternity.sql` adds the seven catalog/audit tables, two guarded views and immutability/review-history triggers. Its complete chain passed local PostgreSQL. During the 14 October 2026 [exam rollout](exam-preparation-implementation.md), it was applied to **vercel-dev first, then production**, alongside exam migration `0004`. Original learning/calendar/sharing rows were unchanged. Lesson pilots remain unpublished and need their own reviews, audio and release process.

Use the plan's `vercel-dev` branch first for future migrations. The earlier Neon CLI grant failure is resolved: the saved CLI session worked during the exam rollout. Keep production `.env.local` intact while preparing a separate development environment. Use matching development database and Auth endpoints; account UUID/email must come from that branch's verified Google session.

Apply the migration with that branch's direct `DATABASE_URL_UNPOOLED`, using the existing `npm run db:migrate` command. App queries use its pooled `DATABASE_URL`. Review the generated migration and test the studio before applying the same schema migration to production. Promotion copies content records; it never resets, merges or replaces the production branch. Existing snapshot, calendar and study-space tables are not migrated into the catalog.

The SQL views and triggers are versioned additions in the migration; preserve them in later migrations. The catalog views recheck current review decisions and recording checks, so a later request for changes removes the affected lesson from public reads. The production route also validates the pack/hash before returning it.

## Content permissions

The supplied account, `nabil.mohamed.dev7@gmail.com`, has been configured locally for all seven permissions. This grants tools, not proof of qualification. Approve only categories you can competently review; add qualified German and Arabic reviewers as needed.

Configure comma-separated verified Google emails in server environment variables:

```dotenv
CONTENT_AUTHOR_EMAILS=
CONTENT_LANGUAGE_EMAILS=
CONTENT_PEDAGOGY_EMAILS=
CONTENT_ARABIC_EMAILS=
CONTENT_RIGHTS_EMAILS=
CONTENT_AUDIO_EMAILS=
CONTENT_PUBLISHER_EMAILS=
CONTENT_AUDIO_BASE_URL=
```

Missing permissions deny access. Each HTTP mutation checks the verified session, role, app origin and optional stale-account header. Reviewer identity and time are taken from the server, not uploaded JSON. A review requires notes and the exact content hash. A new imported version has no inherited approvals. Imported lesson text and manifests are immutable even before publication; edits require a version increment.

The production environment preparation script includes these settings when configured. They must be added to Vercel's server environment before deploying the studio. Publication database credentials belong only in the restricted release workflow, not the app's browser environment.

## Pilot review sequence

1. Open `/admin/content` using the configured Google account and load the queue.
2. Import `content/lessons/a1-1/lesson-01.v1.json`. Inspect its goals, vocabulary, conjugations, dialogues, exercise keys and provenance.
3. Request and document language, pedagogy, Arabic and rights reviews. The source pages are planning references, not imported licensed material. Publisher material reuse requires the applicable permission; the Hueber page explains its platform licensing requirement. [Hueber permissions](https://www.hueber.de/en/ueber-uns/kopierregeln-digitaler-unterricht).
4. Resolve corrections in a new JSON version. Complete the provenance evidence and declare commercial clearance only after a human rights decision.
5. After approving the German script, commission or generate distributable recordings using a voice/TTS license that permits the intended use. The application does not select or authorize a TTS service automatically.
6. Add versioned media keys, byte counts, SHA-256 file hashes, script hashes, license references and attribution. Adding recordings changes the full lesson hash; final approvals must be recorded again for that complete version. This conservative MVP invalidates all approvals on any content/manifest change.
7. Verify recording files in the studio, listen to every line, and record the audio review. All five human reviews, rights clearance, published prerequisites and required recordings must pass together.
8. Publish in development and test the full preview. Commit the identical versioned JSON to Git, then use the separate approved production promotion process.

## Audio storage and format

Use an immutable public object-storage prefix on R2, Vercel Blob or an equivalent HTTPS host. Set `CONTENT_AUDIO_BASE_URL` to its base URL. Storage provisioning/upload is an external setup step; no storage account or commercial voice license has been created by this implementation.

The initial verifier supports **16-bit PCM WAV**, mono/stereo, 8–96 kHz, 0.15–90 seconds per line and at most 12 MB per file. MP3/OGG need a real decoding/inspection implementation before enabling those formats. WAV duration, signal level and clipping are calculated from actual bytes. These checks do not establish speech naturalness, translation quality or phonetic alignment; those remain human listening tasks.

Example media record:

```json
{
  "id": "audio-line-1",
  "lineId": "line-1",
  "storageKey": "de/a1-1/a1-1-l01/v2/line-1.wav",
  "fileHash": "SHA256_OF_ACTUAL_WAV_BYTES",
  "scriptHash": "SHA256_OF_CANONICAL_JSON_GERMAN_STRING",
  "bytes": 123456,
  "mime": "audio/wav",
  "licenseRef": "path-or-reference-to-commercial-redistribution-permission",
  "attribution": "required-voice-credit"
}
```

The placeholder hashes above are documentation and fail validation. Use `contentHash(line.text.de)` for the script and `fileHash(bytes)` for the file, from `src/lib/content-pipeline/hash.ts`. Put local files under `content/audio/<storageKey>` or set `CONTENT_LOCAL_AUDIO_ROOT`; never change bytes at an existing published key.

Server file checks fetch only the configured HTTPS base plus validated keys, reject redirects and oversized files, and compare the real bytes to the manifest. Public audio is delivered through the catalog route, which requires an active published lesson and rechecks the file hash. Browser speech synthesis remains available in the old companion flow but cannot satisfy a recorded-audio publication gate.

## Production promotion and rollback

Create a GitHub environment named `content-production` with required human reviewers and main-branch deployment protection before adding release credentials. Configure:

- `CONTENT_REVIEW_DATABASE_URL`: read access to the reviewed development catalog.
- `CONTENT_PUBLICATION_DATABASE_URL`: a production service credential scoped to catalog tables, without access to personal notebooks/calendar credentials.
- `CONTENT_PUBLISHER_ID`: the UUID associated with the responsible publisher/service audit identity.
- Environment variable `CONTENT_AUDIO_BASE_URL`: the same immutable audio storage containing reviewed files.

Run **Publish reviewed content** manually from `main`, supplying the committed lesson file and the exact reviewed SHA-256. The job validates/tests first; it reads real review evidence from the configured development database, verifies matching hashes and every recording, imports the same immutable draft in production, carries the actual reviewer identities/timestamps, and advances one publication pointer. It refuses identical development/production endpoints and conflicting existing version hashes.

The production copy must pass its own gates too. A newer production rejection is preserved and blocks promotion; old development approvals do not erase review history. Audio/content import retries are safe. The final pointer and publication audit event update in one database statement.

For rollback, select a previously reviewed version in the studio and explicitly publish it again, or run the manual workflow for that exact older file/hash. The old version must still pass its current reviews/audio/prerequisite checks. Other lessons and learners' progress are not rewritten. The small MVP retains earlier versions and the publication audit trail; larger release batches and automated audio generation are later additions.

## Remaining external steps

The [first trusted-source batch](content/source-import-report.md) adds four attributed ZUM text assets, the source-backed Lesson 1 version 2 draft, and `/exams` for official resources and study tips. `content:validate` checks source provenance and attribution hashes alongside lesson structure. The public lesson template displays contributor, license and modification credits when reviewed adaptations are published.

The database schema is now applied to both live branches. Configure audio storage and a redistributable recording source; obtain human review decisions; configure GitHub environment protection/secrets; then approve the reviewed release. Until then, the lesson pilot remains a private draft and production lesson content is not promoted. The resources library is now at `/exams/resources`; `/exams` hosts the native Exam Arena.
