# Shared study spaces and profile cards

Deutsch Journey now supports private collaboration for signed-in learners. **Study together** (`/space`) holds one owned space per account and up to two study partners. Learners may also join another person's space. All cloud operations require a verified Neon session.

## Learner flows

- Create a named study space and invite a partner into either empty seat. Copy the generated invitation link and send it yourself. The app does not send email.
- Each invitation works once, expires after seven days and reserves one of the two partner seats. Creating another invitation for that seat replaces its previous link. The owner can revoke an invitation or remove a partner. Partners can leave; the owner keeps their seat.
- Google sign-in preserves a valid invitation destination. Accepting an invitation is explicit after signing in. Joining shares the account's display name with the space; it does not upload the personal notebook.
- Share a selected vocabulary word, a saved sentence or a sentence written in the space. Words include their translations, article, plural, example and memory hint. Review history, progress evidence, calendar sessions and other private notebook content are excluded.
- Keep an entry to copy it into the personal vocabulary or sentence notebook. Copied words start with fresh review scheduling and evidence. Duplicate words are detected. Personal copies stay after an entry is removed or a member leaves.
- The owner can remove any shared entry; partners can remove their own entries. The notebook loads 50 entries at a time, with a button for earlier entries. Use **Refresh notebook** to see new contributions; returning focus to the browser also refreshes it. This release does not use live sockets.

## Share a profile card

In **My account**, use **Share your learner card** to choose its name, Google photo visibility and word/XP visibility. Download a PNG locally or create a public link. Only this chosen card snapshot is published. The public page works without signing in and includes image download, native sharing or link copying, direct LinkedIn and X share buttons, and Nabil Mohamed's creator credit. Social buttons open a composer with the public card link; the visitor reviews and submits the post. Open Graph and X card metadata use the published card image for link previews.

Updating the card keeps its link and replaces the published snapshot. **Turn sharing off** removes the record, so both the public page and image become unavailable. Creating a link again uses a new random address. Shared pages and images are served without caching, use a no-referrer policy and discourage search indexing. This is link sharing, not password protection: anyone with the address can see the chosen card. Downloaded copies and third-party link previews cannot be recalled. XP and vocabulary counts are personal learning data, not certified achievements.

## Data and access checks

The Drizzle migration `drizzle/neon/0002_tough_bulldozer.sql` adds five tables: `study_spaces`, `study_space_members`, `study_space_invites`, `study_space_items` and `profile_shares`. Foreign keys reference the existing managed `neon_auth.user`; account deletion cascades owned spaces and cards. Shared items retain their author name if an author's account is deleted.

Membership is keyed by `(space_id, user_id)`, with a unique `(space_id, seat)` and a check that seats are 0, 1 or 2. This enforces the total of three even under competing joins. Invitation tokens contain 256 random bits; only SHA-256 hashes are stored. Consuming a token and inserting membership uses one PostgreSQL statement. Every private query and mutation checks the authenticated account's current membership or ownership. Mutations check the request origin; the account header only detects stale sessions and never supplies identity. Inputs use bounded Zod schemas and parameterized SQL. No database credentials are sent to the browser.

Published cards contain a bounded generated PNG and an explicit name/settings/counts snapshot. They contain no learner email, account ID, private notes or calendar data. Counts are stripped when hidden. Owner card controls are authenticated separately from the public, opaque 192-bit card addresses.

## Production database status

Migration `0002_tough_bulldozer` was applied directly to the project's configured production Neon database on **12 October 2026**, at the user's explicit request. The existing direct `DATABASE_URL_UNPOOLED` connection was used; no Neon CLI login or new branch was needed. Before applying it, the two earlier migrations were checked against their recorded hashes and timestamps, and the five new tables were confirmed absent.

After applying it, verification confirmed all five new tables, both seat checks, all three indexes and the third Drizzle migration record. Existing learning and calendar record counts and aggregate fingerprints were unchanged. No test accounts, study spaces, invitations, notebook entries or public cards were created in production.

The database is ready for the sharing features. Deploy the current application code to expose the new pages and APIs on the production website.

## Setup for another environment

For future schema changes, the default Neon workflow is to test on an isolated branch before production. The direct production application above followed the user's explicit instruction to use production. For a new environment:

1. Create a development branch from the same Neon project. Keep the existing production `.env.local` intact; use `neon checkout dev-shared-spaces --create --no-env-pull` in a linked project.
2. Run migrations with that branch's **direct** connection as `DATABASE_URL_UNPOOLED`. The application uses its pooled `DATABASE_URL` and that same branch's Auth URL/cookie configuration. Environment variables supplied by the shell take precedence over `.env.local` in the Drizzle config.
3. Run `npm run db:migrate`. Confirm existing accounts and saved journeys remain intact, then sign in as an owner and two partners and verify invitations, shared entries and card sharing.
4. After the branch smoke test, run `npm run db:migrate` with the production direct connection and deploy the application normally. No new paid service, Stripe account or billing plan is required by these features.

The client shows a recoverable connection error if the database is unavailable or the new migration has not been applied. It does not create a local imitation of a multi-user space.

The schema stays managed by the existing Drizzle setup. HTTP queries reuse the installed Neon driver; invitation claims use a single statement rather than an unsupported interactive HTTP transaction. See [Drizzle's Neon connection guide](https://orm.drizzle.team/docs/connect-neon).

## Verification

`tests/unit/social.test.ts` applies the complete active Drizzle migration chain to an ephemeral PostgreSQL engine (PGlite), then executes the real parameterized repository queries and HTTP handlers. It covers account isolation, ownership, membership constraints, competing invitation claims, expired/revoked/replaced/consumed tokens, removed-member access, shared-entry permissions, pagination, fresh copied-word progress, safe OAuth destinations, card publishing/update/revocation and stale-account/origin/session checks. PGlite is a development-only dependency; it is not shipped as the production database.

Browser tests in `tests/e2e/social.spec.ts` exercise the UI with mocked session and API responses. They cover invitation return paths, shared notebooks, card settings/download/publishing and mobile accessibility. Browser mocks complement the SQL tests and do not claim to test live Google OAuth or Neon deployment.
