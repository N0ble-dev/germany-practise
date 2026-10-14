# Deutsch Journey — Native Goethe Exam Preparation: Integration Master Plan

**Prepared:** 14 October 2026  
**Status:** implementation proposal, not a statement of completed functionality  
**Target stack:** Next.js App Router, React, TypeScript, Tailwind/shadcn UI, Neon PostgreSQL, Drizzle ORM, existing managed Google authentication  
**Audience:** individual German learners, initially Arabic/English-speaking adults at A1; future A2–C2 support  
**Positioning:** **Independent Goethe-Zertifikat preparation**. **Deutsch Journey is not affiliated with, approved by, or a certification provider for Goethe-Institut.**

---

## 0. Executive decision

**DO NOT build a webpage that merely lists PDFs, external exam links or embedded videos.** Build a native, responsive preparation journey inside the existing application. Every exercise, recording, result, mistake and next recommendation lives in Deutsch Journey and contributes to the learner's progress.

Build **one highly credible adult Goethe A1: Start Deutsch 1 experience end-to-end**, then reproduce the engine for other exam definitions. Original tests must be mapped to official _format and competencies_, not copied from official model papers.

Core user promise:

> Understand the exam → practise Hören/Lesen/Schreiben/Sprechen → simulate a timed paper → see evidence-based feedback → improve weak skills → try again.

The signature experience is **Exam-to-Lesson**: a wrong listening question, weak writing point or failed oral response automatically leads to an appropriate existing lesson, vocabulary review and targeted retry.

### What already exists according to the supplied project plan

The provided SaaS planning document reports: Next.js + Neon + Drizzle, Google authentication, twelve original A1.1 companion lessons, vocabulary, spaced reviews, listening/speaking, saved sentences, a study planner, personal learning snapshots, small study spaces, and manual Google Calendar sync. **Verify those features in the repository and deployed application before implementation**; this plan is not a code audit.

Do not replace or destructively migrate the existing local/JSONB notebook snapshot system. Introduce relational exam content and attempts as additive modules. Keep current progress, sharing and authentication working.

---

# PART I — VERIFIED CONTENT SOURCES AND THEIR REAL ROLES

## 1. Source-by-source integration policy

| Source                                                            | What was confirmed / is useful                                                                                         | How it enters the product                                                                                                                                   | Copy / host content?                                                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Goethe-Institut exam training A1–C2**                           | Official practice sets, sample task types, answer keys, audio, speaking demonstrations and digital accessible training | **Authoritative _exam-format reference_.** Use to configure layouts, section timing, task taxonomies, writing/speaking targets, and the official exam guide | **No by default.** Do not ingest official questions/audio/videos/PDFs without written permission/license   |
| **Goethe adult A1 examination page**                              | Four sections and published lengths: Hören 20m, Lesen 25m, Schreiben 20m, Sprechen 15m; speaking in a group            | A1 exam profile, mode configuration and user explanation                                                                                                    | Paraphrase factual format; link source                                                                     |
| **Goethe A1 digital model: Sprechen**                             | 3 parts: introduce yourself, ask/give information, make/respond to requests                                            | In-app **original** three-part speaking simulator                                                                                                           | Do not reproduce Goethe cards/scripts                                                                      |
| **Goethe results information**                                    | A1 overall >=60/100 after all parts; A2 additionally written >=45 and oral >=15; B1–C2 60/100 **per module**           | Versioned **official scoring metadata** and clearly labelled independent simulation metrics                                                                 | Factual rules yes; no copied marking sheets                                                                |
| **CEFR Companion Volume**                                         | Can-do descriptors by level/skill                                                                                      | Learning outcome tags, curriculum coverage and diagnostic competency map                                                                                    | Use referenced objectives; avoid wholesale redistribution                                                  |
| **ZUM Deutsch Lernen**                                            | A1–C2 openly licensed teaching texts and activities, generally CC BY 4.0, with separately marked media licenses        | Candidate supplementary grammar/skill resources; selective **licensed** adaptation as an in-app task when each item passes rights review                    | **Yes, selectively:** item-level evidence, attribution, transformation/license checks and editorial review |
| **Tatoeba**                                                       | Downloadable examples/translation pairs and per-file/per-audio licenses                                                | Source material for ancillary practice sentences and examples; not exam-paper templates                                                                     | **Only items with compatible license** and review; per-audio rights checked separately                     |
| **Wikidata lexemes**                                              | CC0 structured lexical data                                                                                            | Article/inflection enrichment; not exam readiness evidence                                                                                                  | CC0 structured data, review factual quality                                                                |
| **Wiktionary via Kaikki**                                         | Structured meanings/forms                                                                                              | Optional dictionary enrichment after legal review                                                                                                           | Share-alike/attribution can complicate commercial mixed content                                            |
| **vhs-Lernportal, Deutsche Welle, deutsch.info, DeutschAkademie** | Useful grammar/course patterns and listening practice                                                                  | Competency-gap analysis and editorial inspiration, optionally a separate _further study_ link                                                               | **Do not silently import content**                                                                         |
| **SCHUBERT-Verlag**                                               | Level-organized exercises and explicit restrictions on redistribution/collection                                       | Understand practice themes or link to original site                                                                                                         | **No unlicensed reposting/import**                                                                         |

**Verified external URLs:**

- Goethe exam-training hub: https://www.goethe.de/en/spr/prf/ueb.html
- Goethe A1 practice (adults and young learners explicitly distinguished): https://www.goethe.de/en/m/spr/prf/ueb/pa1.html
- Goethe A1 adult sections: https://www.goethe.de/ins/de/de/prf/gzsd1.cfm
- Goethe A1 Sprechen model overview: https://bfu.goethe.de/a1_sd1/sprechen.php
- Goethe A2 practice: https://www.goethe.de/ins/us/en/spr/prf/ueb/pa2.html
- Goethe B1 practice: https://www.goethe.de/ins/us/en/spr/prf/ueb/pb1.html
- Goethe B1 Sprechen model overview: https://bfu.goethe.de/b1_mod/sprechen.php
- Goethe B1 official structure: https://www.goethe.de/ins/de/en/prf/gzb1.cfm
- Goethe B2 official structure: https://www.goethe.de/ins/de/en/prf/gzb2.cfm
- Goethe C2 official structure: https://www.goethe.de/ins/de/en/prf/gzc2.cfm
- Goethe score rules (all levels): https://www.goethe.de/en/spr/prf/pes.html
- Goethe accessible practice: https://www.goethe.de/en/spr/prf/ueb/bpf.html
- Goethe Alexandria A1 details: https://www.goethe.de/ins/eg/de/sta/alx/prf/gzsd1/inf.html
- ZUM usage policy: https://deutsch-lernen.zum.de/wiki/%C3%9Cber_ZUM_Deutsch_Lernen
- Tatoeba downloads: https://tatoeba.org/en/downloads
- Wikidata license: https://www.wikidata.org/wiki/Wikidata:Licensing
- CEFR: https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions
- Goethe general terms including protected material: https://www.goethe.de/resources/files/pdf313/agb_en.pdf

