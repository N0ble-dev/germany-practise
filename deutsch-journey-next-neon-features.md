# Deutsch Journey — Next.js + Neon DB

## Overview

**Deutsch Journey** is a personal German learning platform designed for beginners studying **Menschen A1.1**.

The goal is to help the learner connect vocabulary with real sentences, listening, speaking, games, and everyday situations in Germany instead of memorizing isolated words.

---

## Tech Stack

### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons

### Backend
- Next.js Server Actions / Route Handlers
- Neon PostgreSQL
- Drizzle ORM or Prisma
- Zod validation

### Authentication
- Clerk or Better Auth

### Optional AI
- OpenAI API for:
  - Sentence generation
  - Conversation practice
  - Grammar explanations
  - Vocabulary examples
  - Exercise generation

---

# Core Features

## 1. Authentication

Users can:

- Create an account
- Login / logout
- Continue learning from any device
- Save personal progress
- Save vocabulary
- Save lesson progress

---

# 2. Dashboard

The dashboard should show:

- Current German level
- Current Menschen lesson
- Daily learning goal
- Daily XP
- Learning streak
- Number of learned words
- Words waiting for review
- Flashcards reviewed today
- Speaking attempts
- Listening exercises completed
- Recent learning activity

Example:

```text
Guten Abend, Nabil 👋

Level: A1.1
Current Lesson: Menschen Lektion 3

Today's Goal
████████░░ 80%

Words Learned: 124
Review Today: 18
Streak: 7 Days
XP: 460
```

---

# 3. Menschen Course Structure

The platform should organize learning according to the **Menschen A1.1** book.

Structure:

```text
A1.1
├── Lektion 1
├── Lektion 2
├── Lektion 3
├── Lektion 4
├── Lektion 5
├── Lektion 6
├── Lektion 7
├── Lektion 8
├── Lektion 9
├── Lektion 10
├── Lektion 11
└── Lektion 12
```

Each lesson can contain:

- Vocabulary
- Grammar
- Useful expressions
- Listening exercises
- Speaking exercises
- Flashcards
- Mini games
- Notes
- Quiz
- Lesson progress

---

# 4. Vocabulary Bank

Users can add vocabulary from the Menschen book.

Each vocabulary item should include:

- German word
- English meaning
- Arabic meaning
- Word type
- Article
- Plural
- Example sentence
- Topic
- Menschen lesson
- Personal memory hint
- Difficulty
- Learning status
- Last reviewed date

Example:

```text
German: der Bahnhof

English:
Train station

Arabic:
محطة القطار

Plural:
die Bahnhöfe

Lesson:
Lektion 3

Example:
Wo ist der Bahnhof?
```

---

# 5. Smart Word Input

When the learner adds a word, the app can automatically suggest:

- Article
- Plural
- Translation
- Word type
- Example sentence
- Pronunciation
- Related words

Example:

User adds:

```text
Bahnhof
```

The system suggests:

```text
der Bahnhof
die Bahnhöfe
train station
محطة القطار
```

---

# 6. Sentence Generator

The learner chooses one or more saved words.

The system generates useful **A1-level sentences**.

Example word:

```text
Bahnhof
```

Generated sentences:

```text
Wo ist der Bahnhof?

Der Bahnhof ist dort.

Ich fahre zum Bahnhof.
```

Users can:

- Listen to the sentence
- Save the sentence
- Translate it
- Add it to flashcards
- Practice pronunciation
- Generate another example

---

# 7. Sentence Builder Game

The app shows shuffled words.

Example:

```text
Bahnhof / der / Wo / ist
```

The learner must build:

```text
Wo ist der Bahnhof?
```

The app checks the answer and explains mistakes.

---

# 8. Flashcards

Flashcards should use saved vocabulary.

Front:

```text
der Bahnhof
```

Back:

```text
Train station
محطة القطار

Wo ist der Bahnhof?
```

Actions:

- Again
- Hard
- Good
- Easy

Flashcards should support spaced repetition.

---

# 9. Spaced Repetition

The system should calculate when a word should appear again.

Example statuses:

- New
- Learning
- Difficult
- Reviewing
- Mastered

The review date should be stored in Neon DB.

---

# 10. Listening Practice

The learner listens to:

- Words
- Sentences
- Mini conversations
- Questions
- Menschen lesson vocabulary

Listening modes:

### Normal Speed

Natural German pronunciation.

### Slow Speed

Slower pronunciation for beginners.

