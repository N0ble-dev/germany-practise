# Deutsch Journey — A1–C2 Content Factory: Acquisition, Verification & Implementation Plan

**Date:** 14 October 2026

**Status:** Implementation proposal, not a claim the described pipelines or database tables already exist.

**Target:** Next.js App Router + TypeScript + Neon PostgreSQL + Drizzle ORM + Vercel + object storage.

**Product context:** Deutsch Journey currently has twelve original A1.1 companion lessons, personal vocabulary, listening/speaking activities, learner snapshots, and a separately planned Goethe Exam Arena. Confirm actual repo/database state before migrations.

---

## 0. Executive recommendation

**Do not scrape an entire course, generate 10,000 exercises in one AI call, or import content directly into production.**

Build a **Content Factory** which transforms curricular objectives and legally usable resources into _native, verified lessons_.

```text
CURRICULUM REFERENCE             LICENSED / OPEN DATA       ORIGINAL AUTHORING
CEFR can-do objectives           ZUM selected pages        Qualified author / AI draft
Goethe exam requirements        Tatoeba sentences         Topic-based conversation scripts
Theme/grammar references        Wikidata lexemes          German and Arabic explanations
                \                     |                     /
                       SOURCE + RIGHTS REGISTER
                                  |
                         CONTENT NORMALIZER
                                  |
                      LESSON ASSEMBLY PIPELINE
                                  |
            STRUCTURAL TESTS + AI CRITIQUE + HUMAN QA
                                  |
                       APPROVED AUDIO GENERATION
                                  |
                    AUDIO CHECKS + GERMAN LISTENER QA
                                  |
                  VERSIONED STAGING RELEASE (NEON DEV)
                                  |
                    IMMUTABLE PUBLISH TO PRODUCTION
                                  |
                      NEXT.JS NATIVE LEARNING UI
                                  |
                  LEARNER RESULTS + MISTAKE REMEDIATION
```

Build each _capability once_ (lesson reader, dialogue player, question renderer, recorder, mastery/review, admin QA), then publish thousands of content items through data rather than hardcoding pages.

The business differentiator is not the size of the dictionary: it is **complete lesson journeys with trustworthy German, useful audio, skill practice, real-life missions, and a clear route to Goethe exam readiness**.

---

## 1. Research-backed source strategy

### 1.1 Sources you can use to design the syllabus

| Source                                        | What it is good for                                                                                            | SaaS use                                                                                     | Link                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Council of Europe CEFR**                    | Official A1–C2 language abilities across listening, reading, writing, speaking, interaction and mediation      | Curriculum reference; do not bulk republish copyrighted publication                          | https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors          |
| **Goethe-Institut**                           | Exam scope, models, task types, learner vocabulary benchmarks, examples of required performance                | Exam specification/quality reference and external links; do not rehost protected tests/audio | https://www.goethe.de/en/spr/prf/ueb.html                                                          |
| **Goethe Deutsch für dich**                   | A1–C2 structured exercises and approaches                                                                      | Reference only unless licensed                                                               | https://www.goethe.de/prj/dfd/en/home.cfm                                                          |
| **vhs-Lernportal**                            | Carefully structured daily-life and professional German courses, mainly A1–B1 and selected advanced programmes | Reference, avoid copying courses/media without license                                       | https://www.vhs-lernportal.de/wws/kursangebot.php                                                  |
| **Deutsche Welle Learn German**               | Natural listening, story-based teaching, contextual audio/video                                                | Reference and external link unless usage permission secured                                  | https://learngerman.dw.com/                                                                        |
| **deutsch.info / DeutschAkademie / SCHUBERT** | Topic progression, grammar practice and test design comparison                                                 | Research and learner links; verify restrictions; SCHUBERT explicitly restricts rehosting     | https://deutsch.info/ ; https://www.deutschakademie.de/ ; https://www.aufgaben.schubert-verlag.de/ |
| **Hueber Menschen**                           | Sequencing for existing A1.1 companion                                                                         | Link/reference or licensed integration; do not copy textbook, recordings or exercises        | https://www.hueber.de/en/ueber-uns/kopierregeln-digitaler-unterricht                               |

These sites do not constitute permission to scrape or republish. Record exact usage conditions and the _specific_ content item before adding any third-party material to your SaaS.

### 1.2 Sources that can contribute actual reusable materials/data

| Source                           | What to obtain                                                              | Rights position                                                                                                      | Import method                                                              | Priority |
| -------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------- |
| **ZUM Deutsch Lernen**           | Select well-developed grammar notes, original task ideas/texts, topic plans | Wiki text generally CC BY 4.0; inspect page and every embedded/media asset individually                              | Curated pages; manual review or documented MediaWiki API where appropriate | **1**    |
| **Wikidata Lexemes**             | German lemmas, lexical categories, forms, senses                            | Wikidata structured data CC0                                                                                         | Documented dump/API/SPARQL; build small curated subsets                    | **1**    |
| **Tatoeba**                      | German sentence pairs for EN and where available AR; examples of usage      | Text typically CC BY 2.0 FR or CC0 where explicitly marked; per-item/source attribution; audio has separate licenses | Official download files; filter + review + attribution                     | **2**    |
| **Kultur und Sprache (Austria)** | Real-life cultural lessons and practice sequences                           | Original content generally CC BY-SA 4.0 except otherwise marked, with third-party caveats                            | Curated item import or adaptation, license handling                        | **2**    |
| **Kaikki/Wiktionary**            | More complete lexicon, inflections and definitions                          | CC BY-SA/GFDL (complex attribution/share-alike handling)                                                             | Versioned JSONL export + extraction + legal/quality review                 | **3**    |

