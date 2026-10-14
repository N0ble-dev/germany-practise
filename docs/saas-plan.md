# Deutsch Journey SaaS plan

Prepared 14 October 2026. This is a proposed roadmap, not a statement that billing or automatic synchronization is already available.

The active content work follows [the supplied verification pipeline](deutsch-journey-content-verification-pipeline.md). Audit, versioning, human review and licensed audio are prerequisites for releasing the new paid curriculum. See [implementation and setup](content-pipeline-setup.md); cloud autosave remains a separate SaaS workstream.

## Product direction

Build a German learning companion for beginners who picture a future in Germany: a clear daily lesson, a personal notebook, a realistic study calendar, and a small circle of study partners. Start with individuals learning A1 German, with English and Arabic support. Validate that audience before expanding to schools or teachers.

The product promise: **Know what to practise today, keep your learning with you, and make steady progress toward everyday life in Germany.**

Keep Deutsch Journey as the product brand and Nabil Mohamed as its visible creator. Preserve the circular personal logo, Skranji name treatment, and link to https://nabil7.site/ in the app, public profile cards, and marketing pages.

## What already exists

The repository already includes:

- Next.js, React, strict TypeScript, Neon PostgreSQL, Drizzle migrations, and Google-only managed authentication.
- Twelve original A1.1 companion lessons, vocabulary, spaced reviews, speaking/listening practice, and saved sentences.
- A study planner, calendar-file export, and an explicit Google Calendar connection and sync flow.
- Profiles, PDF notebook exports, Germany motivation photos, and personalized learner cards.
- A private study space for an owner and two partners, invitation links, and shared words and sentences.
- Opt-in public profile cards with image download and LinkedIn/X sharing.
- Account-scoped browser storage and authenticated cloud snapshot backups with revision checks.

The sharing migration was applied to the configured production database on 12 October. Repository documentation records that application deployment was still needed; verify the actual production release before treating these features as live.

Current gaps: automatic cloud saving, billing, server-enforced paid access, product analytics, account deletion, customer support tools, and a public marketing/pricing experience. This is not yet an offline/installable PWA. Speech feedback is not a certified pronunciation assessment, and lessons do not certify a CEFR level.

## Free and Pro: one paid tier first

Do not introduce separate team billing at launch. Keep study groups small and preserve the existing owner-plus-two-partners model.

| Capability                                              | Free                      | Proposed Pro                                                  |
| ------------------------------------------------------- | ------------------------- | ------------------------------------------------------------- |
| Current A1.1 lessons, vocabulary and daily reviews      | Included                  | Included                                                      |
| Current planner, manual Google sync and calendar export | Included                  | Included                                                      |
| Current notebook PDF/JSON exports                       | Included                  | Included                                                      |
| One study space with two partners                       | Included                  | Included                                                      |
| Public profile card and social sharing                  | Included                  | Included                                                      |
| Cloud backup                                            | Existing manual save/load | Automatic save and restore with conflict handling             |
| Weekly study plan                                       | Learner creates it        | Suggested plan from goals, due reviews and lesson progress    |
| Calendar updates                                        | Explicit sync             | Opt-in automatic updates when the plan changes                |
| Progress report                                         | Existing progress view    | Weekly summary with difficult topics and suggested next steps |
| Additional original practice packs                      | Sample pack               | Full new packs, released as they become available             |

Suggested pricing experiment: **€7/month**, with Free remaining useful. This is a hypothesis to test with learners, not researched market pricing or a committed checkout price. Choose the launch currency after confirming the target market. Start monthly; add annual billing only after learning whether beginners continue after finishing A1.1.

Existing learning data, exports and currently available features should remain accessible. Charge for added convenience and additional learning value. Publish the exact paid feature list before accepting payment; do not sell roadmap promises as available features.

For collaboration, Pro belongs to the paying learner. Invited partners do not gain personal Pro features just by joining a space. Joining, reading shared entries and contributing remain available on Free.

## Phase 1 — Product validation and production baseline

**Estimated effort: one week.**

- Invite 10–20 beginner learners to use the current app. Observe a first session and ask what would make them return and pay.
- Check the production deployment against the repository: Google sign-in, logout, invitations, partner access, card sharing, calendar connection, and exports.
- Define a meaningful first-session outcome: finish a small practice session, save useful words or a sentence, and schedule the next session.
- Create a simple landing page with a real product demonstration and clear creator attribution. Keep the learning app accessible while preparing the public entry point; preserve invitation and OAuth return routes.
- Record the initial activation and seven-day return rate before changing onboarding.

**Done when:** new learners can complete the core flow on mobile, production behavior is confirmed, and interviews identify at least one repeatable problem that the proposed Pro features solve.

## Phase 2 — Reliable cloud learning