**Evidence limitation:** This survey verifies public descriptions of official task structure and source policies. It does not establish licensing permission for any specific Goethe or third-party media asset. It does not establish a legally reusable, ready-made exam bank. Those items need separate approval.

## 2. A precise approach to official source use

Goethe is the **reference for exam fidelity**, not a raw content feed. Maintain a `format_source_revision` and record when an admin last checked the official rules. Each exam definition contains:

- Exam name, version, audience (`adult`, optionally `youth` later), CEFR level
- Section/module structures and task groups
- Published exam and preparation durations where applicable
- Speaking setup (group/partner/individual)
- Listening replay requirements and number/order of parts **per actual exam blueprint**
- Official calculation and pass rules, with source links
- Differences between physical, digital and accessible formats where known
- Last checked date, reviewer, and change history

**Do not infer that every level uses the A1 timing, speaking pattern, or grading scheme.** A1 Start Deutsch 1 and A1 Fit in Deutsch 1 are different exams. The adult variant is the first implementation.

## 3. License gate: allowed vs blocked

Every content asset has `provenance = original | licensed | openly_licensed | reference_only`.

Publication allowed when:

1. **Original:** commissioned or authored for Deutsch Journey; creator terms grant necessary rights; teacher-reviewed.
2. **Licensed:** written permission clearly covers SaaS, commercial display, region, media, term and derivative rights.
3. **Openly licensed:** exact URL, author, declared license, attribution, modification flag and any attribution/share-alike obligations are recorded; embedded media checked separately.

Publication blocked when:

- There is no verified license, or content is marked NC/ND and the proposed use conflicts.
- Goethe downloadable PDF/audio/video is merely available to the public.
- A third-party site explicitly prohibits redistribution.
- AI generates a near-copy of a distinctive source question or dialogue.
- A media file has unknown artist, recorder, stock image or voice rights.

Allow **separate outbound official links in an information drawer**, but the core exam experience must use platform-owned or properly licensed material.

---

# PART II — THE LEARNER EXPERIENCE

## 4. Navigation: one native preparation destination

```text
Deutsch Journey
├── Today
├── Journey / Menschen A1.1 (existing)
├── Practice / My Words / Listening / Speaking (existing)
├── Exam Arena  ← NEW
│   ├── Overview / My target exam
│   ├── Understand the exam
│   ├── Daily exam practice
│   ├── Skill studios
│   │   ├── Hören
│   │   ├── Lesen
│   │   ├── Schreiben
│   │   └── Sprechen
│   ├── Mock Exams
│   ├── Results & Mistake Lab
│   └── Exam Plan & Readiness
└── Profile
```

Routes (adjust to existing route conventions only after checking code):

```text
/exams
/exams/select
/exams/[examCode]
/exams/[examCode]/guide
/exams/[examCode]/practice
/exams/[examCode]/practice/[skill]
/exams/[examCode]/mock/[paperId]/start
/exams/attempts/[attemptId]/take
/exams/attempts/[attemptId]/report
/exams/mistakes
/exams/plan
/admin/exams
/admin/exams/blueprints
/admin/exams/papers
/admin/exams/reviews
/admin/exams/assets
/admin/exams/publish
```

## 5. High-quality exam landing page

The user must see a useful learning destination, not a wall of external links:

```text
┌─────────────────────────────────────────────────────────────┐
│ EXAM ARENA                                Target: Goethe A1 │
│ Prepare for your next German milestone 🇩🇪                │
│                                                             │
│ Exam date: Not set             [Set date]                   │
│ Current course: A1.1         Not full A1 syllabus completed │
│                                                             │
│ [Continue today's 10-minute exam drill]   [Take diagnostic] │
├─────────────────────────────────────────────────────────────┤
│ YOUR FOUR SKILLS                                            │
│ [🎧 Hören] [📖 Lesen] [✍ Schreiben] [🎙 Sprechen]          │
│ Evidence: attempts, accuracy, practice volume, weak tasks   │
├─────────────────────────────────────────────────────────────┤
│ PREPARE                                                     │
│ [Understand the exam] [Train a skill] [Full timed mock]     │
│                                                             │
│ Your next improvement: basic questions → Lektion 1 review  │
├─────────────────────────────────────────────────────────────┤
│ EXAM EXPLAINER / OFFICIAL SOURCE INFORMATION                │
│ Exam parts, durations, rules, source verification date      │
│ [Goethe official information] (optional external reference)│
└─────────────────────────────────────────────────────────────┘
```

**Mobile UX:** single prominent next action; skill cards horizontally scrollable or 2×2; progress near top; no forced paywall for exam overview; sticky exam timer in simulation; mobile-safe audio recording UI.

## 6. First visit onboarding (2–3 minutes)

1. Ask target **adult exam level** A1/A2/B1/B2/C1/C2; default suggestion based on current course but confirm, not assume.
2. Ask whether the learner **has a booked exam date**; allow no date; user-entered dates must be labeled planned vs confirmed.
3. Ask available daily study time and preferred help language (English/Arabic).
4. Explain official Goethe exam vs independent practice clearly.
5. Offer **5–10-minute diagnostic**, or continue without one.
6. Create _editable_ prep plan; do not make unjustified claims of pass probability.

If the learner is currently A1.1, recommend **starter exam-style practice** and explain that a full A1 test typically assumes complete A1 competency (often acquired through A1.1+A1.2 or equivalent learning).

## 7. The three modes

### A. Learn the exam

- Visual interactive explainer: sections, timings, formats, question examples, examiner interaction, answer submission.
- Demonstrate all exam controls with **original non-scored examples**.
- Teach exam tactics: read instructions, look for distractors, manage time, ask for repetition where allowed.
- Explain how a score is calculated; give level-specific official facts and dates checked.

### B. Skill training (coach mode)