Official pages to preserve in your `source_catalog`:

- ZUM description and default license: https://deutsch-lernen.zum.de/wiki/ZUM_Deutsch_Lernen:%C3%9Cber_ZUM_Deutsch_Lernen
- ZUM **Handlungsfelder** (functional communication topics): https://deutsch-lernen.zum.de/wiki/Handlungsfelder
- ZUM learning paths: https://deutsch-lernen.zum.de/wiki/Lernpfade
- Tatoeba FAQ and licensing: https://en.wiki.tatoeba.org/articles/show/faq
- Tatoeba downloads: https://tatoeba.org/en/downloads
- Wikidata license: https://www.wikidata.org/wiki/Wikidata:Licensing
- Wikidata lexeme query guide: https://www.wikidata.org/wiki/Wikidata:Lexicographical_data/Documentation/Query_Service
- Kaikki dictionary: https://kaikki.org/dewiktionary/
- Kultur und Sprache OER: https://www.kulturundsprache.at/oer
- CC BY 4.0: https://creativecommons.org/licenses/by/4.0/

### 1.3 Real restrictions that affect product design

1. A website being free to _read_ is **not** a commercial content license.
2. ZUM's own wiki text may be CC BY, but images, audio, embedded H5P and linked third-party materials must be audited separately. Do not treat the whole page as one permissive media package.
3. CC BY requires attribution, a link to license, change notices and no additional legal/technical restrictions preventing the CC-licensed content's reuse rights. Check product terms/paywall/DRM designs accordingly.
4. CC BY-SA may require adaptations to be shared under compatible terms; keep provenance and licensing on a per-asset basis and get specialist advice before combining into proprietary bundles.
5. Tatoeba audio has licenses different from its text; default to _your own commercially licensed audio_ even if you use a Tatoeba sentence. Respect the sentence text's license obligations for derivatives.
6. Goethe/Hueber protected exercises, dialogues and recordings cannot be treated as an import feed without explicit permission.
7. A language model can create useful drafts; it cannot grant itself source copyright clearance or certify CEFR difficulty.
8. Preserve source item ID, original author(s), page URL, revision/date and exact license. If rights are ambiguous, mark `blocked_pending_permission`.
9. For full publisher content, ask about **bulk SaaS rights, derivative rights, audio rights, redistribution, territories, seat limits, royalty structure** before integration.

### 1.4 Recommendation on sourcing mix

**Default production plan:**

- Core syllabus: internally designed from CEFR abilities and Goethe exam scope.
- Core lessons, storylines, exam questions, dialogues: original authored and reviewed.
- Curated grammar and activities: selectively adapt ZUM and other clearly licensed OER.
- Lexical enrichment: CC0 Wikidata data first; more restrictive dictionaries only after rights review.
- Sentence examples: original sentences supplemented by reviewed, license-tracked Tatoeba sentences.
- Audio: own licensed synthesis or recorded speakers, stored and versioned by Deutsch Journey.

Do **not** claim that any of these provides a complete ready-made A1–C2 course.

---

## 2. Build an instructional map first (before generating lessons)

### 2.1 Course structure

```text
Deutsch Journey Language: German
├── A1 Beginner
│   ├── A1.1 (audit and upgrade existing 12 lessons)
│   └── A1.2 (new original lessons)
├── A2 Elementary
│   ├── A2.1
│   └── A2.2
├── B1 Independent
│   ├── B1.1
│   └── B1.2
├── B2 Upper-intermediate
├── C1 Advanced
└── C2 Mastery
```

A1.1/A1.2 etc. are _your internal course subdivisions_, not separate CEFR certifications. Label B2–C2 as **Deutsch Journey original**, not _Menschen_; Menschen is a named publisher series used by learners as a companion reference.

### 2.2 Representative outcomes and domain scenarios

| Level | Can-do direction                                                                            | Real-life missions                                                     | Typical learning shifts                                              |
| ----- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| A1    | Give basic personal info, ask simple questions, handle very routine exchanges               | Language school, bakery, train information, shopping                   | Articles, present tense, simple W-questions, short chunks            |
| A2    | Communicate in routine situations, describe past and plans, manage straightforward services | Doctor reception, apartment appointment, phone call, transport changes | Perfekt, modals, separable verbs, basic connectors, longer replies   |
| B1    | Sustain discussions on familiar topics, narrate experiences, give reasons and opinions      | Work issue, landlord request, interview, travel disruption             | Connected explanations, subordinate clauses, broader reading/writing |
| B2    | Understand complex texts and articulate detailed viewpoints                                 | Team meeting, university seminar, dispute resolution                   | Argumentation, complex structures, register and nuance               |
| C1    | Handle demanding discourse fluently and flexibly                                            | Academic presentation, negotiation, formal correspondence              | Rhetorical structure, idioms, tone, sophisticated listening          |
| C2    | Interpret subtle meanings and synthesize challenging material precisely                     | Advanced debate, critical analysis, technical editing                  | Pragmatics, style, advanced inference and nuanced reformulation      |

