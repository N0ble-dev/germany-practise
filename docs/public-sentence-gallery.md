# Public sentence gallery

Learners can now explicitly share selected saved sentences at `/community`. Reading the gallery requires no account, onboarding or authentication request. Sentence Lab has a **Choose sentences to publish** action, a searchable checkbox picker and a signed-card preview before publication.

One publication selects up to five sentences. **Draw it** opens a signature pad for mouse, touch or pen, with Undo/Clear and a live signed-card preview. The actual handwriting is saved with each chosen public sentence and can be reused or redrawn when editing. An optional name/handle appears below it. **Personal** (Skranji) and **Simple** remain available as accessible typed-name alternatives. Blank names appear as “A fellow learner”. Gallery cards support German device audio, copying, literal search and pagination. Learner-written sentences are labeled as practice that may need correction; they are separate from verified curriculum/exam content.

Authors manage their posts in Sentence Lab, edit their public sentence/signature or confirm removal. Public copies are independent of the saved notebook: sharing, editing and removal do not alter saved sentences, notes, learning activity, XP or private study spaces. A failed publication keeps the selection and signature so the learner can retry. Signing out hides the previous account's management controls; public posts remain visible until their author removes them.

## Data and access

`sentence_posts` stores the selected German text, chosen signature/style, bounded numeric drawing strokes/aspect ratio, author ownership, post UUID, revision and timestamps. Public queries project this chosen content and post UUID/timestamps, excluding Auth user IDs, email, photos, notebook contents and revisions. Text renders through React escaping; handwriting renders from numeric coordinates into owned SVG paths. Uploaded/arbitrary SVG markup and image URLs are not accepted.

- `GET /api/community/sentences?q=&cursor=`: public, no-store, up to 24 posts plus a cursor. Literal substring search escapes SQL wildcard characters; opaque cursors preserve full timestamp precision and still work after their boundary post is removed.
- `GET/POST /api/community/mine`: authenticated current-account list or explicit public batch. The request contains only selected sentence text/signature/style and `public: true`; caller-supplied author fields are rejected.
- `PATCH/DELETE /api/community/mine/<uuid>`: authenticated ownership checks. Revision conflicts prevent stale edits; duplicate owned sentences are rejected. Removal affects only the public copy.

Mutations reuse the existing verified Neon session and app-origin/current-account checks. JSON bodies are streamed with a 96 KB cap and strict Zod limits (500 characters per sentence, 60 per name, 40 strokes/2000 total finite normalized points). A drawn signature needs real stroke data; typed-name styles clear the stored drawing. An atomic Postgres function serializes publication per author and enforces 50 active posts; retries do not duplicate posts or overwrite an existing signature. Edits take the same author lock. Auth account deletion cascades to its posts. Existing database credentials, Auth configuration and notebook schema were preserved.

## Migration and recovery — 14 October 2026

`drizzle/neon/0005_smooth_jigsaw.sql` adds one table, its checks/index/managed-user foreign key and the atomic publication function. `0006_brown_runaways.sql` adds drawing storage and matching style constraints, plus a compatible five-argument publication function; existing typed signatures remain valid. Both passed the complete migration chain in isolated local PostgreSQL, then existing `vercel-dev`, then production. All 24 pre-existing learning/content table fingerprints were unchanged on each branch; no synthetic accounts/posts were inserted on live branches. Both galleries start empty until a learner explicitly publishes.

Recovery branch `sentences-before-2026-10-14` (`br-ancient-waterfall-b546kc2h`) captures pre-migration production. It has **no compute endpoint** and expires **21 October 2026 at 10:00 UTC / 13:00 Cairo**. No production reset was performed. Future database changes must use a new migration rather than editing this applied migration.

## Verification

- All **140 unit tests** passed, including ten new PostgreSQL/API tests for numeric drawing validation/persistence, projections, opt-in, Unicode normalization, retries, limits, ownership, revision conflicts, removal, timestamp pagination, literal search, request limits and account deletion.
- Six browser tests cover real mouse/touch signature drawing, Undo/Clear, public ink rendering, anonymous browsing/search/pagination and escaped names, selected-only publication with retry, signed previews, edit/remove confirmation, notebook preservation, guest sign-in, empty/error states, sign-out privacy and responsive accessibility.
- Production build, TypeScript and ESLint passed. Browser scans cover gallery and active publication dialog at 320, 390 and 1440 pixels in both themes; the inert background behind an open modal is excluded from the modal scan. Screenshots are under ignored `artifacts/community-*`.

UI review scope: public gallery, Sentence Lab sharing panel, picker/preview/edit/remove dialogs, using React/Next.js and the existing plain CSS tokens. Typography uses the existing Plus Jakarta Sans/Nunito Sans and Skranji; controls retain the established button/dialog components.

| Category    | Evidence inspected                                                             | Result                                               |
| ----------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Typography  | German wrapping, Arabic signature direction, styles, live selection counts     | Clear; balanced heading and tabular count            |
| Surfaces    | Mobile/desktop cards, signature preview, modal controls and touch targets      | Clear; 44 px controls, compact mobile hero           |
| Animations  | Existing button/modal transitions, reduced-motion preference                   | Clear; no repeated card entrance motion added        |
| Icons       | Lucide quote/share/audio/copy/edit/remove states                               | Clear; one existing icon set and currentColor        |
| Performance | Bounded API pages, explicit public projections, abortable searches/owner calls | Clear; no new dependencies or private feed overfetch |

Extra card entrance animations and avatar fetching were considered and rejected: they add reading distraction and public identity data the learner did not choose to share. No actionable interface-polish findings remain. Actual Google consent is covered by the existing login flow; private browser tests use authentication fixtures. Real-user publication was not fabricated for testing. No separate Vercel deployment command was run.