- Brief, repeatable daily drills; hints, audio speed control, translations and transcripts where pedagogically useful.
- Personalised selection from old mistakes and skill gaps.
- Immediate answer rationale; learners can save vocabulary and grammar to notebook.
- A button after every error: **Understand → Practice → Retry**.
- No timer or optional timer; accessible learner controls.

### C. Timed exam simulation

- Paper and module version locked before start.
- Tasks rendered in the published order and applicable time budget for that definition.
- No answer hints/transcripts/slow playback unless a specifically labelled accommodation mode is selected.
- Objective answers locked on submission; draft writing/mic submissions saved with clear status.
- Timers based on server timestamps; loss of focus is not proof of cheating (do not use invasive proctoring).
- Connection recovery policy documented; resumed attempts marked `interrupted` if not equivalent to strict uninterrupted conditions.
- Explicit report indicates: `Deutsch Journey original mock`, not official Goethe test.

## 8. Hören — Listening studio

**Native experience:** question list + audio player + answer controls, no external page.

**Content:** original everyday dialogues, train announcements, phone messages, short radio snippets, later interviews/lectures depending on level.

**Task UI / engine:**

- Play prompt with configurable speed in training only.
- Number of plays, pauses and sequencing stored in task-version settings for the intended paper.
- Question formats: single-select, matching, true/false, other paper-specific objective tasks.
- Visual indicators: playing, waiting, question answered, connection interrupted.
- At report time: transcript, audio evidence marker, correct answer, why distractors fail, misunderstood phrase.

**Feedback → existing features:** missed time/number/negation questions create targeted listening drills; unfamiliar words can be saved to existing vocabulary and spaced review.

**Accessibility:** captions/transcripts available in coach mode; accessible alternate practice clearly labelled, not passed off as identical strict audio testing. Provide non-audio demo alternative for users testing the interface.

## 9. Lesen — Reading studio

- Render _original_ notices, websites, emails, messages, advertisements and increasingly complex texts.
- Adaptive practice: scanning details, global meaning, negatives, inference, matching.
- One source text can generate multiple teacher-reviewed independent questions.
- Text highlight (practice), keyword help (practice), distraction comparison after answer.
- Exam mode: hide annotations/help; apply module-specific timer.
- Report: quote a **short excerpt from your own text** showing the evidence, not protected publisher content.

## 10. Schreiben — Writing studio

- Level-specific original prompts. A1: simple form fields and personal message; advanced levels: increasingly structured arguments, formal messages and longer texts.
- Writing editor preserves draft; checklist of required points in training mode; optional word count and spellcheck policy per paper.
- Evaluation must separate **task fulfillment**, communicative intelligibility, organization, vocabulary and grammar (weights and criteria per reviewed rubric version).
- AI feedback: suggestions, highlighted corrections, missing content points, 1–2 targeted drills; grade labelled **unofficial estimated feedback**.
- Do not collapse grammar errors into a single pass/fail number. Do not claim objective grade calibration until validated against expert scores.
- Optional human-reviewed writing (later paid feature) to establish meaningful quality checks.

## 11. Sprechen — Speaking studio

### Native modes

1. Listen and repeat (not exam-scored).
2. Guided roleplay / simulated examiner.
3. Partner practice (existing two-partner study space can be leveraged _after authorization audit_).
4. Timed section simulation with voice recording; transparent limits versus real group/paired exam.

### A1 adult specific blueprint

The official A1 model describes three tasks:

- **Part 1:** introduce yourself (name, age, country, town, languages, profession, hobby).
- **Part 2:** ask for and give information about familiar everyday subjects.
- **Part 3:** make requests and respond appropriately.

Build **your own original question cards and prompts**; do not copy Goethe cards. Do not describe an AI single-person simulator as reproducing a real group examination exactly.

### Feedback protocol

- Store _recognized transcript_ separately from actual recording and show ASR uncertainty.
- Assess whether the requested **information was communicated**, plus general intelligibility, grammatical targets and turn-taking.
- ASR agreement is **not an acoustic pronunciation accuracy score**. Never invent phoneme-level precision if the technology does not provide it.
- In the first release: structured text feedback + optional recording replay + user-friendly “what to try next.”
- Track meaningful human rater comparisons before presenting robust quantitative oral proficiency estimates.

### Data privacy

Explicit consent before microphone recording or third-party processing; default recordings private; provide retention policy and delete/export controls. Signed URLs, private bucket and owner-scoped access, no audio in public profile cards or shared spaces by default.

## 12. Exam report and Mistake Lab

Every attempt should generate **specific improvement work** instead of a generic percentage.

```text
Deutsch Journey A1 mock — Attempt #2 (original practice paper)

Hören   9/15 correct             Evidence: 15 questions
Lesen   12/15 correct            Evidence: 15 questions
Schreiben   Practice feedback pending / estimated
Sprechen    Practice feedback pending / estimated

Patterns noticed:
- Confused 09:00 and 19:00 twice
- Missed 'nicht' in short messages
- Forgot to ask a question in oral Part 2

Next three actions:
[5-min Numbers + Time audio drill]
[Review negation — linked A1 lesson]
[Repeat Part 2 oral card]
```

**Important:** values above are fictional UI samples, _not_ the official distribution of marks/questions. Report labels should clearly distinguish `raw item accuracy`, `unofficial rubric feedback`, and `official scoring reference`.

**Mistake mapping** must point to existing `lesson_slug` / `vocabulary_id` / `grammar_objective_id` where possible. When a resource isn't present in the course, create a content-authoring backlog instead of a dead link.

## 13. Exam plan and revision scheduler

Suggested sequence after selecting exam:

1. Short diagnostic reveals gaps; no official assessment claim.
2. Learner chooses date and realistic daily time.
3. Weekly schedule balances all 4 skills, due reviews and a mock near the end.
4. Daily recommended session uses priority formula (weak skill, due review, recency, exam proximity, unfinished mastery).
5. Schedule is editable and optional; calendar sync requires existing explicit Google Calendar consent.
6. Missed day recalculates safely without punitive streak copy or overwhelming backlog.

Prefer **transparent rules** for first release; do not use AI to make unexplained pass predictions.

---

# PART III — EXAM ENGINE, NOT HARDCODED QUIZZES

## 14. Exam definition registry

One definition per exam **and audience/version**, not just per CEFR level.

Proposed adult starter registry:

