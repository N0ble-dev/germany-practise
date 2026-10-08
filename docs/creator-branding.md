# Creator credit

The creator's name uses locally hosted Skranji, with `"Skranji", "Skranji Fallback"` in its font stack. The logo sits in a padded circular frame so the original “N” artwork keeps its proportions.

`src/lib/creator-brand.ts` holds Nabil Mohamed's creator identity, the supplied `public/logo.svg`, personal website `https://nabil7.site/` and copyright year. It is separate from the current learner's Google identity and remains present after logout.

The footer on every app page includes the personal logo, “Designed & built by”, the creator's name and “All rights reserved.” Clicking the logo, name or copyright opens the personal website in a new tab so the learner keeps their study session. Links have visible keyboard focus indicators; the logo/name target is at least 44px high, and the copyright target is 40px high. On mobile the creator credit remains visible above the save-status row. The same attribution appears in exported PDFs as a clickable link. Page metadata also credits the creator.

The study app's own Deutsch Journey logo remains its product identity. The creator credit uses Nabil's separate personal logo. `public/brand/nabil-logo.png` is a 180 × 201 transparent rendering of the supplied SVG with the same proportions and appearance, used for the footer and PDFs. The source SVG includes a large embedded bitmap; the small rendering avoids downloading that full source on every first page visit.