These are **curriculum design directions**, not a claim that one finished mission is proof of a CEFR certificate. Build actual outcome IDs tied to the CEFR descriptors and assessment rubrics.

### 2.3 Organize content in TWO independent dimensions

**Progressive course path:** level → module → lesson → activity.

**Reusable knowledge network:** topic, skill, grammar, vocabulary sense, pronunciation feature, situation, CEFR outcome.

A learner might discover `der Bahnhof` in A1 and revisit it at B1 in a travel complaint and B2 in a formal transport argument. **Store one canonical lexeme** with multiple examples and contexts, not three disconnected copies.

Use these practical topics as recurring anchors:

- Meet people, family and identity
- Home, housing and neighborhood
- Food, shopping and money
- Transport, travel and directions
- Health and appointments
- Education, work and applications
- Authorities and daily services
- Relationships, hobbies and plans
- Media, society, environment and culture
- Higher-level academic, literary and professional contexts

### 2.4 Coverage matrix / content inventory

Create a `curriculum_matrix` which tracks for each lesson:

```text
course, module, lesson_id, learning_outcomes[], prerequisites[],
topic_tags[], vocabulary_senses[], grammar_topics[],
pronunciation_focus, target_skills[],
required_activity_types[], dialogue_count, audio_count,
assessment_rubrics[], sources[], reviewer_status,
content_version, actual_published_coverage
```

An admin page must show `missing`, `draft`, `needs_review`, `ready`, `published`, and `needs_revision` by level and skill. **No green “Complete A2” badge if it only contains vocabulary and grammar but lacks listening, speaking, writing and feedback.**

### 2.5 Suggested capacity plan (illustrative, not an official standard)

| Course |          Initial planning size | Publish policy                                                                           |
| ------ | -----------------------------: | ---------------------------------------------------------------------------------------- |
| A1.1   |            12 existing lessons | Audit + upgrade to complete packs                                                        |
| A1.2   |           ~12 original lessons | Ship after instructor review                                                             |
| A2     | ~24 lessons, in two subcourses | Release modules progressively                                                            |
| B1     | ~24 lessons, in two subcourses | Release modules progressively                                                            |
| B2     |           ~24 original lessons | Design for multiple longer skill tasks                                                   |
| C1     |           ~20 original lessons | Require experienced advanced-level authors and evaluators                                |
| C2     |           ~16 original lessons | Require specialist reviewers and substantial authentic-input licensing/original material |

**132 total illustrative lessons**, with A1.1 contributing 12 of them. The numbers are content planning placeholders; change them after level specialists develop full coverage. Having 132 lessons does **not** by itself prove sufficient depth for A1–C2.

---

## 3. Every level uses one reusable lesson framework

### 3.1 Required lesson components

1. **Outcome card** — “By the end, I can …” with CEFR mapping.
2. **Scene/story** — engaging real situation, not an isolated grammar page.
3. **Vocabulary** — lemmas, noun gender/plurals, verb forms, English and Arabic meaning, real examples, pronunciation notes.
4. **Sentence patterns** — reusable phrases with beginner/advanced context.
5. **Grammar in use** — rule, examples, exceptions, common mistakes.
6. **Dialogue/monologue** — multi-speaker transcript with role labels, translations and audio.
7. **Listening** — gist, details, number/time traps, dictation; controls appropriate to practice mode.
8. **Reading** — notices/messages at A1 to essays/technical texts at C1–C2.
9. **Writing** — short forms/messages to long-form formal argument.
10. **Speaking** — shadowing, guided prompts, free production and conversation.
11. **Interactive games** — matching, sentence order, article choice, cloze; appropriate to level.
12. **Real-life mission** — unassisted completion with feedback.
13. **Spaced review** — words, phrases and skills return later in different contexts.
14. **Lesson assessment** — structured rubric, objective answers when applicable, progress evidence.

### 3.2 One engine; difficulty-dependent presentation

- **A1/A2:** concise dialogs, transliteration _not_ default, translations in Arabic/English, audio slow/normal, visible hints.
- **B1:** longer paragraphs, fewer hints, more open-ended speaking and writing, authentic-like messages.
- **B2:** structured debate and detailed reading, timed writing and listening at natural pace.
- **C1/C2:** nuanced style/register, authentic original texts, complex argument and inference, human-calibrated open responses.

**Do not simply generate longer A1 multiple-choice questions and call them C1.** Advanced levels need qualitatively different language activities and evaluation rubrics.

### 3.3 Connect the course to the Goethe Exam Arena

Every approved activity has tags like:

```text
level: A1
skill: listening
outcome: understand_a_short_everyday_message
exam_alignment: [goethe_a1_hoeren]
scenario: train_station
```

These tags drive targeted exam preparation. Example: if a learner fails a timed Goethe-style question about departure times, recommend the lesson teaching `Uhrzeit`, a new audio dictation, and a short transfer test. **Exam tasks must be original or specifically licensed**, not pasted from official Goethe PDFs.

---

## 4. Three content acquisition lanes

### Lane A — Curated licensed/open content

