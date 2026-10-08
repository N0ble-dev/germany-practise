# Deutsch Journey

A personal German A1.1 learning companion, rebuilt from the original browser app using strict TypeScript. Read the original product brief in [deutsch-journey-next-neon-features.md](./deutsch-journey-next-neon-features.md).

## Run locally

Use Node.js 22.13+ or Node.js 24+ (Node 24 LTS recommended).

```sh
npm ci
npm run dev
```

Open **http://localhost:3008** (the port configured by `npm run dev`). The app works without a database, account, or API key. The old `app.js`, `index.html`, and `style.css` have been replaced; opening an HTML file directly is no longer the entry point.

For a production server:

```sh
npm run build
npm run start
```

## Stack

- Next.js 16 App Router and React 19
- Strict TypeScript throughout application code, database schema, and tests
- Tailwind CSS 4 with a custom responsive design system
- Locally owned shadcn-style Button and Dialog components, Radix primitives, Lucide icons
- Zod validation for vocabulary, imports, and server requests
- Neon PostgreSQL and Drizzle ORM with versioned SQL migrations
- Better Auth for optional email/password accounts
- ESLint with TypeScript and React Hooks checks, Vitest, Playwright, and axe
- Locally hosted Plus Jakarta Sans and Nunito Sans fonts; no runtime font CDN

Dependency versions are pinned in `package.json` and `package-lock.json` for reproducible installs.

## Learning experience

- **Today:** real activity, daily XP, a gentle daily plan, a word spotlight, and a current lesson.
- **My study calendar (`/planner`):** custom sessions, chapters, weekday/daily repeats, time zones, reminders, and check-offs. Connect a dedicated Google study calendar and sync explicitly, or export a calendar file for Google, Apple, or Outlook. Follow [the Google OAuth setup guide](./docs/study-calendar.md). Plans are included in learning backups; calendar credentials stay encrypted on the server.
- **My Germany dream (`/inspiration`):** real photos of Berlin, Hamburg, Heidelberg, and Eibsee, a saved dream-place choice, and your personal reason for learning. Your chosen photo appears on Today with a daily German encouragement, English/Arabic support, audio, and a link into your book journey. Each destination connects to a useful phrase and speaking or life-mission practice. Study-day counts and “practiced today” feedback come from actual timestamped learning activity; choosing a photo or saving a reason earns no XP.
- **Book journey (`/lessons`):** four modules and twelve original A1.1 companion lessons, built from [the Menschen learning strategy](./menschen-a1-1-german-learning-strategy.md). Each lesson follows Story → Words → Sound → Patterns → Grammar → Listen → Build → Speak → Conversation → Germany situation → Recall → Life test. Lessons 2 and 3 cover jobs and family respectively.
- **Mastery:** chapter completion requires at least 80% in ten-word productive recall, 70% in listening, speaking practice, and grammar, plus a passed life mission. Best scores and practiced steps persist; revisiting a lesson does not grant another completion reward. Speaking evidence is labeled as a self-check or browser-recognized text comparison. Neither is an acoustic pronunciation grade.
- **Module challenges:** mixed grammar recall and an open response life task after each group of three lessons; the final challenge is “One day in Germany” across all twelve lessons. Communication checks use authored phrase patterns, show missing tasks, and do not certify grammar, fluency, or a CEFR level.
- **Daily book rhythm:** warm-up, a small textbook section, active practice, and a mission in 30–35 minutes. Weekly reminders and a Germany memory map connect words to places. Personal country, city, profession, and language details customize useful patterns; unsaved details use illustrative examples.
- **Vocabulary evidence:** a long review interval alone cannot mark a word mastered. Recognition, article recall for nouns, productive recall, sentence use, hearing, speaking, situation use, and recall at least three days later are needed alongside a mature review interval. Words enter your collection when you add a lesson’s twelve core items.
- **Vocabulary:** German, English, Arabic, article, plural, example, topic, lesson, memory hint, favorites, edits, and confirmed deletion. Suggestions come from the curated starter vocabulary.
- **Flashcards:** up to 10 due words per session; Again, Hard, Good, and Easy ratings. Forgotten words return in the session and are due again in one minute. Successful recalls schedule future days, with expanding intervals. The scheduler is a simple ease-based spaced repetition algorithm, not FSRS.
- **Listening:** German device audio at normal or slow speed, dictation, hints, and feedback. German umlauts remain significant when answers are checked.
- **Speaking:** browser speech recognition, recognized text, ordered text comparison, clear permission errors, and a manual out-loud practice option. Lesson voice recorders capture actual microphone audio, offer playback and download, and stop at the exercise limit. Recordings remain in the tab until downloaded and are not uploaded. Text match is not a pronunciation quality score.
- **Conversations:** guided choices, supported replies, and free responses with authored local feedback. These work without an AI API; there is no live AI conversation service in this version.
- **Shadowing:** listen, read, repeat, speak along, then say the sentence from memory.
- **Sentence lab:** reusable A1 patterns, device audio, and saved sentences.
- **Games:** sentence building, articles, and word/meaning matching.
- **Germany mode:** bakery, station, café, supermarket, and introductions, with useful phrases and explanations.
- **Progress:** actual XP, consecutive study days, two-week activity chart, milestones, difficult words, and recent practice.
- **Preferences:** name, 10/20/30-minute intentions with XP targets, English/Arabic support, theme, and backup import/export.

