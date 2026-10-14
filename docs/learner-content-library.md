# Supplied content on the learner site

On 14 October 2026 the supplied archives became a public **source-content library** at `/library`, rather than remaining solely in the editorial studio. The user explicitly requested all supplied content to be available now. Source texts are usable immediately without fabricating human reviews, CEFR classifications, translations, recordings or exam certificates.

## Available material

The production library exposes **335,209 source records**: 2,296 vocabulary entries; 331,254 German–English sentence pairs; ten book chapters; 484 original extracted pages; 149 vocabulary categories; 316 book activities; 76 grammar references; 355 external source links; 264 QR/media references; four ZUM selections; and one source-document credit record. Twelve malformed sentence rows remain in quarantine and cannot be requested through the public API.

All canonical SQLite/JSONL/CSV data and its provenance remain intact. SQL files are schema inputs, not additional learning content. Media references point to original resources; the supplied archive does not contain those audio files. Device speech is explicitly labeled as a device voice. Arabic and CEFR are absent from the source material and are not invented.

Tatoeba requires author attribution for sentence reuse and treats audio rights separately; see its [official corpus guide](https://en.wiki.tatoeba.org/articles/show/using-the-tatoeba-corpus). Both sentence authors and IDs are preserved. The book is identified as the [COERLL / UT Austin Deutsch im Blick source](https://coerll.utexas.edu/dib/), second edition (2017), with original page context and its supplied license claim. ZUM entries retain exact revision URLs, original author attribution and adaptation notices. No source is presented as an original Deutsch Journey authored sentence or a reviewed CEFR lesson.

## Learner experience

- Public browsing without an account: full-text German/English search, chapters, content types and sentence-length filters. Length is never labeled as a CEFR level.
- Ten native chapter entry cards lead to their words and activities. Book-page dialogs preserve the full supplied transcription. All resource and QR references are browseable; missing recording URLs are described accurately.
- Vocabulary entries can be kept in the existing personal collection and used by its spaced-review scheduler. Source credits are preserved across saving, edits, cloud snapshots, backups and PDFs. Library words are labeled as library content rather than foundation-course lessons.
- Sentence bookmarks preserve the German, English and attribution in the learner's private profile and exports. These stay separate from the learner's authored sentences and public signature gallery.
- Practice cards use the loaded source words/sentences. Reveal the supplied meaning, hear a device voice, type the German from memory and compare with the exact source. Umlauts remain significant. Source-text recall does not award course mastery or pretend to grade grammar/pronunciation.
- Today, sidebar and the six-level journey link directly to the library. The old “in preparation” theme badges become actionable writing/speaking prompts; they are not misrepresented as assessed lessons. Existing foundation exercises and exam preparation remain accessible.

## Database and API

The existing `content_intake` schema is reused; **no new migration** or identity system is added. Audited immutable source archives are copied to the existing production database. Human correction/review tables and user tables are not copied or changed. Complete archive IDs plus exact manifest hashes are pinned in `content/library-release.json`.

`GET /api/library` reads the app's existing production `DATABASE_URL`; no extra Vercel review credentials are needed for the learner library. It allows only pinned complete archives and explicit public source kinds, returns 24 records plus a pagination cursor, parameterizes search/filter inputs, and rejects quarantine, unlisted archives and invalid IDs. It does not query learner states or editorial reviews. Large page bodies are fetched only in item details, with bounded list previews. Public source responses can be cached; errors are not cached. Private saves use the existing account-isolated learning state and cloud backup flow.

The deployment bundle includes the small release manifest, not the raw resource folder, SQLite database or full export. The import uses three bounded independent batches, checked saved hashes, transient retry and exact total/per-kind completion checks. Partial imports are hidden and can resume safely after an interrupted session.

```sh
npm run content:library:publish -- --target review --write
npm run content:library:publish -- --target production --write --expected-host ep-jolly-poetry-b5xd0omu.c-7.us-east-2.aws.neon.tech
```

Production requires the explicit existing endpoint and the app's matching database. The review command uses the separate guarded review branch and writes its release manifest only to the ignored cache. The production command writes the pinned Git release after all archives and public counts pass. Existing authentication/database settings are preserved.

## Completed rollout checks

Both review and production have all three complete archives. Production contains 335,221 immutable source rows; the public projection exposes 335,209 and excludes twelve quarantined rows. The pinned review/production manifests match. All 25 original public tables in each branch retain their pre-import fingerprints, and the existing eight migrations remain unchanged.

All 170 unit tests and fourteen browser checks passed, together with the production build, TypeScript, lint and formatting checks. The source library and detail dialogs have no serious/critical axe findings at 320, 390 and 1440px in light/dark themes. Browser tests cover chapter navigation, search, pagination, vocabulary saving, source-text recall, attributed private bookmarks, profile PDFs, logout/session isolation and Google-photo cards. The real production database was also checked through the app API: exact counts, long-sentence search, full book-page details, preserved credits, 24-item pagination and quarantine rejection. Raw resource files are absent from the production trace; the small pinned release data is compiled into the application.
