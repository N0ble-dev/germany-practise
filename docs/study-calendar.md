# Study planner and calendar reminders

Open **My study calendar** in the sidebar, or visit `http://localhost:3008/planner`.

Choose a date, study focus, chapter, duration, and reminder time. Sessions can repeat every day or on selected weekdays for up to 90 days. Each occurrence can be edited separately. Removing a repeating session can also remove the remaining sessions in that series. Calendar check-offs track your plan; XP still comes from actual learning exercises.

Your plan is saved in this browser and included in local exports and optional Neon cloud backups. Use **Save to cloud** and **Load cloud backup** to transfer the plan between devices. There is no automatic merging between devices.

## Google-only learning accounts

Use **Continue with Google** on `/signup`, `/signin`, or Preferences. The same flow creates an account on the first visit and signs in on later visits. Local learning stays available with **Continue without an account**.

Google OAuth initiation has been checked against this workspace's Neon service. Neon provides shared Google credentials for development. For production, configure your own Google client in the branch's **Settings → Auth → OAuth providers → Google → Configure** and add the app's HTTPS origin to trusted domains. Disable email/password and any other login providers in the Neon Console to enforce Google-only identity on the hosted service too. The app proxy already denies alternate identity methods; database credentials do not authorize changes to Neon Auth provider settings. See [Neon's OAuth setup](https://neon.com/docs/auth/guides/setup-oauth).

For automated service configuration, Neon's [email/password configuration API](https://api-docs.neon.tech/reference/updateneonauthemailandpasswordconfig) accepts `{"enabled": false}` on `PATCH /api/v2/projects/{project_id}/branches/{branch_id}/auth/email_and_password`, using a Neon management API key. This workspace has database access but no management API key, so the hosted service setting has not been changed. Keep Google enabled when disabling email/password.

Google sign-in grants account identity. Calendar sync needs an additional permission to manage the app's study calendar. The app suggests the signed-in account when connecting; Google still allows the learner to choose their account.

## Connect Google Calendar

The app implements the authorization and sync process. The project owner must create a Google OAuth client in their own Google Cloud account. Neon sign-in identifies the learner; connecting Google separately grants permission to manage a dedicated study calendar.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select a project. In **APIs & Services → Library**, enable **Google Calendar API**.
2. Open **Google Auth Platform**. Complete **Branding** with an app name and support/contact email. Under **Audience**, choose **External**, keep the app in **Testing**, and add the Gmail addresses that will test the connection as **Test users**.
3. Under **Data Access**, add this scope:

   ```text
   https://www.googleapis.com/auth/calendar.app.created
   ```

   This permits creating secondary calendars and managing events on those app-created calendars. The app does not request access to all events in the learner's existing calendars. See [Google's scope reference](https://developers.google.com/workspace/calendar/api/auth).

4. Under **Clients**, create an OAuth client with application type **Web application**. Under **Authorized redirect URIs**, add this exact address for local development:

   ```text
   http://localhost:3008/api/calendar/google/callback
   ```

   The host, port, and path must match `APP_URL`. Production needs `https://YOUR_DOMAIN/api/calendar/google/callback` registered separately. This is a server authorization flow; adding JavaScript origins alone does not configure the callback.

   To use this same OAuth client for production Google sign-in, also register the exact redirect URI shown in Neon's Google provider dialog. Its format is `${NEON_AUTH_BASE_URL}/callback/google`, including the Auth URL's path. For this workspace:

   ```text
   https://ep-jolly-poetry-b5xd0omu.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth/callback/google
   ```

   Paste the client ID and secret into Neon's Google provider configuration. The app's `/auth/complete` page is the later landing page, not Google's authorized redirect URI for Neon sign-in. Each Neon branch needs its own registered Auth callback.

5. Copy the client ID and secret into `.env.local`:

   ```dotenv
   GOOGLE_CALENDAR_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
   GOOGLE_CALENDAR_CLIENT_SECRET=YOUR_CLIENT_SECRET
   APP_URL=http://localhost:3008
   CALENDAR_TOKEN_ENCRYPTION_KEY=YOUR_STABLE_BASE64_32_BYTE_KEY
   ```

   This workspace already has a generated encryption key. Keep it. For another installation, generate one with:

   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   These are server settings. Keep them out of `NEXT_PUBLIC_` variables, version control, screenshots, and browser code. Retain the same encryption key across restarts and deployments; changing it requires reconnecting calendars.

6. Configure the existing Neon account/database settings from the README and run `npm run db:migrate` to create the calendar connection table. This workspace's migration has already been applied. Restart `npm run dev`. For production, set the environment before building and ensure the deployment supports the calendar sync route's runtime.
7. Use **Continue with Google**, open **My study calendar**, and select **Google Calendar → Connect Google Calendar**. If you start sign-in from the planner, you return there automatically. Choose the same Google account and approve the requested calendar permission. On return, click **Sync my study plan**.

For Google OAuth configuration and deployment requirements, see [Google's web-server authorization guide](https://developers.google.com/identity/protocols/oauth2/web-server). [Testing-mode authorizations and refresh credentials expire after seven days](https://support.google.com/cloud/answer/15549945) for this scope; reconnect when needed. Public use requires switching the audience to production and completing any consent/verification requirements Google shows for your configuration.

## How sync and reminders work

- The connection creates a separate **Deutsch Journey · My study plan** calendar. Google sends popup reminders at the selected offset. Check the event's reminder and enable notifications on the calendar/device you use; the study app does not need to stay open.
- **Sync my study plan** sends the current local plan. Click it again after adding, editing, removing, or checking off sessions. Planned sessions receive the selected alarm; checked-off sessions have alarms disabled. Removed/skipped sessions are removed from the app's calendar on the next sync.
- Changes made directly in Google are not imported into the app. The next sync applies the app's plan to its events. Stable event IDs avoid duplicates on retries, and partial failures can be retried.
- Refresh credentials are encrypted with AES-256-GCM, bound to the authenticated Neon user, and saved only on the server. The browser and learning backups never receive them. The callback uses PKCE, a short-lived encrypted state cookie, and the signed-in user to validate the connection.
- Disconnect removes the app's stored credential and attempts to revoke the Google grant. Existing Google events and reminders remain. Delete the study calendar in Google if you also want to remove them. Google account permissions can also be reviewed in [your account's connections](https://myaccount.google.com/connections).

## Google, Apple, or Outlook calendar-file import

Choose a provider and click **Download calendar file**. Export upcoming planned sessions or sessions in the viewed month. The `.ics` file includes UTC timestamps, study links, and reminder requests. Calendar applications may handle imported alarms differently, so check one imported event and its notification settings.

- **Google Calendar:** on a computer, open **Settings → Import & export**, choose the downloaded file, then select the destination calendar. [Google's import guide](https://support.google.com/calendar/answer/37118).
- **Apple Calendar:** on a Mac, use **File → Import**, select the file, and choose the destination calendar. [Apple's import guide](https://support.apple.com/guide/calendar/icl1023/mac).
- **Outlook on the web:** open **Calendar → Add calendar → Upload from file**, choose the file and destination calendar, then import. [Microsoft's import guide](https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web).

A file is a snapshot, not an ongoing connection. Importing another export does not reliably remove or update earlier copies; use a separate study calendar and replace old imported events when updating a plan. Apple and Outlook direct OAuth connections are not included.

## Time zones and clock changes

Set **Calendar time zone** to view your plan in your current location. Each session retains its own time zone. Repeating sessions preserve the chosen local wall-clock time across daylight-saving changes. A time that is skipped or occurs twice during a clock change is rejected with a message asking you to choose another time.

## Validation

Unit tests cover repeating schedules, clock changes, validation, exports, reminder payloads, token encryption, and protected OAuth/sync endpoints. Browser tests cover planning, editing, persistence, export, accessibility, and the Google controls with mocked provider responses. Live Google authorization and reminder delivery require your own OAuth client, consent, and device notification settings.
