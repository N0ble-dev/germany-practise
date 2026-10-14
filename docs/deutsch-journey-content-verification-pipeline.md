# Deutsch Journey — Verified Content Production & Publishing Pipeline

**Target stack:** Next.js (App Router), TypeScript, Drizzle ORM, Neon PostgreSQL, Vercel, object storage for audio (Cloudflare R2 or Vercel Blob).

**Goal:** Publish an original, licensed, pedagogically reviewed German curriculum that scales from A1.1 through higher CEFR levels, without duplicating shared content per user.

## 0. Important boundaries

- **Menschen A1.1** is a named Hueber product, not a reusable dataset. Its lesson sequence can guide a companion experience, but textbook passages, exercises, answer keys, dialogues, images and audio must **not** be bulk-republished without the proper agreement. Hueber explicitly says that uploading materials to learning platforms requires a licensing agreement: https://www.hueber.de/en/ueber-uns/kopierregeln-digitaler-unterricht
- **CEFR** provides learning objectives; **Goethe** provides reliable examples of A1 exam scope and vocabulary. Their public pages do not automatically grant republication rights. https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors and https://www.goethe.de/de/m/spr/prf/ueb/pa1.html
- "A1.1" is a _course subdivision_; CEFR officially describes **A1**, not a distinct certified A1.1 level.
- AI-generated German is a **draft**, not verified truth. Pronunciation scores based on speech recognition are not official pronunciation certification.

## 1. Where to obtain content and how to verify it

| Resource                                                     | Safe primary use                                                        | Verify / rights considerations                                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Council of Europe CEFR descriptors                           | Learning outcomes / skills rubric                                       | Read and map outcomes, not copy entire publication into product                                    |
| Goethe-Zertifikat A1 Wortliste, sample tests                 | Vocabulary coverage, exercise skill targets and assessment pattern      | Do not republish exam audio/tests or entire list without permission                                |
| Hueber Menschen A1.1                                         | Course alignment and learner's own reference                            | Explicit permission for published reuse of protected material                                      |
| Tatoeba                                                      | Supplemental short sentences                                            | Inspect exact sentence/audio licensing and attribution; manually check grammar and appropriateness |
| German teacher / editor (qualified, ideally DaF/DaZ)         | Review grammar, level, lesson utility, translations, spoken naturalness | Record named reviewer, review timestamp and reviewer decision                                      |
| Commercially licensed German TTS or professional voice actor | **New audio you own or can distribute**                                 | Retain generation/voice licenses and quality-check audio                                           |

For a **paid** product, build primarily **original** content, commissioned or generated then human-reviewed, with an auditable permission trail. Verify Arabic translations separately (Modern Standard Arabic vs Egyptian dialect), and keep English translations natural.

## 2. Curriculum planning BEFORE generation

Make a master spreadsheet or versioned JSON describing the following for every lesson:

- `courseId`: A1.1, A1.2, A2.1, ...
- `unitNumber`, `slug`, `title`, `estimatedMinutes`
- `canDo`: 2–4 measurable learner outcomes
- `scene`: one real-life context (classroom, introduction, bakery, train, etc.)
- `introducedGrammar`: small list of new patterns
- `prerequisites`: prior lesson IDs
- `vocabularyTargets`: lemmas with nouns' genders/plurals and verbs' conjugation forms where appropriate
- `pronunciationFocus`, `listeningOutcomes`, `speakingOutcome`
- `assessmentRules`: objective pass criteria for key skills
- `cefrDescriptorRefs`: identifiers/links used for curriculum planning

**Do not** ask AI to invent the next 100 lesson topics without this plan. Start by auditing the **12 original A1.1 lessons already in Deutsch Journey**.

## 3. Standard lesson pack

Store one versioned JSON file per lesson in Git, and validate before import.

**Example path:** `content/a1-1/lesson-01.json`