1. Admin records a precise source page, author, license URL, allowed operations, latest revision, and embedded-asset inventory.
2. Rights gate checks commercial reuse, derivative permission, share-alike compatibility and source terms.
3. Fetch through an **approved official API/download** or manual import (no uncontrolled scraping).
4. Extract useful language text/activity structure, stripping blocked third-party media.
5. Normalize to German lesson components and preserve required attribution and modification notices.
6. A German instructor decides whether to adapt the content, use it as inspiration only, or reject it.
7. Approved adapted material enters an auditable content package.

**First pilot:** ONE ZUM CC BY grammar/text page whose assets are separately checked. Use its reviewed material inside an integrated lesson, **not** an iframe pretending to be a native course.

Potential technical access: MediaWiki provides `action=query&prop=revisions` and `action=parse`, but confirm ZUM's endpoint, access requirements, and any site-specific restrictions before integration.

### Lane B — Structured language data

**Wikidata lexemes**

- Query a small German lexeme set by part of speech/lemma; stage JSON data.
- Normalize noun gender/forms and verb morphology only when source supplies those facts with sufficient clarity.
- Surface uncertain/missing information for language review; do not invent forms.

**Tatoeba sentences**

- Use official German sentence export and translation links to EN/AR, filter by provenance and licenses.
- Check source reliability, idiomatic correctness, punctuation, context, translation accuracy.
- **Estimate** CEFR and tags using automated heuristics/AI, then human-check selected published items.
- Preserve sentence IDs and attribution; do not reuse recordings absent a separately verified audio license.

**Kaikki/Wiktionary**

- Start only if Wikidata coverage is insufficient.
- Import into a separate staging namespace with clear CC BY-SA/GFDL obligations and per-item provenance.
- Avoid making the entire proprietary dictionary a derivative without resolving legal requirements.

### Lane C — Original content production

Use a **brief → draft → critique → teach → approve** process:

```text
Lesson blueprint
  → controlled AI or human-first authoring
  → original vocabulary/context/dialogue/exercise drafts
  → deterministic schema validator
  → independent AI checker (warning, not approver)
  → DaF/DaZ German reviewer
  → Arabic/English translation review
  → rights approval
  → approved script → licensed TTS/recording
  → audio QA
  → publish
```

**Generation brief must include:** exact learner goal, target level, allowed grammar, known vocabulary, required novel vocabulary, setting, cultural appropriateness, desired exercise types, answer-key policy, bilingual styles, source-use constraints.

**Critical:** Never paste an entire protected textbook unit into an AI request and ask it to rewrite the unit with tiny wording changes. Create original work from instructional objectives and independently sourced facts.

---

## 5. Content package format: files in Git first, database second

**Decision:** author in **versioned JSON content packs** in Git; publish to Neon after validation. Add admin editing UI later. Source files act as the reviewable editorial history; Neon acts as the serving/published store.

```text
content/
  a1/
    a1-1/
      lesson-01/
        manifest.json
        vocabulary.json
        grammar.json
        dialogues.json
        exercises.json
        assessments.json
      lesson-02/
    a1-2/
  a2/
  b1/
  b2/
  c1/
  c2/

scripts/content/
  discover-sources.ts
  import-zum-curated.ts
  import-tatoeba-sentences.ts
  import-wikidata-lexemes.ts
  generate-draft.ts
  validate-pack.ts
  build-audio-manifest.ts
  stage-release.ts
  publish-release.ts
  audit-licenses.ts

src/lib/content/
  schemas/
  validators/
  normalization/
  review/
  storage/
  publishing/
```

### 5.1 Example `manifest.json` (illustrative, not an existing repo API)

```json
{
  "schemaVersion": 1,
  "id": "de-a1-1-introductions-01",
  "revision": 3,
  "courseId": "a1-1",
  "level": "A1",
  "title": {
    "de": "Sich vorstellen",
    "en": "Introducing Yourself",
    "ar": "التعريف بالنفس"
  },
  "goal": {
    "en": "I can introduce myself and ask someone's name.",
    "ar": "أستطيع التعريف بنفسي وسؤال شخص آخر عن اسمه."
  },
  "skills": ["listening", "speaking", "reading", "writing"],
  "topics": ["introductions", "identity"],
  "grammar": ["present-tense-basic", "w-questions"],
  "scene": "first_day_at_language_school",
  "prerequisites": [],
  "contentOrigin": "original",
  "sourceAssetIds": [],
  "status": "draft"
}
```

### 5.2 Example original dialogue format

```json
{
  "id": "dialogue-meet-lena-v1",
  "lessonId": "de-a1-1-introductions-01",
  "revision": 1,
  "lines": [
    {
      "speaker": "Lena",
      "de": "Hallo! Wie heißt du?",
      "en": "Hello! What's your name?",
      "ar": "مرحبًا! ما اسمك؟",
      "audioAssetId": null
    },
    {
      "speaker": "Omar",
      "de": "Ich heiße Omar. Und du?",
      "en": "My name is Omar. And you?",
      "ar": "اسمي عمر. وأنت؟",
      "audioAssetId": null
    }
  ]
}
```

`null` audio denotes incomplete draft; a release cannot publish if required media is missing.

### 5.3 Example exercise