### Listen Without Text

The learner hears the sentence before seeing it.

---

# 11. Listening Dictation

The learner hears:

```text
Ich komme aus Ägypten.
```

The learner types what they heard.

The app compares the answer and highlights mistakes.

Example:

```text
Expected:
Ich komme aus Ägypten.

Your answer:
Ich komme aus Egypten.
```

The app highlights:

```text
Ägypten
```

---

# 12. Speaking Practice

The learner listens to a sentence and repeats it.

Example:

```text
Ich lerne Deutsch.
```

The app records or captures speech and evaluates:

- Recognized text
- Missing words
- Incorrect words
- Pronunciation similarity
- Speaking attempts

Possible result:

```text
Accuracy: 86%

Sehr gut!

Try again:
Deutsch
```

---

# 13. Shadowing Mode

The learner listens and speaks together with the audio.

Steps:

1. Listen only
2. Listen while reading
3. Repeat after audio
4. Speak together with audio
5. Speak without text

---

# 14. Germany Mode

Vocabulary should be connected to real situations in Germany.

Example categories:

- Bäckerei
- Bahnhof
- Flughafen
- Café
- Restaurant
- Supermarkt
- Apotheke
- Hotel
- Universität
- Wohnung
- Bus
- U-Bahn

Example challenge:

```text
You are inside a bakery.

You want two bread rolls.

What should you say?
```

Options:

```text
A. Zwei Brötchen, bitte.
B. Wo ist der Bahnhof?
C. Ich heiße Nabil.
```

Correct answer:

```text
Zwei Brötchen, bitte.
```

---

# 15. Germany Memory Cards

Visual cards connect German vocabulary with places.

Example:

```text
🥐 Bäckerei

das Brot
das Brötchen
der Kuchen

Useful sentence:

Ich möchte zwei Brötchen, bitte.
```

---

# 16. Mini Games

## Match Game

Match German words with translations.

Example:

```text
Bahnhof → Train station
Apfel → Apple
lernen → Learn
```

---

## Memory Game

Cards appear face down.

The learner matches:

```text
der Bahnhof
```

with:

```text
Train station
```

---

## Article Game

The learner chooses:

```text
___ Bahnhof
```

Options:

```text
der
die
das
```

Correct:

```text
der Bahnhof
```

---

## Translation Challenge

Show:

```text
I learn German.
```

Learner writes:

```text
Ich lerne Deutsch.
```

---

## Missing Word

```text
Ich ___ Deutsch.
```

Options:

```text
lerne
lernst
lernen
```

---

# 17. Grammar Section

Grammar topics can be connected to Menschen lessons.

Examples:

- Personal pronouns
- sein
- haben
- Verb conjugation
- W-Fragen
- Ja/Nein Fragen
- Articles
- Accusative
- Possessive articles
- Modal verbs
- Word order
- Numbers
- Time
- Negation

Grammar explanations should be beginner friendly.

Support:

- English explanation
- Arabic explanation
- German examples

---

# 18. Grammar Practice

Example:

```text
Ich ___ Deutsch.

A. lerne
B. lernst
C. lernen
```

Correct:

```text
Ich lerne Deutsch.
```

---

# 19. AI German Tutor

The user can chat with an AI German tutor.

Possible modes:

### Explain

```text
Why is it "der Bahnhof"?
```

### Correct My Sentence

```text
Ich bin gehen Bahnhof.
```

AI correction:

```text
Ich gehe zum Bahnhof.
```

### Give Examples

```text
Give me 5 A1 examples using "essen".
```

### Explain in Arabic

The learner can ask grammar questions in Arabic.

---

# 20. AI Conversation Practice

The learner can select situations.

Examples:

- Introduce yourself
- At a bakery
- At a café
- Buying a train ticket
- Asking for directions
- At a supermarket
- Meeting a new friend

Example:

```text
AI:
Guten Tag! Was möchten Sie?

User:
Ich möchte einen Kaffee.

AI:
Natürlich. Möchten Sie auch etwas essen?
```

The AI should keep the conversation around the learner's current A1 level.

---

# 21. Mistake Tracking

The app should remember common mistakes.

Example:

```text
Frequent mistake:
der / die / das

Words commonly answered incorrectly:
- der Bahnhof
- die Wohnung
- das Brot
```

This information can be used to create personalized exercises.

---

# 22. Favorites

Users can favorite:

- Words
- Sentences
- Grammar notes
- Exercises
- Germany scenarios

---

