# ClassPing Guardian

ClassPing Guardian is the family-facing web application in the ClassPing ecosystem. It gives parents and authorized school administrators a private view of one child’s school activity, developmental assessments, and monthly SPP administration.

This repository is intentionally separate from [`classping-fe-school`](https://github.com/theclassping/classping-fe-school): the school application is a workspace for teachers and administrators, while Guardian is a focused, read-oriented experience for families.

## What guardians can do

- Sign in with a `PARENT` account, or with an `ADMIN` account using guardian mode.
- See a child summary and important fee reminders on the home screen.
- Browse only activities in which the child was tagged by the school.
- Read activity details, teacher notes, and the skills practiced that day.
- Review published developmental assessments and their achievement indicators.
- Check SPP invoices, due dates, payment status, and late-payment fines.
- View verified school contact information.
- Configure activity, assessment, and payment notifications.
- Switch between Alya and Jisindo from the family menu without signing in again.
- Upload a transfer receipt and compare its entered amount with the selected bill.
- Contact the school about profile updates, website bugs, or general feedback.

## Application routes

| Route | Purpose |
| --- | --- |
| `/login` | Guardian login and role-aware authentication |
| `/forgot-password` | Password recovery request |
| `/dashboard` | Child overview, recent activity, assessment, and fee summary |
| `/dashboard/activities` | Searchable activity feed for the authenticated child |
| `/dashboard/activities/[slug]` | Activity story, teacher note, photos, and privacy context |
| `/dashboard/assessments` | Published developmental reports |
| `/dashboard/assessments/[slug]` | Assessment indicators and home guidance |
| `/dashboard/payments` | Searchable and filterable SPP history |
| `/dashboard/payments/[slug]` | Invoice, due date, fine, and payment details |
| `/dashboard/school` | Verified school profile and contact information |
| `/dashboard/settings` | Guardian notification preferences |
| `/dashboard/profile` | Guardian account and connected children |

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Server-side route protection through the Next.js proxy
- Django REST Framework / SimpleJWT authentication through server route handlers
- Lucide icons
- A custom responsive ClassPing design system in `app/globals.css`

## Authentication flow

The browser never writes JWTs to `localStorage`.

1. The login form sends credentials to `POST /api/auth/login` inside this Next.js application.
2. The server route requests a SimpleJWT pair from ClassPing Backend at `/api/auth/login/`.
3. It reads `user_id` from the access token and loads `/api/users/{id}/`.
4. Access is accepted only when the backend role is `PARENT` or `ADMIN`.
5. Access, refresh, and display identity are stored in `HttpOnly`, `SameSite=Lax` cookies. Production cookies are also `Secure`.
6. The proxy redirects unauthenticated dashboard requests to `/login`.
7. Logout revokes the token pair through the backend when available, then clears local cookies.

`TEACHER` and `STAFF` accounts are deliberately rejected here. They belong in the companion school application.

## Local development

### Prerequisites

- Node.js 20.9 or newer
- npm
- A running ClassPing Django backend for real authentication

### Setup

```bash
git clone https://github.com/theclassping/classping-fe-guardian.git
cd classping-fe-guardian
npm install
cp .env.example .env.local
npm run dev -- --port 3001
```

Open [http://localhost:3001](http://localhost:3001). Port `3001` is recommended when ClassPing School already runs on port `3000`.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DJANGO_API_URL` | Yes | Base URL of ClassPing Backend, for example `http://127.0.0.1:8000` |
| `NEXT_PUBLIC_SCHOOL_APP_URL` | No | URL opened by the “ClassPing School” link on the login page |
| `DEMO_AUTH_ENABLED` | No | Set to `true` only for a prototype deployment using `parent@classping.id` / `parent123` |

Do not commit `.env.local` or production secrets. The committed `.env.example` contains safe local placeholders only.

## Available scripts

```bash
npm run dev     # Start the development server
npm run lint    # Run ESLint
npm run build   # Create and type-check the production build
npm run start   # Serve a completed production build
```

## Project structure

```text
app/
  api/auth/                  Server-side login, logout, and recovery proxies
  dashboard/                 Protected Guardian routes
    activities/[slug]/       Activity feed and detail
    assessments/[slug]/      Assessment list and detail
    payments/[slug]/         SPP list and invoice detail
    school/                   School profile
    settings/                 Notification preferences
  login/                     Login page
components/
  layout/GuardianShell.tsx   Responsive Guardian navigation and top bar
  login/                     Login form and product showcase
lib/
  auth.ts                    Cookie-safe identity helpers
  data.ts                    Typed prototype data
proxy.ts                     Route protection and login redirects
```

## Current data status

Authentication and password recovery are wired to `classping-be`. Portal content is currently typed prototype data in `lib/data.ts`, migrated from the original static screen at `classping-frontend/classping-guardian` without deleting or modifying that source prototype. The current fixture models one guardian with two children, including distinct activities, assessments, invoices, notification counts, and payment states.

The next backend-integration step is to replace `lib/data.ts` with authenticated queries scoped by:

- the logged-in guardian;
- the guardian–student relationship;
- the student’s school tenant;
- activity photo tags;
- published assessment visibility; and
- the student’s invoice and payment records.

Those permissions must be enforced by the backend. Client-side filtering is a presentation convenience, never an authorization boundary.

## Privacy and multi-school boundaries

Guardian data is sensitive child data. Every production API query should derive the school and student scope from the authenticated relationship instead of trusting a `school_id` or `student_id` supplied by the browser. Photo delivery should use authorized endpoints or short-lived signed URLs, and activity records should appear only when the child is explicitly tagged.

The interface demonstrates two children at TK Harapan Bangsa and preserves the selected child in the URL. In production, the backend must return the connected-child list and validate every requested child against the authenticated guardian relationship. Tenant resolution remains backend integration work.

## Deploying to Vercel

1. Import `theclassping/classping-fe-guardian` in Vercel or run `vercel` from the repository root.
2. Keep the framework preset as **Next.js** and the root directory as `.`.
3. Configure `DJANGO_API_URL` with the public HTTPS URL of ClassPing Backend.
4. Configure `NEXT_PUBLIC_SCHOOL_APP_URL` with the deployed ClassPing School URL.
5. Leave `DEMO_AUTH_ENABLED=false` for a real environment. Set it to `true` only when publishing a reviewable prototype without a backend.
6. Deploy, then verify `/login`, both child dashboards, and logout.

Vercel deployments must not point `DJANGO_API_URL` to `localhost`; Vercel functions cannot reach a backend running only on a developer computer.

## Relationship to the prototype

The static prototype remains available in `classping-frontend/classping-guardian`. This repository is the maintainable Next.js implementation: it adds routing, authentication, responsive navigation, reusable components, typed data, role checks, and production build tooling. Keeping the prototype intact provides a visual reference while this application evolves independently.

## Contributing

1. Create a focused feature branch.
2. Keep guardian-facing copy in clear Indonesian.
3. Preserve keyboard navigation, visible focus states, and responsive behavior.
4. Run `npm run lint` and `npm run build` before opening a pull request.
5. Never expose another child’s photos, assessments, or financial information in fixtures, logs, screenshots, or tests.
