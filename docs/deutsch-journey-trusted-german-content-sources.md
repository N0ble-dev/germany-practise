# Deutsch Journey — German Content Source Audit (A1–C2)

**Researched:** October 2026  
**Purpose:** Select trustworthy, structured German-learning sources suitable for curriculum planning, learner links, and legally compliant import into a commercial Next.js + Neon SaaS.

> **Critical:** “Free for students” does not mean “may be copied to a paid SaaS.” Review each exact page/file/media license, author attribution, terms of service, and technical access conditions. This source survey is not legal advice. CEFR-level coverage means the site offers some resources at those levels, not necessarily a complete course at every level.

## A. Level-organized teaching platforms

| Resource                             | Levels                                                 | Material                                                               | SaaS approach                                                                                                                                                   | Official URL                                               |
| ------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **ZUM Deutsch Lernen**               | A1–C2                                                  | Learning paths, grammar, H5P exercises, topic-based tasks              | **Selective import possible**: site is generally CC BY 4.0; check every specific page, embedded resource, and media license                                     | https://deutsch-lernen.zum.de/wiki/Hauptseite              |
| **Goethe Deutsch für dich**          | A1–C2                                                  | Grammar, vocabulary, reading, listening exercises                      | **Reference/link**, permission required before reposting exercises, audio or media                                                                              | https://www.goethe.de/prj/dfd/en/home.cfm                  |
| **vhs-Lernportal**                   | A1–C1 (some advanced courses specifically job-related) | Comprehensive A1, A2, B1 courses, work-language and C1 Beruf           | **Reference/link**; no verified bulk commercial reuse rights                                                                                                    | https://www.vhs-lernportal.de/wws/kursangebot.php          |
| **DW Learn German**                  | A1–C1, plus selected additional resources              | News, stories, videos, listening, courses                              | **Reference/link**; do not automatically reproduce videos, transcripts, audio                                                                                   | https://learngerman.dw.com/                                |
| **deutsch.info**                     | A1–B2                                                  | 4 structured courses, grammar, media, living in Germany/Austria        | **Reference/link**: default site copyright notice CC BY-NC-SA 4.0 (non-commercial) unless otherwise marked. Specific new OER may differ; check item-level terms | https://deutsch.info/?hl=en                                |
| **DeutschAkademie Grammar Trainer**  | A1–C1                                                  | Topic/level-organized grammar exercises                                | **Reference/link**; commercial content import not established                                                                                                   | https://www.deutschakademie.de/en/online-german-courses-1/ |
| **SCHUBERT Verlag online exercises** | A1–C1 observed in indexed exercises                    | Progression-based grammar, exercises, downloadable personal study PDFs | **Link only**; explicitly forbids commercial reuse, collections and republishing on other sites                                                                 | https://www.aufgaben.schubert-verlag.de/                   |

### Source and license proof

- ZUM description & default license: https://deutsch-lernen.zum.de/wiki/%C3%9Cber_ZUM_Deutsch_Lernen
- ZUM structured subject areas by level: https://deutsch-lernen.zum.de/wiki/Handlungsfelder
- ZUM structured learning paths: https://deutsch-lernen.zum.de/wiki/Lernpfade
- Goethe A1-C2 exercises: https://www.goethe.de/prj/dfd/en/home.cfm
- vhs course catalog (also has topic & grammar overview PDF per A1/A2/B1): https://www.vhs-lernportal.de/wws/kursangebot.php
- deutsch.info courses: https://deutsch.info/?hl=en
- deutsch.info copyright / default NC license notice: https://deutsch.info/deutsch2024
- SCHUBERT explicit restrictions: https://www.aufgaben.schubert-verlag.de/nutzung.htm
- DeutschAkademie A1-C1: https://www.deutschakademie.de/en/online-german-courses-1/
- DW externally summarized course level breadth: https://deutsch-lernen.zum.de/wiki/Portale_und_Sammlungen_%28Materialien%29

## B. Selectively reusable open educational content

| Resource                                    | Best fit                                                                 | License / considerations                                                                                                       | Link                                          |
| ------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **ZUM Deutsch Lernen**                      | Grammar, practice activities, learning sequences A1–C2                   | Generally **CC BY 4.0**; attribution + source/license link + modification notice, individual assets may differ                 | https://deutsch-lernen.zum.de/wiki/Hauptseite |
| **Kultur und Sprache (Austrian education)** | Culture, Austrian German, listening/reading/speaking classroom materials | Original contents generally **CC BY-SA 4.0**, except otherwise indicated; check third-party media; share-alike for adaptations | https://www.kulturundsprache.at/oer           |
| **ondaz**                                   | Topic-specific grammar and interaction, mainly B2/C1 with some A2/B1     | ZUM classifies some ondaz material CC BY 4.0, but verify each target item/source license directly before importing             | https://ondaz.de/                             |

References:

- https://www.kulturundsprache.at/oer
- https://deutsch-lernen.zum.de/wiki/OER-Materialien
- https://creativecommons.org/licenses/by/4.0/
- https://creativecommons.org/licenses/by-sa/4.0/

**Caution:** ZUM's resource lists also link to third-party materials that are explicitly noncommercial. A ZUM link does not make the external file open-license.