# 23. Personal Notes

Each word or lesson can have personal notes.

Example:

```text
"Bahnhof reminds me of Cairo train station."
```

Personal associations help memory.

---

# 24. Search

Search across:

- Vocabulary
- Sentences
- Grammar
- Menschen lessons
- Saved notes

Example:

```text
Search: fahren
```

Results:

```text
fahren
Ich fahre nach Berlin.
Wir fahren mit dem Zug.
```

---

# 25. Learning Progress

Track progress per lesson.

Example:

```text
Lektion 1    100%
Lektion 2     85%
Lektion 3     60%
Lektion 4      0%
```

---

# 26. XP System

Actions can give XP.

Example:

| Action | XP |
|---|---:|
| Add vocabulary | +2 |
| Review flashcard | +1 |
| Correct flashcard | +2 |
| Complete listening | +3 |
| Speaking practice | +3 |
| Complete lesson | +20 |
| Daily goal | +10 |

---

# 27. Learning Streak

Track consecutive study days.

Example:

```text
🔥 12 Day Streak
```

Streak updates when the learner completes a minimum daily activity.

---

# 28. Daily Learning Goal

User can select goals such as:

```text
Casual
10 minutes

Normal
20 minutes

Serious
30 minutes
```

Daily goals can include:

```text
10 vocabulary reviews
5 sentences
5 minutes listening
3 speaking exercises
```

---

# 29. Daily Review

Automatically generate a review session containing:

- Difficult vocabulary
- Old vocabulary
- Recent vocabulary
- Listening
- Speaking
- One mini game

Example:

```text
Today's Review

12 words
3 sentences
2 listening exercises
1 speaking challenge
```

---

# 30. Lesson Quiz

Each Menschen lesson can end with a quiz.

Quiz types:

- Vocabulary
- Grammar
- Listening
- Sentence building
- Translation
- Articles

---

# 31. Achievements

Examples:

```text
First 50 Words

100 Words Learned

7 Day Streak

First Perfect Listening

A1 Explorer

Sentence Builder

German Speaker
```

---

# 32. Profile

Profile page can show:

- Name
- Level
- Current Menschen lesson
- Total XP
- Streak
- Words learned
- Speaking attempts
- Listening exercises
- Completed lessons
- Achievements

---

# Neon Database

Suggested database entities.

## users

```text
id
name
email
current_level
current_lesson
xp
streak
created_at
updated_at
```

---

## vocabulary

```text
id
user_id
german
english
arabic
article
plural
word_type
topic
lesson_id
difficulty
status
personal_hint
created_at
updated_at
```

---

## sentences

```text
id
user_id
vocabulary_id
german
english
arabic
is_favorite
created_at
```

---

## flashcard_reviews

```text
id
user_id
vocabulary_id
rating
next_review_at
reviewed_at
```

---

## lessons

```text
id
level
lesson_number
title
description
```

---

## lesson_progress

```text
id
user_id
lesson_id
progress
completed
completed_at
```

---

## speaking_attempts

```text
id
user_id
sentence_id
recognized_text
accuracy
created_at
```

---

## listening_attempts

```text
id
user_id
sentence_id
answer
accuracy
created_at
```

---

## user_activity

```text
id
user_id
activity_type
xp
created_at
```

---

## achievements

```text
id
name
description
icon
xp_reward
```

---

## user_achievements

```text
id
user_id
achievement_id
earned_at
```

---

# Main Application Pages

```text
/
├── dashboard
├── lessons
│   └── [lessonId]
├── vocabulary
├── sentences
├── review
├── flashcards
├── listening
├── speaking
├── grammar
├── games
├── germany
├── ai-tutor
├── progress
└── profile
```

---

# Suggested Navigation

```text
Dashboard

Learn
├── Menschen Lessons
├── Vocabulary
├── Grammar
└── Sentence Lab

Practice
├── Flashcards
├── Listening
├── Speaking
└── Games

Explore
├── Germany Mode
└── AI Tutor

Progress
```

---

# Main Goal

The platform should follow this learning cycle:

```text
LEARN
↓
CONNECT
↓
LISTEN
↓
SPEAK
↓
PLAY
↓
REVIEW
↓
USE
```

Instead of learning German words individually, the learner should continuously connect:

```text
Word
+
Sentence
+
Sound
+
Situation
+
Memory
+
Repetition
```

The final product should feel like a **personal companion for the Menschen A1.1 journey**, not simply another vocabulary application.