**Estimated effort: one to two weeks. This precedes paid launch.**

Keep the existing JSONB learning snapshot and revision model initially. A complete database redesign is unnecessary for this release.

- Add debounced automatic saves for eligible signed-in learners and restore the correct account's cloud state on another device.
- Show clear states: **Saved**, **Saving**, **Changes on this device**, **Connection unavailable**, and **Resolve changes**. Never imply that local changes reached the server before a successful response.
- Preserve unsaved local changes across reloads. Offer export/recovery before replacing a local notebook.
- Use the server revision as an optimistic concurrency check. If another device changes the snapshot, keep both versions available for review; let the learner choose which to use. Do not silently overwrite or advertise automatic merging in version one.
- Coordinate multiple browser tabs and clear pending saves when the account changes or signs out. Handle changes made while a save is in flight.
- Import existing guest/account notebooks once through an explicit, recoverable migration. Preserve words, sentences, schedules, mastery evidence, and real activity timestamps.
- Introduce one server-side entitlement function that can control the paid cloud behavior later. Give beta accounts access while validating it.

**Done when:** two-device and two-tab tests preserve changes through conflicts, disconnects, reloads, logout, account switching and retries. No account can read another learner's snapshot.

## Phase 3 — A paid experience with learning value

**Estimated effort: one to two weeks.**

- Build a weekly plan from available days, session length, due reviews and current lesson. Explain the suggestion and let the learner edit it. Respect the chosen time zone and actual available time.
- Add a weekly summary based on real activity: what improved, what remains difficult, and a concrete next practice. Present time goals as intentions until actual study duration is measured.
- Make automatic calendar updates optional. Trigger them after a successful plan save, persist retry work, and show connection failures. Reuse stable event IDs and the dedicated study calendar. Signing in with Google remains separate from consenting to Calendar access.
- Prepare one additional original practice pack and validate its learning quality with the beta group. Do not require an AI service to deliver the first paid version.
- Keep Today focused on one primary action: **Continue today's practice**. Show an achievable next step and a supportive Germany reminder; offer an easy restart after missed days.
- Keep mobile navigation simple: Today, Journey, Practice, Space and Profile. Put billing and account settings inside Profile. Keep accessible labels, generous touch targets, dark mode and reduced-motion behavior.

**Done when:** learners can understand the paid benefit, edit a useful plan, receive correctly scheduled calendar updates, and identify their next practice without navigating several screens.

## Phase 4 — Subscription billing and entitlements

**Estimated effort: about one week after merchant approval.**

Choose the payment provider after confirming the business country, payout method and buyer markets. If the business operates in Egypt, evaluate Lemon Squeezy first: its official documentation lists Egypt for bank payouts and describes its merchant-of-record service. Eligibility still requires the provider's onboarding approval. [Supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries), [payment service](https://docs.lemonsqueezy.com/help/payments).

Stripe is an alternative when the business is eligible in a supported country. Check the actual entity's eligibility before selecting it. [Stripe availability](https://stripe.com/global). Implement one provider at launch.