Daily counters are derived from timestamped activity using the learner’s local calendar day. Streaks count days with recorded learning activity. The minute goal estimates a practice duration; elapsed study time is not measured. No progress is fabricated for a new learner. Spaced reviews, lesson completion, and all local learning work without cloud configuration. Local storage does not make the site an installable/offline PWA.

## Neon managed accounts and backups

1. Enable **Neon Auth (managed Better Auth)** on your Neon branch. Copy its Auth URL and the pooled and direct PostgreSQL connection strings from that same branch.
2. Copy `.env.example` to `.env.local` and fill in:

   ```dotenv
   DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
   DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@DIRECT_HOST/DATABASE?sslmode=require
   NEON_AUTH_BASE_URL=https://YOUR_AUTH_HOST/neondb/auth
   NEON_AUTH_JWKS_URL=https://YOUR_AUTH_HOST/neondb/auth/.well-known/jwks.json
   NEON_AUTH_COOKIE_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS_LONG
   APP_URL=http://localhost:3008
   ```

   Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

3. Apply the checked-in migration with `npm run db:migrate`. The active migrations in `drizzle/neon/` create `public.neon_learning_states` and `public.google_calendar_connections`, linked to the UUID in `neon_auth.user`. Neon manages its own users, sessions, and credentials; app migrations do not recreate them. Use the direct connection for migrations and the pooled connection for app queries. To change the app schema later, use `npm run db:generate`, review the generated SQL, then migrate. Test production schema changes on an isolated Neon branch first. The older self-hosted migrations in the root `drizzle/` directory are retained as history and are not executed by the current config.
4. Restart the development server. For production, set these variables **before building**, set your HTTPS origin as `APP_URL`, and add that origin to Neon Auth's trusted domains. Localhost ports are usually allowed by default.
5. Open **Preferences** using your profile at the bottom of the sidebar. Create an account or sign in.
6. Use **Save to cloud** after studying. On a different device, sign in and **Load cloud backup**.

Cloud backups are explicit snapshot saves. They store vocabulary, schedules, activities, notes, preferences, and lesson progress together in PostgreSQL JSONB. An authenticated session determines ownership; the client cannot choose another user’s ID. Revision checks reject stale overwrites from another device. Loading a backup asks before replacing local data and offers an export first. There is no automatic cross-device merge.

Accounts use `@neondatabase/auth/next` through the same-origin `/api/auth` proxy. The server validates sessions with the Neon SDK before reading or writing any backup. Cloud ownership always comes from the authenticated user. Registration, sign-in, sign-out, restored sessions, and verification codes use the managed Auth service. If your branch requires verified emails, the account panel lets learners request a code and verify it before signing in. Neon delivers verification emails; configure production email delivery in the Neon Console. A password-recovery interface is not included yet. Credentials and the generated cookie secret belong only in server environment variables; never use a `NEXT_PUBLIC_` database URL or commit `.env.local`. The supplied JWKS URL is documented for token integrations; this app uses the SDK's session API rather than accepting client-supplied user IDs or implementing its own JWT verifier.