```json
{
  "id": "a1-1-l01",
  "version": 1,
  "course": "A1.1",
  "lessonNumber": 1,
  "status": "draft",
  "title": { "de": "Sich begrüßen", "en": "Meeting someone", "ar": "التعارف" },
  "canDo": ["I can greet someone", "I can ask for and give a name"],
  "references": [
    {
      "name": "CEFR A1 can-do descriptors",
      "url": "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors",
      "use": "curriculum_reference_only"
    }
  ],
  "rights": {
    "origin": "original",
    "commercialUseCleared": true,
    "notes": "New example content; no textbook text reproduced"
  },
  "vocabulary": [
    {
      "id": "w-hallo",
      "de": "Hallo",
      "en": "hello",
      "ar": "مرحبًا",
      "type": "phrase",
      "article": null,
      "plural": null
    },
    {
      "id": "w-name",
      "de": "der Name",
      "en": "name",
      "ar": "الاسم",
      "type": "noun",
      "article": "der",
      "plural": "die Namen"
    }
  ],
  "dialogues": [
    {
      "id": "d-hello",
      "context": "Two students meet",
      "lines": [
        {
          "speaker": "A",
          "de": "Hallo! Ich heiße Lea. Wie heißt du?",
          "en": "Hello! My name is Lea. What's your name?",
          "ar": "مرحبًا! اسمي ليا. ما اسمك؟",
          "audioKey": null
        },
        {
          "speaker": "B",
          "de": "Ich heiße Omar. Freut mich!",
          "en": "My name is Omar. Nice to meet you!",
          "ar": "اسمي عمر. تشرفت بمعرفتك!",
          "audioKey": null
        }
      ]
    }
  ],
  "exercises": [
    {
      "id": "e-name",
      "type": "multiple_choice",
      "prompt": "How do you ask someone's name informally?",
      "options": [
        { "id": "a", "text": "Wie heißt du?" },
        { "id": "b", "text": "Wo ist das?" },
        { "id": "c", "text": "Wie viel kostet das?" }
      ],
      "correctOptionId": "a",
      "explanation": "‘Wie heißt du?’ asks for a name using informal ‘du’."
    }
  ],
  "reviews": {
    "language": null,
    "pedagogy": null,
    "arabic": null,
    "audio": null,
    "rights": null
  }
}
```

`audioKey: null` means audio is **not generated yet**; the lesson cannot publish until required audio exists and passes review. This lesson is intentionally **draft**, not verified.

For production, extend the schema with grammar cards, dictation, sentence builders, free-speech prompts, expected acceptable answers, phoneme/audio timings if used, difficulty metadata, and image credits.

## 4. Automated gates (run in TypeScript)

Use **Zod** schemas (and optional unit tests using Vitest) to reject packs if:

1. Required fields/IDs/translations are missing.
2. `noun` vocabulary lacks a valid article; plural fields conform to schema when relevant.
3. Vocabulary IDs, dialogue IDs and exercise IDs are duplicated within the lesson.
4. Multiple-choice answers don't refer to one of the supplied options; option IDs duplicate; fewer than two choices.
5. Exercises have blank prompts, explanations or answers.
6. References to words, audio assets, prerequisites or grammar points can't be resolved.
7. Published content has no licensing review, language review, pedagogical review, Arabic review (when Arabic is shown), or required audio QA.
8. Audio manifests contain absent/zero-byte files, incompatible formats, or missing line coverage.
9. Lesson revision IDs collide; published version is mutated without incrementing the version.

### Important limitation

Automated code validation catches **structure** and many consistency problems; it does **not** prove German grammar, translation nuance, natural speech or pedagogical appropriateness. An AI checker can flag concerns, but a human reviewer is the publish gate.

### Suggested commands

```bash
pnpm add zod
pnpm add -D tsx vitest

# Your own scripts, after implementing the validators:
pnpm content:validate
pnpm content:test
pnpm content:qa-report
```

Optional: pass content through a German grammar-checker such as LanguageTool, if its applicable deployment/API terms permit the intended use. Review every correction; grammar tools are imperfect.

## 5. Human QA form

An editor should use an admin review page; each review is stored per **specific content version**.

| Gate       | Reviewer verifies                                                                       |
| ---------- | --------------------------------------------------------------------------------------- |
| `language` | Native/natural German; cases/articles, punctuation, context, respectful language        |
| `pedagogy` | Appropriate A1 vocabulary/grammar; clear skills progression; valid distractors          |
| `arabic`   | Correct Modern Standard Arabic / chosen dialect; natural translations                   |
| `rights`   | Original or documented licenses; compatible with paid redistribution; media attribution |
| `audio`    | Matches script exactly; appropriate pacing/stress/intonation, not distorted             |