| Exam                    |  Hören |  Lesen | Schreiben | Sprechen | Important distinction                             |
| ----------------------- | -----: | -----: | --------: | -------: | ------------------------------------------------- |
| A1 Start Deutsch 1      | 20 min | 25 min |    20 min |   15 min | Group speaking, **combined overall** passing rule |
| A2 Goethe-Zertifikat A2 | 30 min | 30 min |    30 min |   15 min | Overall plus **minimum written/oral** scores      |
| B1 Goethe-Zertifikat B1 | 40 min | 65 min |    60 min |   15 min | Modules separately assessed; paired speaking      |
| B2 Goethe-Zertifikat B2 | 40 min | 65 min |    75 min |   15 min | Separate modules; presentation and discussion     |
| C1 Goethe-Zertifikat C1 | 40 min | 65 min |    75 min |   20 min | Separate modules; advanced task/argumentation     |
| C2 Goethe-Zertifikat C2 | 35 min | 80 min |    80 min |   15 min | Separate modules; individual speaking             |

These are Goethe-published standard _section durations_, not the promised total in-person appointment length. Prep time and accommodation rules may be additional and vary. **Recheck official current exam detail per level before launch**.

**Source:** https://www.goethe.de/en/spr/prf.html and official individual certificate pages; scoring https://www.goethe.de/en/spr/prf/pes.html.

### Scoring config: model as data, not application branching

- A1 adult: official pass at **60/100 total** with all sections attempted; written component 75 available, oral 25. An _unofficial_ exam may show a **practice equivalent** only if the question weighting and human-scored components have been correctly modelled and reviewed. Otherwise show skill-level raw accuracy without artificial 100-point equivalence.
- A2 adult: official **60/100 overall + 45 written + 15 oral**, with all parts attempted.
- B1/B2/C1/C2: official **60/100 within each separately assessed module**. Never average the modules into one fake pass prediction.
- Version the grade configuration and keep source metadata. Teachers must validate any _simulated_ rubric, raw-to-scaled conversions and question counts against the target paper definition.
- When writing/speaking has not been assessed, show **incomplete provisional results**, not `pass`.

Example definition fragment (**structure illustrative**, not an official marking recipe):

```json
{
  "examCode": "goethe-a1-sd1-adult",
  "definitionVersion": "2026-10-14-draft",
  "cefr": "A1",
  "audience": "adult",
  "provider": "Goethe-Institut",
  "sourceOfficialUrl": "https://www.goethe.de/ins/de/de/prf/gzsd1.cfm",
  "sourceScoringUrl": "https://www.goethe.de/en/spr/prf/pes/pas1.html",
  "lastReviewedAt": null,
  "reviewStatus": "draft",
  "sections": [
    { "skill": "listening", "durationMinutes": 20 },
    { "skill": "reading", "durationMinutes": 25 },
    { "skill": "writing", "durationMinutes": 20 },
    { "skill": "speaking", "durationMinutes": 15 }
  ],
  "publishedOnlyWhenHumanApproved": true
}
```

### Task registry (extend as exam levels demand)

```text
single_choice
true_false
matching
text_entry_short
form_completion
short_writing
long_writing
voice_introduction
voice_question_response
voice_request_response
voice_planning_dialogue
voice_presentation
voice_discussion
```

Each task type defines: answer schema, interaction UI, accessibility alternative, evaluation type, sample review checklist, and export/report behavior. For each exam paper, restrict task types to its verified blueprint.

## 15. One original A1 task pack (example structure)

All contents below should be **original and reviewed**, never copied from an official test paper.

```json
{
  "schemaVersion": 1,
  "packId": "dj-goethe-a1-sd1-adult-starter-01",
  "examCode": "goethe-a1-sd1-adult",
  "status": "draft",
  "license": "Deutsch Journey original content",
  "language": "de-DE",
  "items": [
    {
      "id": "dj-a1-listen-001",
      "section": "listening",
      "taskType": "single_choice",
      "objectiveTags": ["time", "announcement", "numbers"],
      "prompt": "Wann beginnt der Sprachkurs?",
      "mediaKey": "dj/a1/starter01/listening-001.mp3",
      "transcript": "Guten Morgen! Der Sprachkurs beginnt heute um neun Uhr.",
      "options": [
        { "id": "a", "text": "Um acht Uhr" },
        { "id": "b", "text": "Um neun Uhr" },
        { "id": "c", "text": "Um zehn Uhr" }
      ],
      "correctOptionIds": ["b"],
      "rationale": "Im Audio steht: 'um neun Uhr'.",
      "connectedLessonSlug": "a1-1-greetings-and-personal-information",
      "rights": { "provenance": "original", "licenseVerified": false }
    }
  ]
}
```

**Production data hygiene:** Split public questions from private answer keys and transcripts. A public attempt API must **not** send `correctOptionIds`, rationale, examiner reference response or hidden hints before submission. Store solutions server-side or in access-controlled tables/fields and expose only after scoring. The example above is an _authoring pack_, not the client payload.

### Content blueprint per paper

A proper mock paper comprises:

- `exam_definition_revision` → verified sections, timings and task types
- `paper_version` → immutable list of section versions
- `section_version` → sequence and playback rules
- `task_version` → text, options, media, key, rationale, rubric
- `asset_license` → original/CC/permission with proof
- `teacher_approval` → signed review for exact version hash

Do not call a small 8-question diagnostic a **full Goethe mock exam**. Show `mini practice`, `section practice`, or `full-length mock` truthfully; only publish full-length mode when the reviewer confirms task count, relative weights, timings and coverage for that exam variant.

---

# PART IV — TECHNICAL INTEGRATION

## 16. Additive architecture

```text
Next.js App Router
   ├── Exam UI (Server Components + client exam interaction)
   ├── Auth-checked Server Actions / Route Handlers
   ├── Exam Domain Services
   │     ├── examDefinitions
   │     ├── attemptLifecycle
   │     ├── scoringAndFeedback
   │     ├── mistakeToLesson
   │     └── publishingAndEntitlements
   ├── Neon PostgreSQL + Drizzle
   │     ├── Shared published exam content (relational)
   │     ├── Attempt/responses/review data (user scoped)
   │     └── Existing learner notebook and courses (preserved)
   ├── Private object storage
   │     ├── Original / licensed source audio
   │     └── Learner voice recordings, if consented
   └── Background work (when warranted)
         ├── Async speech/writing feedback
         ├── Media QA/transcoding
         └── Expiry/retention cleanup
```