```json
{
  "id": "a1-introductions-name-question-01",
  "type": "single_choice",
  "skill": "reading",
  "prompt": "Which question asks for someone's name informally?",
  "options": [
    { "id": "a", "text": "Wie heißt du?" },
    { "id": "b", "text": "Wo wohnst du?" },
    { "id": "c", "text": "Woher kommst du?" }
  ],
  "answer": { "optionId": "a" },
  "explanation": {
    "en": "Wie heißt du? is informal; Wie heißen Sie? is formal.",
    "ar": "Wie heißt du? صيغة غير رسمية؛ أما Wie heißen Sie? فهي صيغة رسمية."
  },
  "linkedGrammarIds": ["w-questions"],
  "linkedOutcomeIds": ["introduce-yourself-basic"]
}
```

**For production**, design discriminated unions using Zod: `single_choice`, `multi_choice`, `cloze`, `word_order`, `match`, `dictation`, `dialogue_comprehension`, `reading_set`, `writing_task`, `speaking_task`, and `scenario_chat`. Score free-form work with rubrics, not a fabricated exact percentage.

---

## 6. Neon PostgreSQL data model

Keep shared **curriculum**, editorial **workflow**, and private **learner progress** independent. Do not duplicate every lesson in each user's learning snapshot.

### 6.1 Shared curriculum tables

| Table               | Important fields                                                                    | Why                                                    |
| ------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `courses`           | `id`, `slug`, `cefr_level`, `sublevel`, `title`, `status`                           | A1.1 through C2                                        |
| `modules`           | `id`, `course_id`, `sort_order`, `title`                                            | Reusable grouping                                      |
| `lessons`           | `id`, `module_id`, `stable_slug`, `active_revision_id`                              | Stable lesson identity                                 |
| `lesson_revisions`  | `id`, `lesson_id`, `revision`, `content_hash`, `manifest_jsonb`, `status`           | Immutable reviewed releases                            |
| `learning_outcomes` | `id`, `level`, `skill`, `can_do`, `reference_url`                                   | CEFR skills coverage                                   |
| `lesson_outcomes`   | `lesson_id`, `outcome_id`                                                           | Outcome mapping                                        |
| `lexemes`           | `id`, `lemma`, `pos`, `gender`, `forms_jsonb`, `source_id`                          | Shared canonical German words                          |
| `lexeme_senses`     | `id`, `lexeme_id`, `meaning_en`, `meaning_ar`, `context`, `status`                  | Meanings are sense-specific                            |
| `lesson_vocabulary` | `lesson_id`, `lexeme_sense_id`, `sort_order`                                        | One word used by many lessons                          |
| `grammar_topics`    | `id`, `slug`, `level`, `explanations_jsonb`, `status`                               | Linked reusable grammar                                |
| `dialogues`         | `id`, `lesson_revision_id`, `content_jsonb`, `status`                               | Conversation content                                   |
| `exercises`         | `id`, `lesson_revision_id`, `type`, `content_jsonb`, `answer_jsonb`, `rubric_jsonb` | Renderable and scorable content                        |
| `media_assets`      | `id`, `storage_key`, `sha256`, `language`, `voice`, `license_id`, `qa_status`       | Audio/images metadata; binary media stays outside Neon |

### 6.2 Source/legal tables

| Table                  | Fields                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `content_sources`      | name, domain, import method, terms URL, default license, last reviewed                                                      |
| `source_items`         | source ID, exact URL, external ID, revision, author, license, license URL, allowed use, attribution, checksum, checked date |
| `content_source_links` | exact revision/item association, modification description                                                                   |
| `content_reviews`      | lesson revision, review kind, reviewer, outcome, note, `content_hash`, date                                                 |
| `content_releases`     | version, release status, list of revision IDs, manifest hash, published date                                                |

### 6.3 Learner tables (later if needed)

Use existing JSONB snapshots initially, and expand gradually:

```text
user_lesson_progress   (user_id, lesson_id, published_revision_id, skills_jsonb, status)
user_exercise_attempts (user_id, exercise_id, revision_id, response_jsonb, score_jsonb)
user_vocabulary_srs    (user_id, lexeme_sense_id, next_review_at, review_state)
user_skill_evidence    (user_id, outcome_id, evidence_type, attempt_id, measured_at)
```

Privacy: only the learner owns their private attempt, audio and progress records. Admin/editor roles cannot freely browse private recordings. Do not leak solution keys in client practice payloads when strict exam modes require secure grading.

### 6.4 Database rules

- Foreign keys and unique constraints on natural identities/revisions.
- Server-side authorization for all writes and private reads.
- Atomic, idempotent imports; stable external IDs and `upsert` rather than duplicate inserts.
- Published revisions immutable; corrections create a new revision.
- Old attempts always retain the exact question and rubric version used for scoring.
- Content status (`published`) is authoritative on the server, not a client flag.
- Drizzle migrations change schema; _content releases_ import lesson data separately.

---

## 7. Next.js experience: native lessons, not resource links

### Learner pages

```text
/(learn)/learn
/(learn)/learn/[courseSlug]
/(learn)/learn/[courseSlug]/[lessonSlug]
/(learn)/learn/[courseSlug]/[lessonSlug]/practice
/(learn)/learn/[courseSlug]/[lessonSlug]/mission
/(learn)/review
/(learn)/germany-world
/(learn)/grammar/[topic]
/(learn)/vocabulary/[lemma]
/(learn)/exams/goethe/[level]
/(learn)/progress
```

