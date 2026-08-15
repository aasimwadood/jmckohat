# GPGC Kohat

A university management system for Government Postgraduate College Kohat — public site, admissions, academics, recruitment/appointment workflows, and 8 role-specific dashboards (Student, Faculty, Department/HoD, Admin, Controller of Examinations, Coordinator, Principal, Administration).

Built with **Next.js 15 (App Router)**, **TypeScript**, **Supabase** (Postgres + Auth + Storage + Realtime), **shadcn/ui + Tailwind CSS v4**, **Zod**, and **React Hook Form**.

This is a migration of a legacy Vite + React SPA (kept for reference at `legacy-vite-src/`) onto this stack. See [docs/MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md) for the full audit, migration map, and phase-by-phase notes on what changed and why.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project's values (see below)
npm run dev
```

Visit `http://localhost:3000`.

## Setting up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project Settings → API** into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe for the browser — RLS is the actual access boundary, not this key)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — **never** prefix with `NEXT_PUBLIC_`, never import into a Client Component; used only by `lib/supabase/admin.ts`, guarded by the `server-only` package so a client bundle including it fails to build)
3. Apply the schema. With the [Supabase CLI](https://supabase.com/docs/guides/cli) installed:
   ```bash
   npx supabase db push --db-url "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
   ```
   This runs every file in `supabase/migrations/` in order — tables, enums, indexes, `SECURITY DEFINER` functions, triggers, and every RLS policy.
4. (Optional, local dev only) Seed minimal reference data — a few departments and an active academic session/semesters, so the register form and dashboards have something to show:
   ```bash
   psql "<connection string>" -f supabase/seed.sql
   ```
   This is fixture data, not production content — don't run it against a real production database.
5. **Enable email** in Supabase Auth (Authentication → Providers) if you want signup confirmation emails and staff-invite emails to actually send. In local/dev, Supabase's built-in email testing works out of the box.
6. **Storage buckets** (`avatars`, `public-assets`, `course-materials`, `assignment-submissions`, `fyp-deliverables`, `admission-documents`, `recruitment-documents`) are created by migrations `0010_storage.sql` and `0040_recruitment_storage.sql` — nothing to do manually.

### Bootstrapping your first admin account

There's an unavoidable chicken-and-egg step: admin accounts are provisioned by an existing admin (`lib/actions/provision-staff.ts`), so the very first one can't be. To create it:

1. Register normally through `/register` (creates a `student` account), or invite yourself via the Supabase dashboard's Authentication → Users → Invite.
2. In the Supabase SQL editor, run:
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Log in — you'll land on `/dashboard/admin` and can provision every other staff account (faculty, HoD, controller, coordinator, principal, administration) from there.

The same bootstrap applies to `hed_admin` (top of the new HED → Directorate → JMC → College hierarchy — see below): `update profiles set role = 'hed_admin' where email = '...'`. There's no in-app way to create one yet; the org-provisioning UI is the next sub-phase.

## HED hierarchy

This app was extended from a single-college system into a multi-tenant one — Higher Education Department → Directorate → JMC (Joint Management Council) → College. The existing GPGC Kohat data is seeded under Directorate of Higher Education KP → JMC Kohat → GPGC Kohat college. Each new role has its own dashboard: `/dashboard/hed` (full org CRUD, system-wide reports and audit logs), `/dashboard/directorate` (JMCs/colleges scoped to one directorate), `/dashboard/jmc` (colleges scoped to one JMC), `/dashboard/college-admin` (read-only college profile — deliberately minimal, see below). Every org-level role except the first `hed_admin` can now be provisioned in-app (JMC/Directorate/College pages have an "Assign Admin" action); the first `hed_admin` needs the same manual SQL bootstrap as the first `admin` (above).

`hed_admin`/`directorate_admin`/`jmc_admin` also have real (read-only) visibility into the academic data under their scope — admissions, results, attendance, enrollments, assignments, course materials, fee payments, promotions, and the profiles directory — each additively RLS-scoped to their directorate/JMC/college, verified live across two fully separate college trees so cross-org isolation holds in both directions. This is deliberately **not** every table: FYP, announcements, notifications, library/tickets/events, and similar operational tables were left alone — no spec section asks an HED/Directorate/JMC admin to see individual FYP deliverables or support tickets.

**Deliberately not built**: `college_admin` does not get a parallel copy of the academic-management screens `/dashboard/admin` already has for the same college (students, faculty, courses, etc.) — that would just duplicate ~60 existing routes. The two roles' permissions genuinely overlap in the spec; this app keeps them separate without merging or duplicating, and leaves how a real deployment divides the work between them as an operational decision, not a schema one. Full detail, including a real RLS-recursion bug found and fixed during verification, is in [docs/MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md) §9.

## Recruitment / Appointment System

A full advertisement → application → scrutiny → merit → shortlist → interview → selection → appointment-order pipeline, scoped per college. `coordinator` is the primary owner (also reachable by `admin`/`principal`/`college_admin`, at `/dashboard/recruitment` — deliberately its own top-level route rather than nested under `/dashboard/coordinator`, since that layout's own role guard would block the other three roles first); issuing the actual appointment order is further restricted to `principal`/`college_admin`/`admin` only.

Job applicants are **not** students or staff — they get their own `applicant_profiles` identity, entirely separate from `profiles`/`user_role`, so none of the app's existing RLS policies needed to change. The public side lives at `/recruitment` (browse/apply) and `/recruitment/portal` (applicant account: application status, documents, interview info, printable appointment order once issued — no PDF library, a print stylesheet + the browser's native print-to-PDF, matching the fact that this app doesn't generate PDFs anywhere else).

Merit scoring is a configurable per-position criteria table, not a hard-coded formula. Every application-status transition (submit, scrutinize, shortlist, interview marks, final selection, appointment order) goes through a `SECURITY DEFINER` RPC — same pattern as `admit_student()`/`approve_admission_fee()` — with no blanket UPDATE policy on the tables those functions own.

**Not yet applied or live-verified** — see `docs/MIGRATION_PLAN.md` §11 for the full design writeup, a real bug found while building it (a malformed hand-authored type broke row-typing app-wide, not just for the new tables), and the exact next steps before this ships.

### Regenerating database types

`types/database.types.ts` is currently **hand-authored** from the SQL in `supabase/migrations/` (see the note at the top of that file) — it was written this way because generating it required either Docker (for `supabase gen types --local`) or a linked project with an access token, neither available in the environment this was built in. Once you have Docker or `supabase login` access:

```bash
npm run db:types
```

This overwrites the file with the real generated types. Diff it against the hand-authored version before trusting it blindly — regenerate and re-run `npm run build` to catch any drift.

## Environment variables

See [.env.example](.env.example). Summary:

| Variable | Exposed to browser? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key — RLS enforces access, not secrecy of this key |
| `SUPABASE_SERVICE_ROLE_KEY` | **No — server only** | Bypasses RLS; used for staff provisioning, admin user management |
| `NEXT_PUBLIC_SITE_URL` | Yes | Base URL used to build auth email redirect links |

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build (must pass with zero TypeScript errors)
- `npm run start` — run a production build
- `npm run lint` — ESLint
- `npm run db:migrate` — `supabase db push` (applies pending migrations to the linked project)
- `npm run db:types` — regenerate `types/database.types.ts` from a live/local Supabase instance

## Deployment

Deploys like any Next.js 15 app — [Vercel](https://vercel.com) is the path of least friction:

1. Import the repo into Vercel.
2. Set the four environment variables above in the Vercel project settings (mark `SUPABASE_SERVICE_ROLE_KEY` as a server-only/sensitive variable).
3. Deploy. `npm run build` is what Vercel runs; it must be clean.
4. Point Supabase Auth's redirect URLs (Authentication → URL Configuration) at your production domain, and update `NEXT_PUBLIC_SITE_URL` accordingly, so signup-confirmation and password-reset emails link to the right place.

## Project structure

```
app/
  (public)/        marketing site — home, about, departments, programs, faculty, admissions info, contact, downloads, recruitment listings + applicant portal
  (auth)/           login, register (students only), forgot/update password
  dashboard/        one folder per role, each with its own layout.tsx (role guard + nav) and sub-routes; dashboard/recruitment/ is the one exception — shared across coordinator/admin/principal/college_admin rather than one-per-role
  auth/callback/    Supabase email-confirmation / password-recovery redirect handler
  api/               a couple of Route Handlers (e.g. fee receipt generation) where a file response makes more sense than a Server Action
components/
  ui/                shadcn/ui primitives
  layout/            Header, Footer, DashboardLayout — shared chrome
  features/          reusable business-logic components shared across dashboards: admissions, promotions, FYP, timetable grid, scheduling conflicts, realtime
  shared/            small generic helpers (e.g. ImageWithFallback)
lib/
  supabase/          browser/server/admin Supabase clients + Storage signed-URL helper
  auth/               session helpers (getCurrentProfile, requireRole) — the only sanctioned way to read "who is this" server-side; applicant-session.ts is the parallel version for the separate applicant identity (see Recruitment section above)
  permissions/        role vocabulary, resource→role policy map, role_permissions service
  actions/            Server Actions — one file per domain (auth, admissions, promotions, assignments, results, attendance, materials, fyp, timetable, announcements, users, audit, recruitment, recruitment-applicant, ...)
  validations/        Zod schemas, one per domain, mirroring lib/actions/
  services/           small pure/query helpers (notifications, scheduling-conflicts)
  utils/               grading scale (letterGrade/gradePoint/computeGpa)
  constants/           timetable day/slot definitions
supabase/
  migrations/          every schema change, forward-only, numbered — see below
  seed.sql             dev-only fixture data
types/
  database.types.ts    hand-authored Database type (see "Regenerating database types" above)
legacy-vite-src/        the original Vite/React app, kept for reference — not built or imported by the Next.js app
```

## Migration notes — what happened to the old API

The legacy app talked to an ASP.NET Core backend via ~80 REST endpoints (`fetchWithAuth`/`fetch` calls scattered across components). None of that backend is used anymore. Every endpoint was mapped to one of:

- a direct Supabase query from a Server Component (public content, dashboard reads),
- a Zod-validated Server Action (every write — forms, uploads, status changes),
- a `SECURITY DEFINER` Postgres function/RPC for anything that needs to be atomic or re-check a role server-side regardless of client input (`admit_student`, `approve_admission_fee`, `cancel_admission`, `register_for_promotion`, `verify_promotion_fee`, `create_fyp_group`, `respond_to_fyp_supervision`, `nominate_fyp_group`, `archive_fyp_group`),
- or Supabase Storage (course materials, assignment submissions, FYP deliverables).

`localStorage`-based auth (`currentUser`, `token`) is gone entirely, replaced by Supabase Auth with `@supabase/ssr` cookie-based sessions, checked server-side on every request via middleware + `requireRole()`.

Full detail, including the specific schema corrections made while porting each screen against its actual legacy source, is in [docs/MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md).

## Testing checklist

There's no automated test suite (none existed in the legacy app either, and none was requested). What's been verified, and what to check yourself:

**Verified already, against a live Supabase project, for every phase of this migration:**
- `npm run build` passes with zero TypeScript/lint errors (76 routes).
- RLS policies were checked live with real signed-in test accounts per role — not just read against the schema — confirming both "can do X" and, in a few security-critical cases, "correctly cannot do Y" (e.g. an Administration account gets zero rows from `audit_log`, not an error; a department account gets zero admission-document rows for another department's admission).
- Every `SECURITY DEFINER` RPC (`admit_student`, `approve_admission_fee`, `register_for_promotion`, etc.) was called live and returned the expected result or the expected clean error.

**Currently broken at the infrastructure level — see the TODO above:**
- Storage upload as a signed-in (`authenticated`-role) user fails project-wide with `DatabaseInvalidObjectDefinition`, for every bucket, discovered while verifying the new avatar/admission-document upload UI. Service-role uploads still work. This needs to be resolved on the Supabase project side (dashboard/support) before any file upload — course materials, assignment submissions, FYP deliverables, avatars, admission documents — can be trusted in production, even though every one of those code paths was written and previously exercised successfully.

**Not verified — needs a real browser pass before you ship:**
- [ ] Full click-through of every dashboard as a real logged-in user (this was built and back-end-verified in an environment without a working headless browser — see docs/MIGRATION_PLAN.md for why).
- [ ] Mobile/responsive layout on actual devices.
- [ ] Email deliverability for signup confirmation, password reset, and staff-invite emails in your actual Supabase email configuration.
- [ ] File upload size/type limits against real files (PDFs, videos for FYP demos, etc.) at the sizes your users will actually use.
- [ ] Concurrent-user behavior on the atomic operations (admission registration numbers, promotion course registration) — logic is written to be race-safe (row locks in the RPCs) but hasn't been load-tested.
- [ ] **The entire Recruitment/Appointment System (migrations `0037`–`0040`)** — built, `npm run build`/`npm run lint` clean, but not yet applied to any Postgres instance and therefore not RLS/RPC-verified live the way every other phase in this list was. Apply the migrations, then walk the full pipeline once (advertise → apply as a test applicant → scrutinize → shortlist → interview → select → issue appointment order) before trusting any of it in production. See `docs/MIGRATION_PLAN.md` §11.

## Remaining assumptions and TODOs

- **⚠️ Storage uploads via the `authenticated` role are currently failing project-wide** — discovered while live-verifying the avatar/admission-document upload UI below. Every `storage.upload()` call made as a signed-in user (any bucket, any role) returns `StorageApiError: The database schema is invalid or incompatible.` (`code: DatabaseInvalidObjectDefinition`), while the same upload succeeds instantly via the service-role client, and normal table queries (PostgREST) work fine for the same signed-in user. This rules out an RLS-policy bug in `0010_storage.sql` and points to a Storage-service/schema state issue on the Supabase project itself. **Check the Storage section of your Supabase dashboard (or file a support request referencing that error code) before relying on any file upload in production** — this affects every upload path in the app (course materials, assignment submissions, FYP deliverables, avatars, admission documents), not just the newest two. See `docs/MIGRATION_PLAN.md` §8 for the full diagnostic.
- **Avatar and admission document upload UI are now built** (`lib/actions/avatar.ts`, `lib/actions/admissions.ts`'s `uploadAdmissionDocumentAction`/`getAdmissionDocumentsAction`) — blocked from working end-to-end only by the Storage issue above, not by missing code.
- **No payment gateway.** Fee payment is bank-challan/manual-verification only, matching what the legacy app *actually* did (its "Pay Now" dialog was a fake credit-card form with no real processor) — this wasn't downgraded, it was never real to begin with.
- **"System Monitoring"** (Principal dashboard, legacy) was deliberately not built — it showed fake server/CPU health gauges with no real infrastructure behind them, and this app has no server infrastructure of its own to monitor (Supabase is managed).
- **"System Logs"** is admin-only by design (RLS). `logAudit()` now covers staff provisioning/deactivation plus the admissions and promotions money/status-transition RPCs (`admit_student`, `approve_admission_fee`, `cancel_admission`, `upload_admission_document`, `verify_promotion_fee`); extending it to more Server Actions is straightforward if you want even broader coverage.
- **Course File Report** and **Curriculum Management** were fully mock/hardcoded in the legacy app with no real spec behind their detailed structure; both were rebuilt against real data/tables rather than reverse-engineering fake content.
- **`legacy-vite-src/`** is kept in the repo for reference per your request — remove it (and the other `*.reference` config leftovers at the repo root) once you're done comparing against it.
- **Recruitment/Appointment System migrations are unapplied.** `0037`–`0040` are written and build-clean but have never been run against a real Postgres instance (no Supabase CLI/Docker/psql in this environment). Run `npx supabase db push`, then live-verify per the testing checklist above before relying on any of it.
- **Multi-college public website (spec Part 1) and the full existing-workflow audit (spec Part 3) are not started.** Both were explicitly deferred in favor of building Recruitment (Part 2) first, per your own prioritization — see `docs/MIGRATION_PLAN.md` §11 for the full three-part spec and why only one part was attempted at a time.
