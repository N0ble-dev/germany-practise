# German for your own life

The book journey and profile share one preferences editor. Learners choose from 13 jobs or study roles, with separate German word forms, or enter a custom profession. Five reasons for learning, six interests, and eight everyday situations connect the page to their own lives.

The lavender “Me, in German” card is the signature: it uses the learner's real details and chosen interests, with a small German flag accent. No sample city, country, or profession appears in this introduction. The existing Plus Jakarta Sans headings and Nunito Sans body text sit on the app's white/dark surfaces, using lavender, mint, and the established primary color tokens.

```text
German for your own life                     Edit my preferences
[ Me, in German: my sentences ]              [ Lessons for my day ]

Expanded editor:
[ reason, job, place, interests, moments ]    [ live German preview ]
Cancel                                      Save my learning details
```

The editor replaces both older personal details forms. Saving keeps the preferences in the existing account-scoped learning snapshot; JSON backups and explicit cloud saves carry them. Older snapshots receive empty defaults for the new choices. Nothing changes chapter progress or awards XP for choosing preferences.

Saved professions personalize the existing book sentence exercises. Student roles use “Ich studiere.” or “Ich gehe zur Schule.” in place of an employment sentence. Selected interests add useful sentences to lesson 7. Everyday moments point to matching lesson patterns; the learner's selected situations take priority over suggestions from their reason for learning. The introduction can be heard using the existing browser speech feature, or saved to the sentence notebook without duplicates. The PDF overview includes readable preference labels.

Preferences are excluded from the public learner card, which continues to use its separate explicit sharing fields.

## Today and practice support

Today places a compact lavender personal life card after the daily plan and before the chapter continuation. This connects daily actions to the learner's reason for learning without adding another setup form to the dashboard. It shows their job and interests, one personal German sentence with audio, an appropriate practice link, and a quiet link to change their preferences. New learners see a clear invitation to choose their details.

The vocabulary hint sits between the collection summary and the word controls, encouraging useful words for a selected everyday moment. The sentence lab hint sits before its word-pattern exercise and offers a personal starting sentence that can be saved directly. Speaking and listening hints sit in the support rail; their copy explicitly describes a separate activity after the current exercise, so the hint does not reveal or replace the exercise target. On phones that support rail follows the main activity.

The featured sentence links to the lesson that practices its pattern: introductions in lesson 1, professions in lesson 2, interests in lesson 7. Vocabulary hints instead follow the selected everyday situation. Keeping a personal sentence is bounded by the existing notebook limit, does not add duplicates, and awards no XP.

## Interface review

Full review of the preferences editor in its two placements, the Today card, and hints on vocabulary, sentences, speaking and listening pages. Next.js/React with the existing plain CSS and theme tokens; no new UI or animation dependency.

| Category    | Evidence inspected                                                 | Result                                                                                                 |
| ----------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Typography  | Empty, selected and editing states; desktop and phone screenshots  | Clear; balanced heading and wrapping for custom German details                                         |
| Surfaces    | Theme tokens, input and button areas, cards at 320/390/1440 pixels | Clear; 44px touch areas and visible selected borders                                                   |
| Animations  | CSS interactions and reduced motion rule                           | Clear; only short color/border transitions, no entrance or rearrangement motion                        |
| Icons       | Goal, interest, situation and action controls                      | Clear; one Lucide icon set, currentColor, decorative icons hidden from assistive technology            |
| Performance | Client boundary, derived previews and editor lifetime              | Clear; synchronous local choices, no requests on selection, editor remounts for changed saved profiles |

No actionable interface-polish findings. A second decorative gradient was rejected because the German introduction already gives the section its identity. Automatic saving was rejected because learners need to explore choices and cancel without changing their notebook. Animated chip entrances were rejected because selection is frequent and static state feedback is sufficient.

Verification covers backward-compatible snapshots, bounded and unique choices, custom professions, natural student sentences, preference report labels, live previews, cancellation/focus, save/reload, sentence deduplication, relevant book practice, PDF export and account privacy. Accessibility checks found no serious or critical violations in the editor at 320/390/1440 pixels in either theme. Browser speech uses the existing speech implementation; audible voice quality on a real device is not verified.

Final checks:

- `npm test -- --maxWorkers=2`: 109 tests passed. Two workers avoid a local memory allocation failure seen with unrestricted parallelism.
- `npm run build`: passed, including production TypeScript checks and static page generation.
- `npm run lint`: passed.
- Targeted `prettier --check`: passed.
- `playwright test --config=.cache/social-playwright.config.ts --workers=1 tests/e2e/personal-life.spec.ts`: three browser flows passed, including Today, four practice pages, profile editing and editor cancellation. Today and the editor were checked at 320/390/1440 pixels; hints at 320/1440 pixels, with both themes. No serious or critical accessibility violations or horizontal overflow.
- Seven existing profile browser checks passed across the original run and a targeted rerun, including logout/account privacy, real PDF export, and learner card views. The logout assertion now matches its specific error message rather than every alert on the page.
- Viewed screenshots of the introduction, editor, Today card and hint placements. Artifacts live under `artifacts/personal-life-*.png`.

Verdict: Approve. Real-device speech voice quality remains unverified.
