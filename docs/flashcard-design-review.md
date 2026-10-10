# Flashcard design review

Full review of the flashcard launch screen, question/answer cards, recall form, rating controls, completion and empty states. The implementation uses Next.js, React, TypeScript and the project's existing plain CSS system. Changes are scoped by `.review-page`; the CardSwap engine and spaced-repetition algorithm are unchanged.

| Category    | Evidence inspected                                                                 | Result                                                                          |
| ----------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Typography  | Launch heading, word, answer, status and captions at 320, 390, 760 and 1440 pixels | Clear after hierarchy and wrapping changes                                      |
| Surfaces    | Light/dark launch, preview, cards, buttons, forms and rating controls              | Clear after glass, shine and touch-target changes                               |
| Animations  | Button hover/press, reduced-motion CSS, existing CardSwap grading                  | Only short button transitions added; press checked at 10% playback              |
| Icons       | Launch, reveal, audio and four ratings                                             | Consistent Lucide icons; decorative rating icons excluded from accessible names |
| Performance | Scoped stylesheet and preview markup                                               | CSS reflections, no new dependency, animation timer or rendering canvas         |

All findings below were resolved.

| Severity | Location                        | Before                                                              | After                                                                               | Why                                                                        |
| -------- | ------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Medium   | `src/components/review.tsx:101` | Centered icon and generic text panel                                | Memory-focused heading, visible ready count and decorative German card preview      | Makes the session purpose and available work clearer                       |
| Medium   | `src/components/review.tsx:168` | Select and actions mixed in one wrapping row                        | Labeled mode selector and ordered primary/secondary actions, stacked on phones      | Clear action hierarchy and comfortable hit areas                           |
| Medium   | `src/components/review.tsx:42`  | Start enabled when any word was due, even if none matched noun mode | Count and disabled controls use eligible words; useful empty/no-noun guidance       | Prevents an empty session from appearing completed                         |
| Low      | `src/app/review.css:21`         | Flat launch panel                                                   | Lavender/blue glow, white reflection, inset highlight and layered shadow            | Shine and elevation follow the app's existing palette                      |
| Low      | `src/app/review.css:184`        | Flat primary, reveal and recall buttons                             | Glossy purple buttons, visible focus, restrained hover and 0.96 press scale         | Gives clear, tactile feedback without continuous motion                    |
| Low      | `src/app/review.css:254`        | Plain white study card                                              | Soft blue reflection, lit edge, refined typography and answer separator             | Distinguishes the question and revealed answer while keeping text readable |
| Medium   | `src/app/review.css:293`        | Small unframed audio control                                        | 44-pixel glossy audio button and 44-pixel recall field                              | Supports touch use and makes the audio action easier to find               |
| Medium   | `src/components/review.tsx:354` | Four ratings without an explanatory heading                         | Recall-rating prompt, icons, colored glass surfaces and two columns on small phones | Explains the decision and improves button recognition                      |
| Low      | `src/components/review.tsx:222` | Flat completion panel                                               | Soft mint completion surface and matching primary action                            | Completes the same visual flow                                             |

| Location             | Considered candidate                        | Rejected because                                                        |
| -------------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| Launch/card surfaces | Animated glitter or a repeating sheen sweep | Would repeatedly compete with reading and recall                        |
| Launch card preview  | Another WebGL renderer                      | Static CSS supplies the requested shine with less loading work          |
| Mode selector        | Replace the select with a custom dropdown   | The native labeled control keeps keyboard and mobile selection familiar |

Verification: `npm run build`, `npm run lint`, existing flashcard browser tests and browser previews. Preview checks cover start, question, answer, rating, keyboard focus, mode selection, wrong-answer disabled ratings and serious/critical accessibility violations in both themes at 320/390/760/1440 pixels. Empty, caught-up and no-noun states were checked separately. The button press transition was inspected at 10% playback through the browser's animation controls. Screenshots are in `artifacts/shiny-review/`.

Verdict: Approve after verification. Changes preserve reveal-and-rate progression, repeat queues, recall validation, scheduling and XP. No unverified changes to the grading animation or scheduling algorithm are included.