See the [Neon Next.js API guide](https://neon.com/docs/auth/quick-start/nextjs-api-only) for the managed SDK setup. Cloud code and SQL generation can be checked without credentials. A live database and valid environment are required to verify sign-up, sign-in, migrations, and cloud save/load end to end. Old local learning backups remain compatible; an account from a different identity provider is not automatically mapped to a Neon user.

## Preserve your existing vocabulary

On the **same browser origin**, the app imports `dj_words`, `dj_xp`, and `dj_theme` automatically into `deutsch-journey-v2`. It preserves the original storage keys. The old daily counters have no timestamps, so they are not imported as today’s activity.

Browser storage belongs to an origin. `file://`, `localhost:8000`, and `localhost:3000` have different storage. To transfer words from another origin, open that old address in the same browser and run this in its browser developer console:

```js
copy(
  JSON.stringify(
    Object.fromEntries(
      ["dj_words", "dj_xp", "dj_theme"].map((key) => [
        key,
        localStorage.getItem(key),
      ]),
    ),
  ),
);
```

Save the copied text as `legacy-backup.json`. In the new app, use **Preferences → Import backup**. The import previews your collection before replacing it. The `copy` console helper is available in Chrome and Edge. If the old address no longer serves a page, temporarily serve a blank page at that exact origin; the original local storage remains there until it is cleared.

Unreadable saved data is preserved instead of silently overwritten. The app explains the issue and allows export of the current session or import of a valid backup. Export a backup periodically; clearing browser data also removes local progress.

Existing v2 backups receive empty journey and vocabulary-evidence defaults. Your collection, notes, review schedules, and earned XP remain. Earlier single-question chapter completions remain in the backup history; the book journey counts only chapters that meet its new mastery checks. Journey steps, best scores, mission drafts, module responses, word evidence, and personal details are included in local exports and the optional JSONB cloud snapshot without a new database migration.

## Checks

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests cover vocabulary persistence, flashcard scheduling, lesson completion, situation feedback, mobile navigation, dark mode, legacy migration, empty/corrupt data, accessibility, and denied anonymous cloud access. With accounts configured, a mocked verification test covers requesting a code, invalid-code feedback, and returning to sign-in; it does not test email delivery. Screenshot previews are written to `test-results/`.

To test actual managed accounts and backups against a configured Neon development branch, run `$env:RUN_NEON_AUTH_E2E = '1'; npm run test:e2e -- tests/e2e/auth.spec.ts` in PowerShell. This opt-in test creates temporary `journey-test-...@example.com` accounts, checks registration, sign-in/out, session restoration, account isolation, backup loading, and stale revisions, then removes only its own test identities and their cascading backups using the configured database. It needs a branch with email/password login and no signup verification requirement; email delivery is not exercised. Use a development branch for these tests. The browser server uses `http://localhost:3000` and overrides `APP_URL` accordingly; normal development runs on port 3008.

The app uses browser-provided speech services. Audio depends on installed voices; recognition support is best in Chrome or Edge and may require internet access. Use HTTPS or localhost for microphone access. Browser speech recognition may process voice through the browser vendor’s service.

## Source layout

```text
src/app/           Pages, application styles, authenticated route handlers
src/components/    Study screens and reusable UI components
src/lib/           Typed learning logic, browser store, speech, authentication
src/db/            Neon connection and Drizzle schema
drizzle/           Versioned PostgreSQL migrations
tests/unit/        Learning, scheduling, validation, migration checks
tests/e2e/         Real-browser learning flows and accessibility checks
```

The brief also proposes optional AI tutoring, generated exercises, richer media lessons, additional game types, and full textbook content management. These remain future extensions. The book journey provides authored local conversations, original exercises, and browser audio alongside your textbook; it has no hidden AI API dependency.