### Editor/admin pages

```text
/admin/content/sources
/admin/content/imports
/admin/content/curriculum-map
/admin/content/lessons
/admin/content/lessons/[id]/editor
/admin/content/lessons/[id]/review
/admin/content/media
/admin/content/releases
/admin/content/coverage
/admin/content/qa-issues
```

### Native lesson user flow

```text
Today's mission: Introduce yourself at a language school
  1. Intro scene + characters
  2. Vocabulary with article/sound
  3. Listen to original dialogue
  4. Understand key meaning
  5. Grammar X-Ray
  6. Build a sentence from word blocks
  7. Repeat and record
  8. Chat with AI character (bounded by lesson content)
  9. Complete unassisted speaking task
  10. Save difficult words; schedule reviews
  11. Receive specific feedback and next lesson
```

AI dialogues should use validated content as context and log errors for editor review. Open-ended AI-generated conversation is **not automatically verified course content**, and should be clearly separate from curated graded exercises.

---

## 8. The automated validation system

### 8.1 Structural tests (blocking)

- Every required ID, slug, level, lesson revision and locale is present.
- Unique identifiers within content pack and across release.
- Noun entries include article or explicitly document noun exceptions; verbs have required forms when taught.
- English/Arabic translations exist where shown (including RTL rendering tests).
- Audio references resolve to an uploaded file and script hash/version.
- Every exercise has correct options/accepted variants and nonambiguous answer key.
- Every exam-tagged task has a matching exam blueprint and verified rubric.
- All internal links, grammar references, lexeme senses and prerequisite IDs exist.
- All referenced third-party material has commercially compatible rights and attribution.
- No content pack marked `published` has pending reviewer gates.
- Readability/accessibility, subtitles/transcripts and keyboard navigation tests.

### 8.2 AI-assisted checks (warnings, never sole approval)

- Possible German case/article/conjugation issues.
- CEFR difficulty estimates and out-of-syllabus constructs.
- Tone, formal/informal address and common cultural inaccuracies.
- Arabic/English translation alignment.
- Plausibility of distractors and task instructions.
- Duplication or near-identical exercise templates.
- Unexpected similarity to known restricted textbook excerpts (flag for editorial investigation).

### 8.3 Human review (required for first release of each item)

| Reviewer                         | Verifies                                                    | Approval evidence                        |
| -------------------------------- | ----------------------------------------------------------- | ---------------------------------------- |
| German DaF/DaZ instructor        | Grammar, naturalness, level and teaching value              | Reviewer ID, rubric, signed content hash |
| Arabic/English bilingual editor  | Translations, register, instructional clarity               | Locale-specific approval                 |
| Rights/editorial reviewer        | Originality or proper license, attribution and media rights | Legal/rights checklist                   |
| German-proficient audio listener | Audio-script match, stress, speed, intelligibility          | Audio QA on script + asset hashes        |
| Exam specialist for mocks        | Task validity, marking schema and exam format               | Separate exam-paper approval             |

**Changing source text, script, answer key, translations or audio invalidates relevant approvals**; the same revision cannot silently change after review.

### 8.4 Content state machine

```text
idea → sourced → draft → structurally_valid
  → language_review → locale_review → rights_review
  → script_approved → audio_generated → audio_approved
  → staging_qa → publish_approved → published
  → superseded / archived

Any failing check → needs_changes, with specific review reason.
```

---

## 9. Audio: efficient, reusable and high quality

**Recommended start:** commercial-use licensed German TTS plus careful human review. Later add native-speaker recordings for high-value scenarios, exams and pronunciation training.

```text
Approved German transcript
  → text+speaker+model+speaking-rate hash
  → check whether asset already generated
  → synthesize licensed TTS
  → store under immutable content-addressed key in R2/Blob
  → automatic format, duration and silence checks
  → German listening QA
  → create audio reference in Neon
```

Examples of assets:

```text
/de/a1/l01/v3/word-bahnhof-normal.mp3
/de/a1/l01/v3/dialogue-first-day-speaker-a.mp3
/de/a1/l01/v3/dialogue-first-day-speaker-b.mp3
/de/a1/l01/v3/dialogue-full.mp3
```

**Implementation notes:**

- Cache identical sentences by content hash to reduce cost, but use distinct voices where the dialogue calls for them.
- Store transcripts and captions; do not generate audio before German text approval.
- Audio spoken at 0.7x in the browser isn't identical to a natural slow recording; evaluate quality and create an appropriately spoken slower version when needed.
- Expose license/voice source and version metadata as appropriate.
- For exam simulation, validate playback rules against level-specific official descriptions; avoid leaking transcripts before submission.
- Do not advertise speech-to-text agreement as a validated phonetic accuracy score. Use targeted feedback and optional human evaluation.

---

## 10. Publish reliably with Neon branches and Vercel

Neon child branches do not automatically sync or merge content, so **never promote a release by resetting production from dev**.

```text
CONTENT REPOSITORY (canonical, reviewed manifests)
                 |
          GitHub Pull Request
                 |
         content:validate CI
                 |
      content license + QA gates
                 |
      import revision into vercel-dev
                 |
     Preview in Next.js/Vercel staging
                 |
        Admin approves release SHA
                 |
       signed, idempotent publish job
                 |
    production Neon + media permissions
                 |
    audit version + rollback pointer
```