**Deployment:** dev app uses Neon `vercel-dev`; production app uses Neon `production`; no dev-to-prod branch reset/merge used for content promotion. Promote reviewed content pack **by immutable hash and importer**. Drizzle migrations run in planned environment order with backups/recovery.

### Suggested code organization

```text
src/
  app/(app)/exams/
    page.tsx
    [examCode]/page.tsx
    [examCode]/guide/page.tsx
    [examCode]/practice/[skill]/page.tsx
    [examCode]/mock/[paperId]/start/page.tsx
    attempts/[attemptId]/take/page.tsx
    attempts/[attemptId]/report/page.tsx
    mistakes/page.tsx
    plan/page.tsx
  app/(app)/admin/exams/
  app/api/exams/attempts/[attemptId]/answer/route.ts
  app/api/exams/attempts/[attemptId]/submit/route.ts
  app/api/exams/attempts/[attemptId]/recording/route.ts
  db/schema/exams.ts
  features/exams/
    components/
    definitions/
    services/
    validators/
    scoring/
    reporting/
    permissions/
    content/
content/exams/
  goethe-a1-sd1-adult/
    paper-starter-01.json
scripts/
  exam-validate.ts
  exam-import.ts
  exam-promote.ts
.github/workflows/
  validate-exam-content.yml
```

This is a suggested layout to adapt to existing conventions, **not an assertion these paths are present today**.

## 17. Neon schema design (minimum robust set)

Prefer **relational content with versioned immutable JSON for polymorphic tasks**; do not bury all attempts in the learner's existing JSONB backup snapshot.

| Table                     | Essential fields                                                                                                               | Reason                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `exam_definitions`        | id, exam_code unique, provider, CEFR, audience, official_url, checked_at, blueprint_version, scoring_rule_version, status      | Separate adult/youth and changing rules |
| `exam_sections`           | id, definition_id, skill, duration_seconds, section_order, rules_json                                                          | Timing and interaction                  |
| `exam_papers`             | id, exam_id, paper_slug, title, kind, current_published_version_id nullable                                                    | Named original practice packs           |
| `exam_paper_versions`     | id, paper_id, version, immutable_hash, content_status, published_at, provenance_status                                         | Preserve what learner actually took     |
| `exam_task_versions`      | id, paper_version_id, section_id, order_index, task_type, prompt_json, private_solution_json, objective_tags, weight, media_id | Versioned tasks and answer keys         |
| `exam_media_assets`       | id, storage_key, transcript, content_hash, license_id, audio_duration, qa_status                                               | Licensed original media and provenance  |
| `content_license_records` | id, source_url, author, license_code, evidence_url, allowed_scope, verified_by, verified_at                                    | Publication rights                      |
| `exam_review_signoffs`    | id, paper_version_id, reviewer_id, reviewer_role, review_type, revision_hash, approved_at                                      | Approval for exact revision             |
| `exam_attempts`           | id, user_id, paper_version_id, mode, status, started_at, submitted_at, timer_state_json, interruption_flag                     | User-scoped state                       |
| `exam_responses`          | id, attempt_id, task_version_id, answer_json, saved_at, evaluated_at, review_status                                            | Version-specific answers                |
| `exam_feedback`           | id, response_id, engine, rubric_version, reviewer_id nullable, confidence, feedback_json, status                               | Separate AI from reviewed scores        |
| `exam_speech_recordings`  | id, user_id, attempt_id, media_key, status, retained_until, deleted_at                                                         | Private learner recordings              |
| `exam_skill_observations` | id, user_id, attempt_id, skill, objective_tag, measured_value, kind, observed_at                                               | Honest evidence for recommendations     |
| `exam_goals`              | id, user_id unique, exam_code, planned_at nullable, booking_confirmed, daily_minutes, tz, coaching_lang                        | Study planning                          |
| `exam_recommendations`    | id, user_id, linked_objective, linked_lesson_id nullable, reason_json, generated_at, completed_at                              | Explainable exam-to-lesson connection   |

**Constraints/indexes:** `(user_id, started_at DESC)` attempts, `(attempt_id, task_version_id)` unique response, `paper_version_id` immutable FK; published versions cannot be edited; audit all admin changes. Use idempotent content import with `paper_slug + version + hash`, not blind inserts. Review source licensing at **media level**, not just article level.

### User and content ownership

- Content is shared read-only to learners _when published_.
- Attempts, responses, recordings, feedback, goals and reports belong to a verified `session.user.id` on the server.
- Admin roles explicitly grant author / reviewer / publisher actions; user ID passed by client never authorizes reading another learner's data.
- Existing study spaces must **not automatically expose exam answers, recordings or private reports** to invited partners. Add explicit opt-in sharing later.
- Pro entitlement must be validated by a **server-side resolver** when billing is implemented; do not treat current roadmap as a shipped payment system.

## 18. APIs / server actions

Public server-rendered data:

```text
GET /exams                            available published exam definitions
GET /exams/:examCode                  official guide + learner summary
GET /exams/:examCode/practice         available packs and skill choice
```

Authenticated internal routes / server actions:

```text
POST /api/exams/attempts              create attempt for authorized published version
PATCH /api/exams/attempts/:id/answer   validate/save response, enforce owner
POST /api/exams/attempts/:id/submit    transactional finalize, server-side grade objective work
GET /api/exams/attempts/:id/report     owner-only report, reveal answers only after submit
POST /api/exams/attempts/:id/recording issue short-lived direct-upload token after consent
POST /api/exams/feedback/:responseId   queue or trigger permitted feedback job
POST /api/admin/exams/publish         reviewer+publisher authorization and rights gates
```

**Security:** Zod validation, request size and duration limits, rate limiting, idempotency keys for submit/upload, immutable published content, transactional grading. Never trust client timers or supplied grade, do not expose teacher-only answer keys with Server Component hydration or route payloads. Speech recording URLs should be time-limited private signed URLs.

## 19. Attempt state machine

```text
created
  ↓
in_progress ────→ interrupted (network / resume policy)
  ↓
submitted
  ├── objective_scored
  ├── subjective_pending
  └── failed_evaluation (retry possible)
               ↓
        feedback_complete
               ↓
             archived
```

Save draft answers and attempt state frequently. On submission, seal objective inputs; do not alter historical responses when later editing the exam pack. Support delayed feedback. Show explicit saving status and a recovery path if offline/disconnected.

## 20. Scoring and trust

**Objective tasks:** deterministically score against approved answer key on server. Unit tests must cover all possible options, partial-credit rules where genuinely supported, and blank submissions.

