# Google sign-in on Vercel

The production origin is `https://germany-practise.vercel.app`, without a trailing slash. The application already builds Google sign-in return URLs from the current browser origin. Production activation requires settings in Vercel and the Neon branch that hosts Auth.

The live `/api/auth/get-session` endpoint returned HTTP 503 with “Accounts are not configured” on October 8, 2026. This means its required server Auth settings are absent or its cookie secret is shorter than 32 characters. Adding a trusted domain alone cannot fix that response. There is no authenticated Neon CLI account or connected Vercel management session in this workspace; the hosted settings have not been changed.

## 1. Add the production domain in Neon

Open the existing Neon project and the branch matching `NEON_AUTH_BASE_URL`. Go to **Auth → Configuration → Domains**, enter the following, and click **Add domain**:

```text
https://germany-practise.vercel.app
```

This authorizes the app's `/auth/complete`, `/auth/callback`, and error return URLs under the same origin. See [Neon's trusted-domain guide](https://neon.com/docs/auth/guides/configure-domains).

If you prefer the CLI, sign in yourself with `neon login`, then use the actual project and branch IDs:

```sh
neon neon-auth domain add https://germany-practise.vercel.app --project-id YOUR_PROJECT_ID --branch YOUR_AUTH_BRANCH_ID
neon neon-auth domain list --project-id YOUR_PROJECT_ID --branch YOUR_AUTH_BRANCH_ID
```

The database connection string cannot authorize changes to hosted Auth settings.

## 2. Import the server environment into Vercel

Run this in the project directory:

```sh
npm run production:env
```

The command creates the private, git-ignored `.env.vercel.production` file using the existing Auth and database settings. It sets `APP_URL` to the production origin and generates a separate production cookie secret. Re-running it preserves that secret and any existing production values. No credentials are printed. `.env.local` continues to serve local development.

Open **Vercel → germany-practise → Settings → Environment Variables**. Import `.env.vercel.production`, select **Production**, and save. If those settings already exist in Vercel, retain its existing cookie secret and database values rather than overwriting them. You can also enter the values individually using `.env.production.example` as a reference:

| Variable                  | Production value                                              |
| ------------------------- | ------------------------------------------------------------- |
| `APP_URL`                 | `https://germany-practise.vercel.app`                         |
| `NEON_AUTH_BASE_URL`      | The existing branch's full Auth URL, including `/neondb/auth` |
| `NEON_AUTH_JWKS_URL`      | Auth URL followed by `/.well-known/jwks.json`                 |
| `NEON_AUTH_COOKIE_SECRET` | The generated secret, at least 32 characters                  |
| `DATABASE_URL`            | The pooled connection string for the same branch              |

Do not prefix these variables with `NEXT_PUBLIC_`. The app uses `DATABASE_URL` together with the Auth settings to show account controls and enable cloud backups. See [Vercel's environment-variable guide](https://vercel.com/docs/environment-variables).

After saving, **redeploy the production deployment** so its build and server functions receive the variables. Do not deploy the private import file as a public asset or add it to version control.

## 3. Configure your production Google OAuth client in Neon

In the same Neon branch, open **Settings → Auth → OAuth providers → Google → Configure**. For production, use your own Google OAuth client ID and secret. Register the exact callback shown in that dialog in **Google Cloud → Google Auth Platform → Clients → Web application → Authorized redirect URIs**. For this branch it is:

```text
https://ep-jolly-poetry-b5xd0omu.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth/callback/google
```

The later application landing page is `https://germany-practise.vercel.app/auth/complete`. Google's handshake callback goes to Neon. Include `https://germany-practise.vercel.app` in authorized JavaScript origins when configuring Google's client. See [Neon's OAuth guide](https://neon.com/docs/auth/guides/setup-oauth).

For Google Calendar connection, also register `https://germany-practise.vercel.app/api/calendar/google/callback`, supply the optional calendar server variables, and follow [the calendar setup guide](study-calendar.md). Calendar consent is separate from signing in.

## Verify activation

Visit [the production sign-in page](https://germany-practise.vercel.app/signin). **Continue with Google** should appear. Before signing in, `/api/auth/get-session` should respond successfully with no session rather than HTTP 503. Test sign-in, refresh, sign-out, and sign-in again with your Google account. A blocked redirect indicates the relevant return origin still needs registration in Neon's trusted domains.