### Required commands (to implement)

```bash
pnpm content:validate
pnpm content:test
pnpm content:license-audit
pnpm content:stage --release a1.1-v1
pnpm content:qa-report --release a1.1-v1
pnpm content:publish --release a1.1-v1
pnpm content:verify-production --release a1.1-v1
```

These are **proposed scripts** and will need implementation. `publish` must accept only a release already approved in staging and must resolve the approved revision hashes from a trusted manifest. Use separate environment identities, credentials and access rights. Do not copy user data from development into production.

**Rollback:** change the lesson's `active_revision_id` back to the previous approved revision; keep learner attempts linked to the old version. For serious broken questions, mark them invalid and recalculate affected progress transparently.

---

## 11. Content administration dashboard

A strong admin/editor product is essential if the platform targets all levels.

### `/admin/content` dashboard

- Coverage matrix: CEFR levels × reading/listening/writing/speaking × topic.
- Lessons published / blocked / under review.
- Review backlog, with assigned reviewer and deadlines.
- Imported-source license and attribution warnings.
- Missing translations and missing audio counters.
- Source revision change alerts.
- Duplicated or suspicious exercises.
- Preview lesson as A1 student, mobile user and screen-reader user.
- Approve a release with changelog, not individual ad hoc SQL queries.

### Import Preview UI

For each staged resource, show:

```text
Source: ZUM Deutsch Lernen
Exact URL: ...
Author: ...
License: CC BY 4.0 (verified on exact item)
Embedded audio: blocked / missing separate license
Suggested level: A2 (AI estimate; review required)
Suggested grammar: separable verbs
Suggested learning goal: ask for directions
Buttons: [Reject] [Edit] [Request review]
```

### Human editor experience

Side-by-side source text (when authorized), normalized lesson content, translations, audio player and exercise answer editor; comment history and required fields. Support keyboard-first editing and batch review _only_ for already-validated items.

---

## 12. Production quantities and economics

Quantity is **not** the success metric, but capacity planning still matters.

Example editorial budget for **one new lesson** (planning assumption, not market price):

- Blueprint: 30–60 min
- Authoring/draft refinement: 1–3 h
- Native German pedagogy/revision: 1–3 h
- EN/AR review: 30–90 min
- Audio production and listening QA: 30–90 min
- QA/publishing: 30–60 min

This suggests roughly **4–11+ reviewer/production hours per complex lesson**, and much more for advanced texts and calibrated assessments. Reusable vocabulary and assets reduce marginal costs, but human QA remains a substantial recurring cost. Validate with 3 real pilot lessons before budgeting 132 lessons.

**Measure:** cost per approved lesson, approval time, reject rate, user-reported language errors, retained vocabulary, listening success and successful unassisted speaking, not merely number of imported sentences.

### Provisional content KPIs

- 100% newly published lesson assets rights-cleared.
- 100% released exercise answer keys structurally validated.
- 100% assessed dialogues have transcripts + reviewed audio when audio is required.
- 100% published lessons link to at least one measurable outcome.
- Zero known unreviewed AI-generated exam questions in graded mock releases.
- Learner feedback has a route to flag inaccurate German and trigger editorial response.

---

## 13. Build sequence and roadmap

### Phase 0 — Audit the current project (3–5 working days, estimated)

1. Read existing Next.js app routes, Neon tables, Drizzle schema and lesson fixtures.
2. Confirm whether the twelve A1.1 lessons exist in code, database or browser data.
3. Export/backup current content and learner snapshots before migrating.
4. Verify ownership of all existing dialogue, audio and image material.
5. Classify features already implemented vs planned: no destructive replacement.
6. Write the `curriculum_matrix` for A1.1 and a full A1 outcome grid.

**Deliverable:** inventory, source register, scope and migration plan.

### Phase 1 — Content factory core (Weeks 1–2, estimate)

- Drizzle tables: shared content, releases, sources, review logs.
- Zod schemas and content schema versions.
- Git-based content packs and CLI validation.
- Admin staging/preview read-only UI.
- Pilot one original A1.1 Lesson 1 pack (no new AI dependencies required).

**Exit:** publish one lesson without editing React components or copying private learner data.

### Phase 2 — Verification + Audio (Weeks 3–4, estimate)

- Source rights/attribution workflow.
- German + English/Arabic review screens.
- TTS generation, asset hashing and audio QA.
- Automated tests for questions and media.
- Staging preview and immutable production release.

**Exit:** fully reviewed A1.1 Lesson 1 with playable audio and complete activities.

### Phase 3 — A1 content completion (Weeks 5–8+, estimate; editorial capacity dependent)

- Audit and upgrade remaining 11 A1.1 lessons.
- Create full A1.2 blueprint and first original module(s).
- Add ZUM selective import pilot and Wikidata curated lexeme adapter.
- Connect Germany World scenes and spaced review to stable content IDs.
- Connect A1 Goethe Exam Arena remedial links.

**Exit:** current A1.1 experience is coherent and maintained; A1.2 production repeatable. Do not claim full A1 until A1.2 and all skill outcomes are reviewed.