**Writing:** reviewed rubric + AI feedback with explicit uncertainty. Separate coverage of requested points from word-choice/style suggestions. Require human calibration against sample teacher annotations before publishing precise numeric scores.

**Speaking:** record, optionally transcribe, detect missing target information; provide helpful coaching. Do not conflate ASR word overlap with phonetic accuracy. Do not assign official-style certification scores from transcription alone.

**Exam readiness:** use factual indicators like `8 of last 10 listening tasks correct`, `two writing tasks completed with feedback`, `speaking practice has not been reviewed`; exclude arbitrary confident pass probabilities. Track skill evidence size and age.

---

# PART V — CONTENT PRODUCTION AND VERIFICATION

## 21. Create original content based on an exam blueprint

### Editorial inputs

- Verified official task-type **metadata** and official section lengths.
- CEFR can-do skill outcome for each task.
- Theme/tone appropriate to real German daily life, not direct transcription of sample exams.
- Learner A1–C2 language complexity rules.
- Licensing records for images/voices/third-party components.

### Authoring process

```text
1. Product owner selects an exam + paper blueprint
     ↓
2. Editor drafts ORIGINAL tasks and German scripts
     ↓
3. Optional AI drafts new variations (clearly unverified)
     ↓
4. JSON schema + task/answer correctness checks
     ↓
5. Qualified German teacher validates realism and difficulty
     ↓
6. Generate/record original German audio with commercial rights
     ↓
7. Native/proficient reviewer checks transcript and intelligibility
     ↓
8. Content/IP review + attribution completeness
     ↓
9. Import to Neon vercel-dev + browser/mobile UAT
     ↓
10. Review signoff for exact revision hash
     ↓
11. Publisher promotes hash to production
     ↓
12. Monitor question performance, flag problems, version corrections
```

**No “download Goethe exam PDFs → OCR them → import questions” pipeline.** Official practice papers are for comparison, human research and learner reference. If commercial content rights are later acquired, model that as a **distinct licensed asset** with approval evidence.

## 22. Automated validation gates

`pnpm exams:validate` runs before PR merge and import. Checks:

- JSON schema and all required properties
- No missing/duplicate IDs, stable content hashes, supported task types
- Counts and section/task order satisfy **the configured teacher-approved blueprint**
- No question with empty choices, duplicate visible options, missing or multiple correct answers where prohibited
- Explanation/review text exists for objective tasks
- Objective tag belongs to approved taxonomy and maps to a curriculum skill
- Audio file reference exists, playable codec and duration metadata match transcript
- `rights` proof valid; `reference_only` material not publishable
- No test exposes solutions in pre-submission response
- Full mock has approved cover, durations, scoring config, voice/writing rubric and enough content
- Source information last-checked recency policy and mandatory disclaimer
- German/Arabic/English UI and accessibility quality where translations are supplied

Automated tools **cannot certify** that a question is idiomatic, level-appropriate, fair, or equivalent to Goethe assessment. German-language/exam-experienced reviewers remain mandatory.

## 23. Manual content review checklist

Each task signoff should answer:

| Dimension          | Human QA question                                                                  |
| ------------------ | ---------------------------------------------------------------------------------- |
| Source rights      | Do we own/have suitable commercial rights for _every_ element?                     |
| German naturalness | Would a fluent speaker naturally say/read this?                                    |
| Level fit          | Is required vocabulary/grammar appropriate to target CEFR?                         |
| Skill validity     | Does the task test its intended skill, not obscure trivia?                         |
| Distractors        | Is there exactly one defensible answer where required?                             |
| Writing            | Are requested points answerable and scoring criteria transparent?                  |
| Speaking           | Does prompt work in realistic conversation, with accessible alternatives?          |
| Audio              | Does spoken script match, with natural prosody and balanced volume?                |
| Translation        | Is Arabic/English coaching accurate and kept out of strict German exam conditions? |
| Explanations       | Can the learner understand why the answer is right?                                |
| Mapping            | Do recommended follow-up lessons actually exist?                                   |

Two separate signoffs recommended for mock papers: **language/exam editor** + **publisher/legal/rights checker** (one person may hold separate roles in a tiny beta, but preserve auditable steps). Corrections create new version, never mutate a published version associated with an attempt.

## 24. Audio and media system

- Store media in R2/Vercel Blob/equivalent object storage; Neon holds object keys, duration, transcript, voice and rights records.
- Prefer German human voice actors or commercially licensed TTS with consistently reviewed output; distinct voices for dialogue turns when useful.
- Record scripts first and have teacher approval before synthesis. Use normal speed in mocks; slow/loop controls belong to practice mode.
- Check words/numbers, syllable stress, names, quality, metadata, startup latency, mobile Safari/Chrome playback.
- Test interruptions (call, tab change, dropped network) and accurately flag disrupted mock attempt.
- Never reuse downloadable Goethe model listening tracks without rights.

## 25. Administrative CMS

Implement a focused admin panel using existing Next.js UI conventions:

```text
/admin/exams
  Overview: by exam, missing assets, review status, blockers
  Exam formats: verified blueprints, source URL and checked dates
  Papers: paper list, language level, audience, paper version
  Authoring: interactive task editor and answer key editor
  Audio: upload/synthesize/review and rights metadata
  Preview: take the exam exactly as the learner sees it
  QA: per-task linguistic and format checklist
  Publishing: immutable hash + approvals + staging→production promotion
  Analytics: item difficulty, distractor performance, learner-reported errors
```

**Authoring interface is not a public content generator.** Only reviewed material may appear in scored exams. Maintain issue reporting and kill switch to unpublish faulty papers for new attempts while preserving prior records.

## 26. Connect Exam Arena to existing learning system

Keep exam progress in relational tables. Add **references** to current learner data:

- `exam_task_versions.objective_tags` links to level/grammar/skill taxonomy.
- `exam_recommendations.linked_lesson_id` references an existing published curriculum lesson.
- `exam_recommendations.linked_vocabulary_id` references existing word entry where available.
- `exam_attempts` activity can feed the existing daily progress summaries, but **avoid double-awarding XP** for replays, retries or duplicated events.
- Exam mistakes can enqueue local vocabulary and spaced review; ask before importing large word sets.
- Existing calendar planning integrates exam goals only if user opts in.
- Existing small study groups can offer _explicitly shared_ paired rehearsal; no implicit access to recordings/scores.
- Existing cloud snapshots are kept intact; do not serialize a large exam history into the snapshot on each save.