- Add pricing, authenticated hosted checkout, and the provider's customer portal for payment methods, invoices and cancellation.
- Create checkout on the server using an allowlisted product/price and the verified learner identity. Keep test and live billing configuration separate.
- Verify webhook signatures against the raw request body. Persist event processing, deduplicate deliveries and protect against stale/out-of-order subscription updates. Reconcile with the provider when needed. Provider events update access; the checkout return page does not grant Pro. [Lemon Squeezy webhook guide](https://docs.lemonsqueezy.com/guides/developer-guide/webhooks).
- Define access explicitly: successful paid activation grants Pro; scheduled cancellation retains access through the paid period; failed renewal displays a payment action and follows a published grace period; expiry returns the account to Free. Handle refunds and disputes according to the published billing policy.
- Enforce entitlements in server routes and jobs. Client UI may explain limits but cannot authorize access.
- Preserve the notebook after downgrade. Keep reading/export available and explain any disabled paid automation. Decide and disclose whether existing calendar events remain; reuse the current disconnect behavior unless intentionally changed.

**Done when:** test-mode purchase, duplicate webhook, delayed delivery, renewal, failed payment, cancellation, expiry and refund scenarios produce correct access. A production purchase and cancellation are verified before the paid launch.

## Phase 5 — Launch readiness and a small paid beta

**Estimated effort: one week; several tasks can run alongside earlier phases.**

- Add account deletion, cloud data export, privacy/terms/billing pages, and an accessible support contact. State how Google photo and Calendar data are used and distinguish private notebooks from opt-in public cards.
- Review production Google OAuth setup and Calendar scopes. Use the minimum scopes for the dedicated calendar and complete Google's verification process where required. [Google Calendar scope guidance](https://developers.google.com/workspace/calendar/api/auth).
- Add rate limits to invitations, public-card publishing, exports that consume server resources, and checkout creation. Add request-size limits and verified roles for support/admin actions.
- Add error monitoring, availability checks, webhook/job failure alerts and a documented backup/restore procedure. Exclude notebook text, OAuth credentials and payment secrets from logs.
- Add a minimal founder dashboard for subscription state, failed jobs, invitation failures and reported issues. Viewing learners' private content should not be its default behavior.
- Release to a small invited group, support them directly, and fix onboarding/payment issues before wider promotion.

**Done when:** the app recovers from common failures, learners can manage their subscription and data, critical alerts reach the founder, and paid beta users can complete the promised workflows.

## Technical shape

Keep the current stack and use a modular application on Vercel. Add services only when a concrete job needs them.

| Area              | Proposed implementation                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| Identity          | Existing Neon managed Google authentication; session determines ownership                                   |
| Personal learning | Existing JSONB snapshot, schema version and revision; local cache with recoverable pending saves            |
| Collaboration     | Existing space membership and invitation tables; authorization on every operation                           |
| Billing           | One hosted provider; server checkout, signed webhooks and customer portal                                   |
| Paid access       | Central server entitlement resolver shared by routes, jobs and UI state                                     |
| Background work   | Durable job records plus a scheduled worker for calendar retries, summaries and billing reconciliation      |
| Public media      | Keep the current card image approach initially; move to object storage if measured size/traffic warrants it |
| Observability     | Errors, uptime, job failures and content-free product events                                                |

Proposed additional records:

- `billing_customers`: learner ID, provider and customer ID.
- `subscriptions`: provider subscription ID, plan, status, paid-through time, cancellation state and provider update metadata.
- `billing_events`: stable event identity, processing state, attempts and failure details; distinguish receiving from successfully applying an event.
- `entitlement_grants`: explicit beta or legacy grants with reason and optional expiry.
- `background_jobs`: type, owner, deduplication key, state, attempt count and next retry time.

Use Drizzle migrations for additions, pooled app connections and direct migration connections. Keep account/space authorization even when an account has Pro. The existing three-seat database checks remain unchanged. Existing instructions to use the production branch do not require changing production while writing this plan; any implementation rollout should state the target and preserve existing data.

## Measurement and economics

Start with a small set of events: onboarding completed, practice completed, week plan saved, partner invited/joined, public card shared, checkout started and subscription activated. Measure card sharing without retaining secret invitation tokens or private notebook content. Keep promotional email/reminders opt-in; calendar reminders already have their own consent path.

Track weekly:

- Activation: new learners completing the defined first-session outcome.
- Seven-day retention: activated learners returning for meaningful practice.
- Weekly engaged learners: people practising on at least three distinct local days.
- Free-to-paid conversion and cancellations, with reasons.
- Successful cloud saves, unresolved conflicts and calendar update failures.
- Revenue, provider fees, refunds and infrastructure cost per paying learner.

Use a basic contribution calculation: **revenue minus payment fees, refunds and variable service costs**. Keep a separate budget for fixed hosting and support time. Set usage limits from measured costs. Add AI only after identifying a paid use case and a per-learner budget; avoid an unlimited AI promise.

Initial validation targets, not forecasts: 10–20 observed beta learners, at least five willing to pay the tested price, and no unresolved data-loss or account-isolation failures. Measure retention first and set broader targets from that baseline.

The growth loop is already possible: a learner makes real progress, shares a profile card or invites a partner, and a visitor starts their own journey. Keep sharing optional and retain Nabil's creator credit. Use honest product examples and original learning material; additional lessons should follow the existing strategy's original companion-content approach.

## Delivery order and decisions

Allow approximately **six to eight implementation weeks** for one developer, excluding merchant onboarding, Google review and the time needed to observe retention. This is an estimate; code review may change it.

1. Validate the audience and verify the production baseline.
2. Make cloud saving and recovery reliable.
3. Deliver the weekly-plan/report/automation benefit and one new practice pack.
4. Connect billing and enforce access on the server.
5. Complete launch operations and run a small paid beta.
6. Improve retention before adding annual plans, larger groups, teacher dashboards, A1.2/A2 or AI tutoring.

Decisions to confirm before billing implementation: the business country and payout account; the first buyer market and checkout currency; and the exact Free/Pro feature boundary and experiment price. The recommended starting scope is individual beginners, one Free plan, one monthly Pro plan, and the existing three-person spaces.

The current implementation priority is **the verified content pipeline and Lesson 1 pilot**. Complete its human/audio review and development-branch verification before publishing the new curriculum. **Reliable cloud autosave with visible sync state and safe conflict recovery** is the next SaaS infrastructure priority.