### Phase 4 — A2/B1 and scaled editorial production (following months)

- Develop A2 and B1 modules with teacher guidance, release incrementally.
- Build reading/writing longer-form templates and teacher-facing review tools.
- Add selected Tatoeba import for high-quality reviewed usage examples.
- Use analytics to identify missing situations, weak exercises and review needs.
- Expand original Goethe-format practice with appropriate exam specialists.

### Phase 5 — B2/C1/C2 (longer-term programme)

- Engage higher-level German specialists, especially for discourse and assessment.
- Create advanced original texts, recorded discussion, academic/professional scenarios, register and inference exercises.
- License authentic content selectively or commission it.
- Calibrate written/spoken rubrics against human assessment examples.
- Do not promise C2 readiness from an autogenerated text bank.

**Realistic expectation:** the reusable technology can be built in weeks; a verified comprehensive A1–C2 curriculum is a significantly longer **editorial and instructional project**, even with AI assistance.

---

## 14. First 15 engineering tasks (in recommended order)

1. Audit repo, current Neon branch migrations, content location and current progress storage.
2. Write A1.1 inventory + CEFR learning outcome matrix.
3. Add `courses`, `modules`, `lessons`, `lesson_revisions` with stable IDs.
4. Define typed JSON pack schema + examples and Zod validator.
5. Add `content_sources`, `source_items`, license approval and attribution fields.
6. Add `lexemes`, `lexeme_senses`, `lesson_vocabulary`, grammar links.
7. Create idempotent staged `content:import` for first A1.1 lesson.
8. Implement Next.js lesson renderer driven by Neon content (not hardcoded components per lesson).
9. Add quiz renderer and answer validation with versioned attempts.
10. Add media manifest, commercial TTS adapter and storage integration.
11. Add language/pedagogy/translation/audio reviewer workflow.
12. Add staging preview + CI checks + production release promotion.
13. Implement `/admin/content/coverage` and missing-content report.
14. Integrate existing SRS, saved phrases, Germany Mode and Goethe Exam Arena with content IDs.
15. Trial ZUM selected licensed item and Wikidata batch import, measure editorial effort.

Each ticket should have a small verification test and explicit rollback path.

---

## 15. Acceptance criteria for proof of concept

### Pilot: A1.1 — Introducing Yourself

- [ ] Lesson objective, topic and skill tags grounded in CEFR reference.
- [ ] At least a small reviewed vocabulary set with article/verb metadata.
- [ ] Original dialogue with English/Arabic translations.
- [ ] Playable German audio with matching transcript and commercial rights.
- [ ] Listening, speaking, sentence-building and reading or writing tasks.
- [ ] Real-life mission requiring an unassisted introduction.
- [ ] Answer keys validated and incorrect answers explained.
- [ ] Grammar X-Ray and memory review links work.
- [ ] Evidence of German, translations, audio and rights review bound to exact revision.
- [ ] Successful staging preview on mobile and desktop.
- [ ] Same approved immutable lesson published to Neon production.
- [ ] Lesson flags/analytics can report errors without exposing learner private data.

**Proof of scalability:** add a _second_ lesson entirely as a content pack, without building a new lesson page. Then add a **third** lesson with a different exercise type. If it works, the architecture is genuinely reusable.

---

## 16. Source reference appendix (verified public source pages, 14 October 2026)

1. Council of Europe, CEFR descriptors — https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors
2. Council of Europe, CEFR in the classroom — https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-in-the-classroom
3. Goethe-Institut exam trainings — https://www.goethe.de/en/spr/prf/ueb.html
4. Goethe Deutsch für dich A1–C2 — https://www.goethe.de/prj/dfd/en/home.cfm
5. ZUM license and intended A1–C2 levels — https://deutsch-lernen.zum.de/wiki/ZUM_Deutsch_Lernen:%C3%9Cber_ZUM_Deutsch_Lernen
6. ZUM communication fields — https://deutsch-lernen.zum.de/wiki/Handlungsfelder
7. ZUM learning paths — https://deutsch-lernen.zum.de/wiki/Lernpfade
8. Tatoeba FAQ — https://en.wiki.tatoeba.org/articles/show/faq
9. Tatoeba licensing and downloads — https://en.wiki.tatoeba.org/articles/show/using-the-tatoeba-corpus
10. Wikidata rights — https://www.wikidata.org/wiki/Wikidata:Licensing
11. Wikidata lexeme queries — https://www.wikidata.org/wiki/Wikidata:Lexicographical_data/Documentation/Query_Service
12. Kaikki Wiktionary extraction and license — https://kaikki.org/dewiktionary/
13. Kultur und Sprache open materials — https://www.kulturundsprache.at/oer
14. Creative Commons BY 4.0 terms — https://creativecommons.org/licenses/by/4.0/
15. MediaWiki revisions API (potential curated ZUM access) — https://www.mediawiki.org/wiki/API:Revisions

### Final decision

**Ship reviewed lesson journeys first, scale the content process second, expand levels third.**

The best first sprint is **A1.1 Lesson 1 end-to-end using the new content pack/review/publishing architecture**, followed by a second lesson authored through the same pipeline. This proves that Deutsch Journey can grow to A2–C2 safely rather than becoming a very large collection of unverified AI-generated text.
