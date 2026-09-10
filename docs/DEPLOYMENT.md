# ClassPing Guardian deployment guide

This guide describes how ClassPing Guardian moves from development to staging and production. It also records the runtime dependencies on ClassPing Backend and ClassPing School.

## Environments and branches

| Environment | Git branch | Purpose | Demo authentication |
| --- | --- | --- | --- |
| Local | Feature branch based on `dev` | Implementation and developer testing | Optional, local use only |
| Staging | `dev` | Integration testing with staging services | `false` by default |
| Production | `release` | Family-facing stable release | Always `false` |

`main` is retained for repository compatibility. New product work starts from `dev`, and production releases are created only by promoting `dev` to `release`.

## Runtime services

The application depends on deployed services, not GitHub repository pages.

| Service | Source repository | Runtime setting |
| --- | --- | --- |
| Guardian | <https://github.com/theclassping/classping-fe-guardian> | Deployed by this Vercel project |
| Backend | <https://github.com/theclassping/classping-backend> | `DJANGO_API_URL` |
| School portal | <https://github.com/theclassping/classping-fe-school> | `NEXT_PUBLIC_SCHOOL_APP_URL` |

Use separate staging and production URLs for both companion services. A GitHub URL, `localhost`, or a private network address will not work from Vercel.

## One-time GitHub and Vercel setup

1. Install or configure the Vercel GitHub App for the `theclassping` organization.
2. Grant the app access to `classping-fe-guardian`. Grant access to the backend and school repositories only when those projects will also deploy through Vercel.
3. In the Vercel project, open **Settings → Git** and connect `theclassping/classping-fe-guardian`.
4. Set **Production Branch** to `release`.
5. Keep preview deployments enabled. Vercel will create a preview deployment whenever `dev` or a feature branch is pushed.
6. Add branch protection in GitHub for `dev` and `release`: require pull requests, successful checks, and at least one review.

Until the GitHub App is connected, deployments can be run manually with the Vercel CLI, but pushes will not deploy automatically.

## Environment variables

Configure variables in **Vercel → Project → Settings → Environment Variables**.

### Staging (`dev` preview deployments)

```text
DJANGO_API_URL=https://<staging-backend-host>
NEXT_PUBLIC_SCHOOL_APP_URL=https://<staging-school-host>
DEMO_AUTH_ENABLED=false
```

Scope the values to Preview and, when Vercel offers a branch selector, restrict them to `dev`.

### Production (`release`)

```text
DJANGO_API_URL=https://<production-backend-host>
NEXT_PUBLIC_SCHOOL_APP_URL=https://<production-school-host>
DEMO_AUTH_ENABLED=false
```

Scope these values to Production. Never expose backend credentials in a `NEXT_PUBLIC_` variable. `DJANGO_API_URL` is server-only; `NEXT_PUBLIC_SCHOOL_APP_URL` is intentionally visible in the browser.

The prototype login (`ani.dua.anak@gmail.com` / `ani2anak`) is a local demonstration aid. Enabling `DEMO_AUTH_ENABLED` on a public deployment creates a known authentication bypass and is not permitted for staging or production.

## Development workflow

1. Synchronize `dev` and create a feature branch.

   ```bash
   git switch dev
   git pull --ff-only origin dev
   git switch -c feature/<short-description>
   ```

2. Implement and verify the change.

   ```bash
   npm ci
   npm run lint
   npm run build
   ```

3. Push the feature branch and open a pull request into `dev`.
4. Review the Vercel preview, then merge the pull request.
5. Verify the stable `dev` staging deployment.

## Production release

1. Confirm the `dev` deployment passed the staging checklist below.
2. Open a pull request from `dev` to `release`.
3. Review the changes and confirm that production environment variables are configured.
4. Merge the pull request. Vercel should deploy the `release` branch to production.
5. Record the deployed commit and production URL in the pull request or release notes.
6. Merge `release` back into `dev` after any production-only hotfix.

Do not force-push either long-lived branch.

## Manual deployment fallback

Use this only while GitHub integration is unavailable.

```bash
# Staging, while the dev branch is checked out
git switch dev
npx vercel --scope the-classping

# Production, while the release branch is checked out
git switch release
npx vercel --prod --scope the-classping
```

The CLI must be authenticated to the `the-classping` Vercel team. Manual deployments still use the environment variables configured in the Vercel project.

## Verification checklist

For staging and production, verify:

- `/login` loads over HTTPS and can authenticate against the intended backend;
- unauthenticated dashboard routes redirect to `/login`;
- Alya and Jisindo can be selected only for their authorized guardian;
- activity photos, assessments, and invoices are scoped to the selected child;
- receipt upload and partial-payment messaging behave correctly;
- notifications, profile, school contact, and logout work;
- the **ClassPing School** link opens the correct environment;
- no browser console error or failed application request appears; and
- mobile and desktop layouts remain usable.

## Rollback

Use Vercel's deployment history to promote the previous known-good production deployment immediately. Then revert the faulty commit on `release` through a reviewed pull request and merge the correction back into `dev`. Avoid rewriting branch history during an incident.