Record `reviewerId`, `decision`, `comment`, `contentHash`, `reviewedAt` per gate. **Any change to lesson text/audio invalidates dependent approvals**, forcing a new review.

## 6. Audio workflow

```text
APPROVED GERMAN SCRIPT
  → TTS (licensed for commercial redistribution) or recorded speaker
  → MP3/OGG/WAV output
  → automatic checks: durations, clipping/empty audio, file manifest, text alignment
  → native/proficient German listening QA
  → store on object storage with immutable versioned key
  → save media reference in Neon
```

Example R2 key: `de/a1-1/l01/v3/dialogue-d-hello-line-1.mp3`.

**Important:** generate audio **after approving the German text**. If the script changes, regenerate the affected files and reapprove those files. Avoid treating browser speech recognition confidence as proof of pronunciation quality.

## 7. Database design (Neon / Drizzle)

Your existing SaaS already has user-specific JSONB learning snapshots. Do **not** migrate those as a prerequisite to creating the shared catalog.

Suggested shared catalog tables:

| Table                                | Key fields                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `courses`                            | `id`, `cefr`, `title`, `visibility`, `sort_order`                                                                  |
| `lesson_versions`                    | `id`, `lesson_key`, `version`, `course_id`, `status`, `content_json`, `content_hash`, `created_at`, `published_at` |
| `content_reviews`                    | `id`, `lesson_version_id`, `category`, `reviewer_id`, `decision`, `content_hash`, `created_at`                     |
| `media_assets`                       | `id`, `lesson_version_id`, `storage_key`, `file_hash`, `license_ref`, `qa_status`                                  |
| `curriculum_sources`                 | `id`, `source_url`, `license`, `attribution`, `permission_doc`, `last_checked_at`                                  |
| `course_publications`                | `course_id`, `lesson_key`, `published_version_id`, `updated_at`                                                    |
| `lesson_progress` (learner-specific) | `user_id`, `lesson_key`, `lesson_version_seen`, `completed_at`, `mastery_json`                                     |

Maintain a public read view that returns only `course_publications` references to approved immutable `lesson_versions`. A private reviewer/admin API can read drafts. **Never** use a frontend `status = published` button as the only authorization check.

Separate shared content from per-user vocabulary notes/review states. Do not duplicate shared dialogues for every account.

## 8. Publishing pipeline

```text
Author writes / AI drafts content JSON
          ↓
Git commit + Pull Request
          ↓
CI: JSON/Zod checks + relationship tests + license metadata
          ↓
Import draft into Neon vercel-dev
          ↓
Preview in Next.js admin (words, dialogues, exercise interactions)
          ↓
Qualified German editor checks language/level
          ↓
Translation + rights reviewers approve
          ↓
Generate / upload audio + QA audio
          ↓
All required reviews pass on SAME content hash
          ↓
Publish job upserts approved version to production Neon
          ↓
Atomic update of course_publications pointer
          ↓
Production smoke-test and monitoring
```

### Critical environment rule

**Neon `vercel-dev` is NOT continuously synced with `production`**. Promoting content means explicitly importing the same reviewed content version into the production branch; **not** resetting `production` from `vercel-dev`, nor assuming a merge. Any schema change uses reviewed **Drizzle migrations** on both environments, tested in dev first. Production import requires a restricted service credential and manual approval.

Protect production from GitHub pull-request jobs. Only approved main-branch publication workflow can access deployment/import credentials. Handle retries via stable lesson/version keys and upserts.

### Idempotent content import rules

- Use `(lesson_key, version)` as a unique key.
- Store SHA-256 of canonical lesson JSON and SHA-256 of each audio file.
- If an existing version has the same hash, **skip safely**.
- If the same version key has a different hash, **reject** rather than silently overwrite.
- Always import first as `draft`/`approved`, then publish via separate authorized action.
- Advance a `course_publications` pointer only after the entire lesson and all referenced audio are confirmed present.
- Keep previous lesson versions to allow quick rollback; don't break completed student progress.

## 9. CI/CD outline

A starter `.github/workflows/content-check.yml`:

```yaml
name: Content validation
on:
  pull_request:
    paths:
      - "content/**"
      - "scripts/content/**"
      - ".github/workflows/content-check.yml"
  push:
    branches: [main]
    paths: ["content/**", "scripts/content/**"]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm content:validate
      - run: pnpm content:test
```

Notes: adapt Node/pnpm versions to the existing repo; this workflow **validates only**. Add a **separate manually approved** `content-publish.yml` on `main` for writing to production. Do not expose production secrets to PRs.

## 10. Admin workflow

Build `/admin/content` restricted by a **server-side allowlist or admin role**, with:

1. Lesson list with version, review status, CEFR, audio coverage, last editor.
2. Create/edit draft, restore previous version, and diff revisions.
3. Validation report: errors vs warnings.
4. Human review tasks and reviewer notes.
5. Audio preview and regeneration requests.
6. "Approve" controls bound to exact content hash; "Publish" requires separate permission.
7. Audit log of who published what and when.

Suggested statuses: `draft → automated_valid → needs_review → reviewed → audio_ready → publishable → published → archived`.

An actual lesson can move backwards (e.g., if corrected after review, approvals become stale).

## 11. How to produce the first A1.1 batch

1. Audit the 12 original A1.1 lessons already in the app. Inventory all words, dialogues, grammar, exercises, audio and rights provenance; do not assume existing AI text has been validated.
2. Choose **Lesson 1** as a pilot. Define explicit can-do goals and a small core vocabulary set.
3. Produce **original** German lesson copy: 10–15 useful words, 6–10 short examples, 1–2 dialogues, 5–8 exercises, and one speaking/real-life mission.
4. Verify lesson against Goethe A1 scope/CEFR ability targets; schedule native/qualified German editor + Arabic-language reviewer.
5. Generate your **own licensed audio** only for approved text; QA each recording.
6. Import approved version into `vercel-dev`; verify answer keys, loading, sound playback, speech tasks, tracking and mobile behavior.
7. Sign off and publish the exact reviewed version into `production` with manual approval.
8. Iterate lesson-by-lesson, then run cumulative review of every 3 lessons (can users combine skills?).

**Gate definition for production:** `schemaValid && allForeignKeysResolve && languageApproved && pedagogyApproved && rightsApproved && translationsApproved && requiredAudioApproved && matchesApprovedContentHash`.

## 12. Content generation prompt template (internal)

```text
Create ORIGINAL German teaching content for a [A1] lesson.
Topic: [Introducing yourself].
Learner's prior grammar: [list].
New allowed grammar: [list].
Vocabulary budget: [12 core items].
Outcomes: [ask name, give name, exchange greetings].
Return structured JSON matching the provided schema.
Include de/en/ar translations, short natural dialogues, answerable exercises,
clear explanations, pronunciation emphasis and a real-life speaking task.
Do not reproduce any Menschen, Goethe, or third-party passages, test items or audio.
Do not claim content is verified or published.
Identify possible ambiguity, grammar issues, and items needing expert review.
```

**Never give the AI the right to auto-approve its own output.**

## 13. Four-week MVP rollout (estimate, not a guarantee)

- **Week 1:** audit existing A1.1 content; design Zod schema / review metadata; create first draft pack.
- **Week 2:** validate, review, generate audio and launch Lesson 1 in dev with real tester feedback.
- **Week 3:** build versioned content import/publish and minimal admin reviewer queue; publish Lesson 1.
- **Week 4:** build a production rhythm for Lessons 2–3 and improve QA from learner-reported errors.

Scale generation volume only after the quality gates and re-publication/rollback procedure work.

## 14. Suggested references

- Official CEFR descriptors: https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors
- Goethe A1 practice + vocabulary list: https://www.goethe.de/de/m/spr/prf/ueb/pa1.html
- Hueber permissions: https://www.hueber.de/en/ueber-uns/kopierregeln-digitaler-unterricht
- Drizzle/Neon integration: https://orm.drizzle.team/docs/get-started/neon-existing
- Neon database branches: https://neon.com/docs/get-started-with-neon/workflow-primer
- Cloudflare R2 upload: https://developers.cloudflare.com/r2/objects/upload-objects/
- Tatoeba licensing information: https://en.wiki.tatoeba.org/articles/show/cc0-contributions