## C. Reusable German language DATA (not ready-made CEFR courses)

| Dataset                               | What it provides                                                 | Rights                                                                              | Import plan                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Tatoeba**                           | German sentences, bilingual pairs, some audio                    | Text mostly **CC BY 2.0 FR**; some text CC0; recordings have **per-audio licenses** | Download German+English / German+Arabic sentence pairs, filter, verify, tag by level           |
| **Wikidata Lexemes**                  | Structured language data and lexical facts                       | **CC0** for structured data                                                         | Extract only useful German lexemes and forms, then linguistic QC                               |
| **Wiktionary via Kaikki/Wiktextract** | Machine-readable German vocabulary, meanings, morphology, senses | **CC BY-SA/GFDL** from Wiktionary; share-alike and attribution complexity           | Stage in a separate import table; check individual quality; track source and reuse obligations |

Primary references:

- https://tatoeba.org/en/downloads
- https://en.wiki.tatoeba.org/articles/show/faq
- https://www.wikidata.org/wiki/Wikidata:Licensing
- https://www.wikidata.org/wiki/Help:Data_access
- https://kaikki.org/dewiktionary/
- https://kaikki.org/dewiktionary/rawdata.html

**Do not assume:** Tatoeba sentences are CEFR-tagged, accurate, or natural just because they exist in a downloadable corpus. Do not assume Wiktionary yields a neatly validated A1 vocabulary table. Build a curation step.

## D. Recommended division of labor for Deutsch Journey

- **Curriculum outcomes, Goethe exam expectations:** official Goethe + CEFR.
- **Structured openly licensed learning material:** ZUM first.
- **Extra review activities / Austrian-German culture:** Kultur und Sprache, item-by-item.
- **Vocabulary augmentation:** Wikidata CC0, optionally Wiktionary extraction with attribution/share-alike management.
- **Example sentence augmentation:** Tatoeba CC0/CC BY with attribution; teacher-review before publishing.
- **Audio:** ideally create your own with commercially licensed TTS and German-speaking human QC; third-party audio needs separate rights.
- **A1–C1 teaching patterns and lesson quality checks:** VHS, DeutschAkademie, DW, deutsch.info and SCHUBERT as **references**, not content sources to copy.
- **C2:** CEFR + Goethe objectives + selective open-source examples, then commission original expert-authored texts and assessments. No fully ready-to-import C2 commercial curriculum was verified in this audit.

## E. Suggested Neon schema

```text
content_sources
  id, name, homepage_url, default_license,
  terms_url, license_checked_at, import_method,
  allowed_use, review_notes

source_assets
  id, source_id, source_item_url, author, license,
  license_url, attribution_text, license_verified_at,
  media_type, checksum, review_status

curriculum_units
  id, cefr_level, module_slug, lesson_slug,
  skill, topic, can_do_statement, order_index

content_items
  id, unit_id, content_type, title, json_content,
  source_asset_id_nullable, review_status, revision,
  reviewed_by, published_at

audio_assets
  id, content_item_id, file_url, transcript,
  voice_id, license, native_checked_at

content_reviews
  id, item_id, item_revision, reviewer_id,
  linguistic_score, cefr_fit, copyright_ok,
  audio_ok, approved_at
```

## F. Import flow

1. **Catalog** approved exact URLs/dataset items and capture license + author metadata.
2. **Fetch** via documented API, legal download endpoint, or manual authoring; respect terms and rate limits.
3. **Normalize** to a versioned schema independent of the original site.
4. **Deduplicate** by normalized German text and source ID.
5. **Enrich** with article/plural, English/Arabic translations, CEFR estimate, learning objective, difficulty; label AI output as unverified.
6. **Validate** schema, correctness of answer keys, dependency and license compatibility.
7. **Teacher review** for grammar, level, translations, dialogue naturalness and exercise ambiguity.
8. **Audio creation/verification** in separate object storage.
9. **Staging** publish to Neon `vercel-dev`; test Next.js pages and quizzes.
10. **Promotion** of immutable, reviewer-approved version to production; never assume Neon child branches auto-sync content in either direction.
11. **Attribution** display author, origin URL, license link, and modifications wherever required.
12. **Audit** periodically for source updates and revoked/deleted links; publish corrections via a revision.

## G. First proof of concept

**A1.1 — Introductions**

- Establish 1 outcome: learner can introduce themselves and ask basic personal questions.
- Source a CC BY grammar explanation or activity from ZUM with exact metadata.
- Prepare 12 original reviewed vocabulary entries and 8 original example sentences.
- Generate one 6-turn German dialogue, add English/Arabic translations.
- Record or synthesize and review audio.
- Add 8 exercise items: matching, article, sentence builder, dictation, speaking prompt.
- Publish to staging; check all activity answers and displayed source attributions.
- Human reviewer approves exact revision; publish that revision to production.

**Success means a repeatable, legal, reviewed publishing flow—not the number of scraped pages.**

## Bottom line

There is **no single source verified here that provides a complete, commercially importable, machine-readable, academically reviewed German course covering every part of A1–C2**. Use a combination of open teaching materials, open data and original teacher-reviewed course content.