**Example end-to-end flow:**

```text
Listening: learner chooses 19:00, audio actually says 09:00
    ↓
Server scores incorrect, tags problem with `time_and_numbers`
    ↓
Report: time expression misunderstanding (not “bad at German”)
    ↓
[Play evidence clip] [Practise hours] [Go to A1 time lesson]
    ↓
Targeted mini-drill tomorrow
    ↓
Next attempt tracks improvement on the same objective
```

---

# PART VI — SHIP A1 FIRST, SCALE LATER

## 27. Proposed product phases

### Phase 0 — Audit and exam truth (3–5 days estimated)

- [ ] Inspect real Next.js routes, Drizzle schema, auth implementation, learner snapshots, speaking/audio component.
- [ ] Verify local and production deployments; record baseline tests for existing functionality.
- [ ] Freeze adult A1 official section structure, scoring rules and speaking parts with source citations and checked date.
- [ ] Record provider disclaimers and content rights policy.
- [ ] Have a German language/exam reviewer sign off on blueprint.

**Exit:** verified spec, existing architecture confirmed, task schema chosen.

### Phase 1 — Functional native exam page (1–2 weeks estimated)

- [ ] Exam Arena landing, A1 exam guide, target goal onboarding.
- [ ] Draft vs published exam-definition storage in Neon.
- [ ] A1 listening and reading mini-drill with original QA'd tasks.
- [ ] Server-side answer checking and private attempt records.
- [ ] Basic report and a working link from errors to a real existing lesson.
- [ ] Mobile, Arabic/English prep guidance, accessible keyboard flow.

**Exit:** learner can complete short original drills end-to-end and see personalized next steps; no external website is needed.

### Phase 2 — Speaking, writing and feedback (1–2 weeks estimated)

- [ ] A1 writing form + short-message editor, autosave and feedback.
- [ ] A1 oral rehearsal for 3 speaking parts with recording consent.
- [ ] Original audio assets and transcript review; private media storage.
- [ ] Feedback pipeline with pending/failed/retry states.
- [ ] Transparent limitations for automated writing/speaking assessment.
- [ ] Initial German teacher comparative evaluations.

**Exit:** four studios work as native features and give credible, actionable feedback.

### Phase 3 — One verified full A1 mock (2–3 weeks estimated, dependent on editorial production)

- [ ] Teacher-approved complete paper with correct task structure and representative coverage.
- [ ] Timing/replay/answer-lock engine + durable interrupted attempt policy.
- [ ] Reviewed scoring configuration; do not report pass-equivalence if open tasks lack evaluation.
- [ ] Full after-exam skill report, mistake bank and retry planner.
- [ ] Staging publication and exact-hash production promotion.
- [ ] Beta tests with A1 learners and a German teacher, fix confusing questions/audio.

**Exit:** one complete original independent A1 full-length practice exam whose quality is reviewed and whose limitations are explicit.

### Phase 4 — Repeatable content and business extension (ongoing)

- [ ] A1 original paper 2/3 with new questions and voices.
- [ ] A2 exam registry and content, then B1 modular engine/score rules.
- [ ] Expand B2–C2 with qualified advanced reviewers rather than a large unsupervised AI dump.
- [ ] Optional paid human writing/speaking review with verified reviewer workflow.
- [ ] Readiness analytics calibration; only introduce predictive claims if outcome data supports them.

**Effort notice:** estimates cover engineering; hiring reviewers, writing scripts, producing audio and validating full exam equivalence may extend timelines. The order matters more than the dates.

## 28. Sprint tickets / recommended coding order

```text
EXAM-001 Audit existing route/auth/DB and write adapter boundary
EXAM-002 Define Zod exam format + task schemas
EXAM-003 Drizzle migration for exam content and attempts
EXAM-004 Exam info screen + first-visit target flow
EXAM-005 A1 source-reviewed blueprint + score config
EXAM-006 Question renderer: single choice / true-false / matching
EXAM-007 Attempt create/save/submit and deterministic objective scoring
EXAM-008 Audio player + transcription/asset metadata + voice QA
EXAM-009 Original A1 Hören drill, German teacher review
EXAM-010 Original A1 Lesen drill, German teacher review
EXAM-011 Report + error-to-objective-to-lesson linkage
EXAM-012 Writing: form/email + saved draft + feedback status
EXAM-013 Speaking: original A1 Part 1/2/3 + private recordings
EXAM-014 Review workflow + rights gate + immutable publication
EXAM-015 Exact-hash stage→production importer and rollback
EXAM-016 Mock time engine + per-part restrictions
EXAM-017 Full paper validation / review signoff
EXAM-018 Exam date and daily drill planner integration
EXAM-019 Mobile/RTL/a11y/privacy/security/recovery tests
EXAM-020 Beta with teacher + learners, analytics and release gate
```

## 29. Free / Pro boundaries (proposal; not yet a billing state)

| Capability                                           | Free                           | Pro (when actually implemented)                |
| ---------------------------------------------------- | ------------------------------ | ---------------------------------------------- |
| Exam structure explorer / source explanations        | Yes                            | Yes                                            |
| Original A1 diagnostic and small daily drills        | Yes                            | Yes                                            |
| Basic attempt history and targeted lesson links      | Yes                            | Yes                                            |
| One starter original practice paper                  | Yes                            | Yes                                            |
| Additional reviewed mock banks                       | Limited sample                 | Expanded catalogue                             |
| AI writing/speaking coaching                         | Small clearly stated allowance | Larger fair-use allowance                      |
| Personalized exam calendar/advanced improvement plan | Basic                          | Enhanced                                       |
| Verified teacher assessment                          | Not included by default        | Optional add-on / separately priced if offered |

Do not put _official downloadable free Goethe tests_ behind a paywall. The paid value is the platform's **original assessed practice, feedback and progress system**. Honor existing Free commitments from the SaaS plan.

## 30. Success metrics that signal actual exam-prep value

Measure without logging private essay/voice content in analytics:

- First session: % who finish a diagnostic or first drill
- Seven-day repeat: users returning for another meaningful skill practice
- Section completion: started→submitted, drop-off and audio failure rate
- Improvement: same-objective performance on **unseen equivalent items**, not only retakes of memorized answers
- Feedback usefulness: did learner follow the recommended practice and improve?
- Teacher calibration: agreement of AI guidance with blinded teachers on approved sample answers
- Support burden: broken audio, incorrect answers, inaccessible input, inaccurate scoring reports
- Cost: storage/TTS/ASR/LLM calls per actively practising learner

