# Deutsch Journey design decisions

The product’s job is to help a beginner return to German regularly and connect a word to its sound, sentence, and use. The main screen gives one immediate practice action, a short balanced daily plan, and a current chapter.

## Visual direction

- Cloud gray `#f4f6f8` for the workspace and white `#ffffff` for study surfaces.
- Ink blue `#283549` for text and slate `#58677e` for supporting text.
- Muted violet `#6a5acb` for actions and active navigation.
- Pale blue `#e9ecfa` for the single illustrated welcome panel.
- Soft mint `#e8f3ee` for successful practice and real-world exploration.
- Plus Jakarta Sans for headings and Nunito Sans for the learning UI, hosted locally.

The memorable element is a compact Berlin illustration beside the daily invitation. The rest of the interface stays quiet: list rows for daily practice, a book treatment for the current lesson, and a narrow support rail. Cards vary by purpose and hierarchy rather than repeating one generic treatment everywhere.

```text
Navigation | Greeting and daily invitation          | Daily intention
           | Collection summary                    | Word to revisit
           | Three small practice steps             | Memory encouragement
           | Current chapter and real-life practice  |
```

Text is left aligned except for recall cards and single focused exercises. On smaller screens the support rail follows the main work, and mobile navigation opens from a labeled menu button.

## Learning behavior

- Start with a realistic next step; show actual progress from recorded activity.
- Keep review ratings behind the answer reveal.
- Use gentle, actionable feedback and retain mistakes for future practice.
- Teach nouns with articles; distinguish der, die, and das with text as well as color.
- Keep pronunciation feedback honest: recognized words and text matching only.
- Make backup replacement explicit, previewable, and reversible through export.
- Keep English and optional Arabic alongside the German learning content.
- Support visible keyboard focus, modal focus trapping, reduced motion, dark mode, and small screens.