Privacy-first analytics; do not store exact private spoken/written answers in event telemetry.

## 31. Quality, legal and safety acceptance checks

Release must pass all of these:

- [ ] A1 adult official exam description and **60/100 official threshold** current and sourced.
- [ ] A1 page makes the **15-minute group speaking** distinction clear.
- [ ] A2 and B1–C2 scoring configs are **not treated like A1**.
- [ ] All published questions, texts, media and explanations are original/approved licensed with evidence.
- [ ] One reviewer approves German naturalness, ambiguity, level fit; content versions immutable.
- [ ] No front-end JSON reveals correct answers to a live scored attempt.
- [ ] Attempt replay/submit/edit attacks do not modify another user's results.
- [ ] Writing/speaking grades clearly shown as independent practice estimates and can be pending.
- [ ] Transcription/voice scoring is not called a certified pronunciation score.
- [ ] A user can delete private voice recordings and export their learning data.
- [ ] Works on narrow phones; keyboard navigation, readable contrast, RTL Arabic coaching.
- [ ] Audio failures and disconnected exam attempts have humane recovery behavior.
- [ ] Existing vocabulary, daily XP, user backups, study-space permissions remain intact.
- [ ] Unreviewed content and reference-only sources never reach published mocks.
- [ ] Staff can disable a bad paper for new attempts without erasing past results.
- [ ] Tested on `vercel-dev`, then published exact approved hash to Neon `production`.
- [ ] No claim of Goethe certification, affiliation, exact prediction or guaranteed passing.

---

# PART VII — CONCRETE FIRST DEMONSTRATION

## 32. One seamless five-minute feature demonstration

**Demo learner:** studying Menschen A1.1, target eventually A1 adult.

1. Opens **Exam Arena**: sees `A1 Start Deutsch 1` and four skills with clear exam overview.
2. Clicks **Start 5-minute Hören practice**.
3. Hears original platform-owned audio announcing a class time.
4. Answers two or three original questions; one is wrong.
5. Report explains exactly which expression was missed and plays a short original evidence snippet.
6. Taps **Learn this now** → opens an actual level-appropriate existing lesson or a reviewed targeted exercise.
7. Does 2 flashcards/dictation items; progress records objective practiced.
8. Returns to Exam Arena: next practice shown, no unsupported `ready to pass` claim.
9. Learner can also rehearse **self-introduction** with own voice and save progress privately.

This demo already demonstrates the product's advantage over a PDF resource page: **native exam task → diagnostic feedback → targeted teaching → repeated practice**.

## 33. Decisions before coding

Confirm in code review rather than assuming:

1. Where existing lesson IDs/objective taxonomy currently live; whether they are client JSON or tables.
2. Current authenticated user ID source and admin authorization model.
3. Storage provider and speech/LLM APIs currently used and their commercial/privacy terms.
4. Whether beta exam recordings are retained, and for how long.
5. Who can linguistically review adult A1 tasks and scoring guidance.
6. Which exact set of Goethe exam formats to support first (recommended **A1 adult only**, not youth variants).
7. Expected cost ceiling for ASR, TTS and writing/speaking feedback.
8. Whether human-graded feedback is in scope for paid launch or phase two.

## 34. Minimum content requirements before describing a "full mock"

No arbitrary question count in this plan should be treated as Goethe's actual task breakdown. For **each specific exam/variant**, the editorial owner must document a verified blueprint with:

- Official task count, section/part count, order and instructions (factual metadata)
- Assessment targets / topic coverage, audio play requirements
- Published section time, prep time and oral format
- Scoring interpretation and limitations of original practice scoring
- All original tasks, audio, options, correct keys, explanations, rubric
- Teacher reviewed test balance and distractor quality
- Frozen immutable paper version

If any area is missing: publish as `practice set` or `section drill`, **not a complete realistic timed mock**.

---

# FINAL RECOMMENDATION

Build **A1 adult Exam Arena as a first-class part of Deutsch Journey**, not a detached micro-site. The first release should have A1 exam guidance, genuine original in-app exercises in all four skills, private attempts, useful feedback, and an immediate link from each weakness to the learner's existing course. Once a complete original paper has passed qualified human review, enable a full timed mock. Expand to A2–C2 with a reusable definition-based engine and distinct scoring rules.

**North star:** _Don't just tell users what the Goethe exam is. Help them practise, understand their mistakes and speak more confidently when exam day arrives._

---

## Source bibliography and review notes

Official information and major content policies consulted on 14 October 2026. Recheck before publication:

1. Goethe official exam-training hub — https://www.goethe.de/en/spr/prf/ueb.html
2. Goethe A1 exams and practice — https://www.goethe.de/en/m/spr/prf/ueb/pa1.html
3. Goethe A1 adult format — https://www.goethe.de/ins/de/de/prf/gzsd1.cfm
4. Goethe A1 Sprechen components — https://bfu.goethe.de/a1_sd1/sprechen.php
5. Goethe A2 practice — https://www.goethe.de/ins/us/en/spr/prf/ueb/pa2.html
6. Goethe B1 practice — https://www.goethe.de/ins/us/en/spr/prf/ueb/pb1.html
7. Goethe B1 speaking structure — https://bfu.goethe.de/b1_mod/sprechen.php
8. Goethe B2 exam format — https://www.goethe.de/ins/de/en/prf/gzb2.cfm
9. Goethe C2 format — https://www.goethe.de/ins/de/en/prf/gzc2.cfm
10. Goethe scoring for all levels — https://www.goethe.de/en/spr/prf/pes.html
11. Goethe accessible practice — https://www.goethe.de/en/spr/prf/ueb/bpf.html
12. Goethe general terms/copyright — https://www.goethe.de/resources/files/pdf313/agb_en.pdf
13. CEFR companion volume — https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions
14. ZUM open-material policies — https://deutsch-lernen.zum.de/wiki/%C3%9Cber_ZUM_Deutsch_Lernen
15. Tatoeba downloads/licensing overview — https://tatoeba.org/en/downloads
16. Wikidata licensing — https://www.wikidata.org/wiki/Wikidata:Licensing

**Note:** Independent platform use of the descriptive word “Goethe” should remain factual and non-misleading. Avoid treating Goethe marks, logos, exam design and exam materials as the SaaS's own intellectual property. Have counsel review trademark/marketing details before a substantial commercial release.
