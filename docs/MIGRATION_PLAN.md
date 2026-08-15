# Smart College — Migration Plan (Phase 1 Deliverable)

Status: **audit complete, no code changed yet.** This document is the migration map required before implementation begins.

## 0. What this app actually is today

- Vite + React 19 + TypeScript SPA (`react-router-dom` v7), currently hosted as the client of an ASP.NET Core solution (`fyp_smartcollege.client.esproj`). Vite proxies `/api/*` to the ASP.NET backend in dev; in prod ASP.NET serves the built SPA.
- **No Next.js, no Supabase today.** No `src/types/` — every interface is declared inline per file. No axios/generated client — just a single `fetchWithAuth()` wrapper (`src/utils/api.ts`) that attaches a bearer token from `localStorage` and force-redirects to `/login` on 401.
- Auth is `localStorage.currentUser` + `localStorage.token`, set/read directly in `src/App.tsx` (no context/provider). This is the exact anti-pattern the target spec asks to replace.
- **Important correction to the task's framing**: a lot of "existing functionality" is not real. Concretely:
  - `CourseFileReport.tsx` — 100% hardcoded, zero API calls.
  - `ControllerDashboard.tsx`, `CoordinatorDashboard.tsx` — most tables are permanently static JSX arrays, never backed by fetched state.
  - Every file upload in the app (materials, assignment submissions, FYP proposals/reports/final deliverables, admission documents) is decorative — selected files are never attached to any request.
  - `AdminDashboard.tsx` user CRUD, most `AdministrationDashboard.tsx` actions ("Add Book", "Resolve" ticket, "Create Event"), `PromotionManagement`/`AdmissionManagement` fallback branches — all toast-only or silently fall back to local mock state on API failure (some even show a visible "using demo data" banner).
  - Marks computation is inconsistent between faculty submission (`quiz1+quiz2+midterm+assignments`, a sum) and student display (`(...)/4`, an average) — a real bug to resolve, not preserve.
  - Registration-number generation (`GPCK-2024-{DEPTCODE}-{seq}`) currently happens **client-side** in `AdmissionManagement.tsx` — a correctness/security issue (must move server-side, e.g. a Postgres function or server action, to avoid races and client tampering).

Given this, "preserve existing functionality" for these areas means: **preserve the UI/UX and intended workflow**, but the actual persistence behind it must be built for real against Supabase — there is no working legacy behavior to replicate for those specific screens beyond their visual design and role gating.

Full endpoint-by-endpoint, component-by-component detail is in the audit below (§1).

---

## 1. Full audit reference

<details>
<summary>Expand for the complete Phase-1 audit (routes, roles, API inventory, types, dashboards, mock-data locations, business rules)</summary>

(See conversation history / regenerate via the same audit — retained here as the canonical Phase 1 record. Key facts pulled forward into the plan below.)

</details>

### Routes (→ target App Router group)

| Current path | Component | Role | Target route group |
|---|---|---|---|
| `/` `/about` `/contact` `/downloads` `/departments` `/programs` `/faculty` `/how-to-apply` `/requirements` `/fee-structure` | public pages | none | `app/(public)/...` |
| `/login` `/register` | LoginPage, RegisterPage | none | `app/(auth)/login`, `app/(auth)/register` |
| `/dashboard/admin` | AdminDashboard | admin | `app/(dashboard)/admin` |
| `/dashboard/faculty` | FacultyDashboard | faculty | `app/(dashboard)/faculty` |
| `/dashboard/student` | StudentDashboard | student | `app/(dashboard)/student` |
| `/dashboard/department` | DepartmentDashboard | department (HoD) | `app/(dashboard)/department` |
| `/dashboard/controller` | ControllerDashboard | controller | `app/(dashboard)/controller` |
| `/dashboard/coordinator` | CoordinatorDashboard | coordinator | `app/(dashboard)/coordinator` |
| `/dashboard/principal` | PrincipalDashboard | principal | `app/(dashboard)/principal` |
| `/dashboard/administration` | AdministrationDashboard | administration | `app/(dashboard)/administration` |

### Role vocabulary cleanup

Two role vocabularies exist today and must be unified into one enum: `App.tsx` uses `admin | faculty | student | department | controller | coordinator | principal | administration`; sub-components (`AdmissionManagement`, `PromotionManagement`, `FYPManagement`) instead use `hod` (= department) and `accountant` (= administration). **Target: single Postgres enum `user_role` with the 8 App.tsx values; `hod`/`accountant` become presentation labels only, never a second code path.**

### API → Supabase mapping (by feature)

| Feature | Current endpoints | Target |
|---|---|---|
| Auth (login/register) | `POST /api/auth/login`, `/register` | Supabase Auth (`signInWithPassword`, `signUp` via server action w/ admin-provisioning for staff roles — see open question) |
| Public CMS content (About/Home/Departments/Programs/Faculty/Downloads/Fees/Contact/Footer) | ~20 `GET api/.../getall` endpoints | Supabase tables (`site_content`-style, one table per content type) queried in Server Components; `POST /api/Message/create` → `messages` table insert (Server Action) |
| Admin dashboard stats/users/activities/reports/logs | `GET /api/AdminDashboard/*` | Server Component queries + a few aggregate RPCs (`admin_dashboard_stats()`), `profiles`/`audit_log` tables |
| Role permissions | `GET/POST /api/RolePermissions/*` | `role_permissions` table + centralized `lib/permissions/` — real persistence replacing today's checkbox UI |
| Administration (accountant) dashboard | `GET /api/AdministrationDashboard/*` | Server Components over `fee_payments`, `library_*` (if kept in scope — see open question), `support_tickets`, `events` |
| Controller dashboard | `GET /api/ControllerDashboard/*` | Real tables: `exam_schedules`, `results`, `transcript_requests`, `result_queries` — this dashboard needs the most **new** backend work since today it's mostly static |
| Coordinator dashboard | `GET /api/CoordinatorDashboard/*` | `timetables`, `academic_calendar`, faculty load view — also mostly net-new backend |
| Department (HoD) dashboard | `GET/POST /api/DepartmentDashboard/*` | `students`, `courses`, `exam_schedules`, `announcements`, department-scoped RLS |
| Faculty dashboard | `GET /api/FacultyDashboard/*`, `POST /api/Results`, `/api/Assignments`, materials CRUD | `courses`, `enrollments`, `assignments`, `course_materials` (+ Storage), `results` |
| Principal dashboard | `GET /api/PrincipalDashboard/*`, `POST /api/announcements` | Aggregate RPCs across departments, `announcements` table (institution-scope) |
| Student dashboard | `GET /api/StudentDashboard/*`, `GET /api/Materials/student/{id}`, `api/fees/receipt/{id}` | Row-level-secured views of `results`, `attendance`, `assignments`, `fee_payments`, `course_materials`; receipts generated server-side (Route Handler → PDF or structured data, not client-built text blob) |
| Admissions | `AdmissionManagement.tsx` endpoints | `admissions`, `admission_documents` (Storage), server-side registration-number generation (Postgres function, sequence per department) |
| Promotions | `PromotionManagement.tsx` endpoints | `promotions`/`enrollments` state machine, fee-verify trigger as a Postgres function or Server Action (atomic, not client-computed) |
| FYP | `FYPManagement.tsx` endpoints | `fyp_groups`, `fyp_members`, `fyp_supervisors`, `fyp_proposals`, `fyp_evaluations` + Storage for deliverables — this is the module needing the most real design work since today's UI state (`pendingGroupRequests`, `studentGroups`, etc.) is disconnected mock data, not a working reference implementation |
| Timetables | `TimetableManagement.tsx` endpoints | `timetable_entries`, scoped by role via RLS |
| File upload/download (materials, FYP docs, admission docs, receipts) | none work today | Supabase Storage buckets + signed URLs — designed fresh, not migrated |

---

## 2. Proposed Supabase schema (draft — subject to the open questions in §3)

Core entities, normalized from actual usage (not 1:1 with frontend interfaces):

```
profiles            -- 1:1 with auth.users, extends with role, department_id, full_name, phone
departments          -- id, name, code (2-letter, used in registration numbers), hod_profile_id
programs              -- id, department_id, name, degree_level
academic_sessions    -- id, label (e.g. "2024"), is_active
semesters             -- id, number, academic_session_id
courses               -- id, code, title, credits, department_id, program_id
enrollments           -- student_profile_id, course_id, semester_id, status
timetable_entries    -- course_id, faculty_profile_id, day_of_week, start_time, end_time, room, group_name, semester_id, department_id
assignments           -- id, course_id, faculty_profile_id, title, description, due_date
assignment_submissions -- assignment_id, student_profile_id, file_path (storage), submitted_at, grade
course_materials      -- id, course_id, faculty_profile_id, title, type, file_path (storage)
exam_schedules        -- id, course_id, semester_id, exam_date, room
results               -- student_profile_id, course_id, semester_id, quiz1, quiz2, midterm, assignments, total (computed server-side, single formula)
announcements         -- id, author_profile_id, scope (institution|department|course), department_id?, title, body, published_at
admissions            -- id, student temp fields, department_id, program_id, merit_category, status enum, fees jsonb or fee_line_items, registration_number, created_by, approved_by, canceled_by/reason
fee_payments          -- admission_id or student_profile_id, amount, type, receipt_number, verified_by, verified_at
promotions            -- student_profile_id, from_semester_id, to_semester_id, status, cgpa, academic_standing, verified_by
fyp_groups             -- id, department_id, semester_id, status, supervisor_profile_id
fyp_members            -- fyp_group_id, student_profile_id
fyp_proposals          -- fyp_group_id, file_path, status, submitted_at
fyp_deliverables       -- fyp_group_id, type (progress|final_report|source|demo|slides), file_path
fyp_evaluations         -- fyp_group_id, criterion, score, evaluator_profile_id
role_permissions       -- role, resource, can_view/can_edit (replacing today's mock checkbox UI)
audit_log              -- actor_profile_id, action, entity, entity_id, created_at
notifications           -- profile_id, title, body, read_at, related entity
messages                -- (public contact form) name, email, subject, body, created_at
```

Plus the existing public-CMS content tables already implied by the current `getall` endpoints (configuration, leadership, departments_page, programs, faculty_members, downloads, fee structure tables, footer, contact info) — these are low-risk, content-only tables with public SELECT RLS.

Enums: `user_role`, `admission_status` (Pending/FeeApproved/Admitted/Canceled), `promotion_status`, `fyp_status`, `announcement_scope`.

This is a draft for discussion, not final — final schema will be delivered as SQL migrations in Phase 3.

---

## 3. Open questions — need your decision before implementation

These are the genuine ambiguities the task instructions require me to surface rather than guess on. Answering them changes real design decisions (schema shape, auth flow, and how much net-new backend logic gets built vs. deferred).

**Resolved:** full replacement (no ASP.NET coexistence) · self-registration is students-only, staff are provisioned server-side · real backend for every screen including the previously-mock Controller/Coordinator/Course File Report/CRUD stubs · Next.js built in place at the repo root.

---

## 4. Status: Phase 2 (scaffold) & Phase 3 (database) — complete

**Phase 2 — Next.js scaffold**
- Legacy Vite app moved intact to `legacy-vite-src/` (reference only, excluded from the TS build) — nothing deleted, everything reversible via git history.
- New root: `app/`, `components/ui/` (all 47 shadcn primitives ported, `"use client"` added, imports repointed to `@/lib/utils`), `lib/`, `types/`, `supabase/migrations/`.
- `lib/supabase/{client,server,admin,middleware}.ts` — browser client, server client (cookie-based session), service-role admin client (`server-only`-guarded), and the middleware session-refresh helper.
- `middleware.ts` protects `/dashboard/*` and redirects authenticated users away from `/login`, `/register` — UX convenience only, not the authorization boundary (that's RLS + server-side role checks, added in Phase 4/5).
- `package.json` rewritten for Next 15 / React 19 / Supabase / Zod / RHF; `npm install` and `npm run build` both verified clean (zero TypeScript errors, zero lint errors) as of this checkpoint.

**Phase 3 — Database (`supabase/migrations/0001`–`0010`)**
~2,100 lines of SQL, 50+ tables, full RLS on every table, across: profiles/departments/orgs, courses & timetable, coursework (assignments/materials/exams/results), admissions, promotions & fees, FYP, operations (announcements/notifications/controller/coordinator/administration/course-file-reports/role-permissions/audit-log), public CMS content, and Storage buckets/policies.

Security-sensitive business logic moved server-side as `SECURITY DEFINER` Postgres functions rather than left as client-trusted writes:
- `admit_student()` — atomic registration-number generation (was client-computed in the legacy app), enforces `fee_approved → admitted`.
- `approve_admission_fee()`, `cancel_admission()` — role-checked status transitions; the `admissions` table has no blanket UPDATE policy, so these functions are the only way to change status.
- `register_for_promotion()`, `verify_promotion_fee()` — server-enforced course-count cap (was a client-side check only), fee verification is still the promotion trigger per the legacy workflow.
- `create_fyp_group()`, `respond_to_fyp_supervision()`, `nominate_fyp_group()`, `archive_fyp_group()` — group-size cap and supervisor-quota enforcement moved server-side.
- `profiles.role`/`department_id`/`is_active` are column-privilege-restricted (`REVOKE`/`GRANT update (...)`) so a user can never self-escalate role via a crafted UPDATE, even though they can update their own `full_name`/`phone`/`avatar_path`.

**Known limitation:** these migrations have been written carefully and reviewed for syntax/logic, but have **not yet been executed against a live Postgres/Supabase instance** in this environment (no Docker/Supabase CLI available here). Running `supabase db push` (or pasting into the SQL editor) against a real project is the next concrete verification step, ideally before or during Phase 4.

**Update:** a live Supabase project is now connected (`.env.local`, git-ignored). All 10 migrations were applied against it via `supabase db push --db-url` and verified in sync (`supabase migration list`). One real bug surfaced only by running against real Postgres: `current_role()` is a reserved SQL keyword (like `current_user`) and cannot be used as a function name — renamed to `current_user_role()` everywhere (migrations + `types/database.types.ts`). `supabase gen types` itself requires Docker (for the local shadow database) or a linked project with an access token, neither available in this environment, so `types/database.types.ts` remains hand-authored from the migrations — regenerate it for real once you have Docker or run `supabase link` locally. A minimal `supabase/seed.sql` was added (4 departments, one active academic session with 8 semesters) and applied, purely so the register form's department picker has real data — it's dev/test fixture data, not production content. End-to-end verified against the live project: registering a student via Supabase Auth correctly fires the `on_auth_user_created` trigger and creates a `role: 'student'` profile row regardless of what role a client tries to pass in.

## 5. Status: Phase 4 (Supabase Auth) — complete

- `lib/actions/auth.ts` — Server Actions for login, register (students only — no role field accepted from the client, ever), logout, forgot-password, update-password. `lib/actions/provision-staff.ts` — the admin-only counterpart that creates every non-student role via `supabase.auth.admin.inviteUserByEmail` (service-role client) and immediately overwrites the trigger-assigned `'student'` role/department on the new profile.
- `lib/auth/session.ts` — `getCurrentProfile()` / `requireRole()`, the only sanctioned way for Server Components/Actions to read "who is this" — never trust a client-supplied user/role prop for an authorization decision.
- `app/(auth)/{login,register,forgot-password,update-password}` + `app/auth/callback/route.ts` (handles Supabase email-confirmation and password-recovery redirects).
- Dropped from the legacy screen: the hardcoded demo-account quick-fill buttons on Login (real credentials in shipped code is not something to preserve).
- `types/database.types.ts` is now the real bottleneck-fix, not just a placeholder — see the note above.

**Bootstrapping the first admin:** there's necessarily a chicken-and-egg problem — `provisionStaffAction` requires an existing admin to call it. To create the very first admin: register normally as a student (or invite via the Supabase dashboard's Authentication → Users → Invite), then run `update profiles set role = 'admin' where email = '...';` directly in the Supabase SQL editor once. Every subsequent staff account goes through `provisionStaffAction`.

**Update:** you provided the service-role key; it's in `.env.local` and verified working (`auth.admin.listUsers`).

## 6. Status: Phase 6 (core layout) & Phase 7 (public pages) — complete

**Phase 6** — `components/layout/{header,footer,dashboard-layout}.tsx` (Header/Footer ported faithfully from the legacy design; DashboardLayout's sidebar nav now links to real sub-routes instead of the legacy's client-side tab-switching, per Next.js routing conventions) + `app/(public)/layout.tsx` + the full `app/dashboard/<role>/{layout,page}.tsx` skeleton for all 8 roles, each guarded by `requireRole()`. Verified via curl: unauthenticated requests to `/dashboard/admin` correctly 307-redirect to `/login?redirectTo=...`.

**Phase 7** — all 10 public pages (Home, About, Contact, Departments, Programs, Faculty, How to Apply, Requirements, Fee Structure, Downloads) ported as Server Components querying Supabase directly. Every route was checked against the live project — 200 responses, real data rendering, not just a clean type-check. Contact's message form is now a real Zod-validated Server Action (the legacy form posted to an endpoint whose existence was never confirmed).

**Migrations 0011–0022**: porting each page against its actual source (not just the Phase 1 audit summary) surfaced real gaps between the Phase 3 schema guesses and what the pages need — documented per-migration. All forward-only; nothing already shipped was edited in place.

**Convention going forward:** avoid PostgREST embedded/nested selects (`.select("programs(name)")`) — the hand-authored `Database` type has no `Relationships` metadata, so these fail to type-check. Every page does separate queries + an in-memory join instead.

**Next up:** Phase 8 (8 dashboards) and Phase 9 (business modules — admissions, promotions, FYP, timetable, results) are the largest remaining chunks, each comparable in size to Phase 7. Storage (Phase 10) is needed before file upload/download features in those dashboards can be real rather than stubbed.

## 7. Status: Phases 8–11 — all 8 dashboards, business modules, Storage, Realtime — complete

**Phase 8 (dashboards)** shipped one role at a time, each with its own commit and its own live RLS verification against the real Supabase project (a real signed-in test account per role, not just a schema read):

- **Student**: overview, timetable, real attendance detail (replacing the legacy's client-generated random mock fallback), assignments (real Storage-backed submission), results, fees (real payment history + a server-rendered receipt Route Handler — "Pay Now" is honestly bank-challan-only since no payment gateway was ever real), course materials (signed URLs), announcements (was missing entirely in the initial port — added during the Realtime pass), FYP, profile.
- **Faculty**: overview, courses, real attendance marking, assignments with real per-student grading (legacy explicitly deferred this to "next update"), marks upload, course materials CRUD, announcements, schedule, FYP supervision (approve/decline + real rubric evaluation), Course File Report (was 100% hardcoded mock — rebuilt as a real per-course editor), Admissions (first shared module).
- **Department (HoD)**: overview, Admissions (shared), Promotions (second shared module — also closed a real gap: the legacy screen had no path that ever created promotion-eligible data), exam scheduling, marks oversight (an honest list, not a fabricated approval workflow the schema never specified), curriculum (real program→course listings, not 3 fake hardcoded programs), reports (3 real reports, not 6 decorative non-functional buttons), announcements.
- **Admin**: overview, user management (real invite + real deactivate/soft-delete — legacy's dialogs never called an API), role management (wired to the real `role_permissions` service), timetable (institution-wide), announcements, reports, system settings (a real minimal form, not a toast-only fake save), system logs (real `audit_log` reader).
- **Controller**: overview, exam schedules, results, transcript requests and result queries (both had zero real state in the legacy app despite matching endpoint names existing), exam policies (kept static — it was genuinely static content, not an API-backed screen).
- **Coordinator**: overview, timetable (reuses Admin's components), academic calendar, faculty coordination (real teaching load, not a fake "availability" column), scheduling conflicts (a real derived-conflict algorithm — same faculty/room double-booked with overlapping times — where the legacy had 3 hardcoded fake conflicts).
- **Principal**: overview, academic performance, financial, departmental reports, exam results — all computed from real data. System Monitoring was deliberately not built (fake infra gauges with nothing real to back them; documented as a decision, not silently dropped).
- **Administration**: overview, fee verification (cross-department, unlike the department-scoped shared AdmissionsView), finance (real payments/scholarships + reuses the Promotions module), library, helpdesk, events. System Logs deliberately excluded from the nav (RLS-blocked for this role by design; a page that always renders empty isn't a feature).

**Phase 9 (shared business modules)**, built as reusable components rather than duplicated per dashboard: `components/features/admissions/` (role-prop-driven, used by department/faculty/administration/admin), `components/features/promotions/` (same pattern), `components/features/timetable-grid.tsx`, `components/features/scheduling-conflicts.ts` (pure derived-data algorithm, no legacy equivalent existed).

**Phase 10 (Storage)** was built incrementally alongside the dashboards that needed it rather than as a separate pass: real signed-URL upload/download for course materials, assignment submissions, and FYP deliverables (proposals + progress/final/source/demo/slides). **Not yet built**: avatar/profile-photo upload and admission-document upload — the buckets and RLS policies exist (`0010_storage.sql`), just no UI wired to them yet.

**Phase 11 (Realtime)**: `components/features/realtime/live-refresh.tsx` (headless, calls `router.refresh()` on any RLS-scoped Postgres change — dropped into every page multiple roles watch concurrently: admissions, FYP, timetable, announcements, promotions) and `notification-bell.tsx` (live unread badge + toast, in every dashboard header). Migrations 0024–0025 add the relevant tables to the `supabase_realtime` publication.

**Known gaps, by design or by scope, not by oversight** (see the README's "Remaining assumptions and TODOs" for the full list): no payment gateway, no avatar/admission-document upload UI yet, `audit_log` coverage limited to two action types, no browser-driven E2E test pass (no working headless browser in the environment this was built in — RLS/RPC behavior was instead verified directly and repeatedly against the live database with real test accounts per role).

## 8. Status: Phase 14 — closing the file-upload and audit-log gaps — complete (with one open infra finding)

Closed two of the three items from Phase 10/13's "remaining TODOs":

- **Avatar upload**: `lib/actions/avatar.ts` (`uploadAvatarAction`) + `app/dashboard/student/profile/avatar-upload.tsx`, wired into the student profile page (the only role with a profile page today). Validates size/MIME client-adjacent and server-side, uploads to `avatars/{profile_id}/avatar.{ext}` with `upsert: true`, and updates `profiles.avatar_path`. Reads use the public bucket URL directly (no signing needed — `avatars` is a public bucket).
- **Admission document upload**: `lib/actions/admissions.ts` (`uploadAdmissionDocumentAction`, `getAdmissionDocumentsAction`) + a `DocumentsDialog` added to `components/features/admissions/admissions-view.tsx`, visible to every role that already sees the Admissions module. Department/faculty/admin can upload (matches the existing `admission_documents` insert policy); all admissions-viewing roles can list and open documents via short-lived signed URLs. Uploads to `admission-documents/{admission_id}/{timestamp}-{filename}`.
- **Broader audit coverage**: `logAudit()` now also covers `admit_student`, `approve_admission_fee`, `cancel_admission`, `upload_admission_document` (`lib/actions/admissions.ts`), and `verify_promotion_fee` (`lib/actions/promotions.ts`) — the highest-stakes state transitions in the admissions/promotions money-and-status flows, on top of the pre-existing `provision_staff`/`deactivate_user`/`reactivate_user` coverage.

`npm run build` passes clean (zero TS/lint errors) after these changes.

**Live verification finding — Storage uploads via `authenticated` role are currently rejected by the project's Storage service, project-wide, independent of this change.** While verifying the two new upload paths against the live Supabase project with disposable signed-in test accounts (same methodology as every other phase), every `storage.from(bucket).upload(...)` call made through an anon-key + user-JWT client failed with:
```
StorageApiError: The database schema is invalid or incompatible.
status: 400, statusCode: '503', code: 'DatabaseInvalidObjectDefinition'
```
This reproduces identically on `avatars`, `admission-documents`, `course-materials`, and `public-assets` — including buckets with no `allowed_mime_types` restriction and an admin-role user, ruling out an RLS-policy or MIME-check bug in this repo's SQL. The same upload succeeds instantly using the service-role client. Table-level PostgREST access (the user's JWT against `admission_documents`, `profiles`, etc.) works correctly throughout — only the separate Storage microservice's authenticated-role code path is affected. This points to a Storage-service/schema state issue on the Supabase project itself (a stuck or partial internal storage-schema migration is a known class of issue on hosted Supabase, sometimes clearing after a project pause/resume or a support-side fix), not a defect in `0010_storage.sql`'s policies or in the new action code. All disposable test users/rows created during this check were cleaned up.

**Action needed from you**: check the Storage section of the Supabase dashboard for this project (or open a support request referencing `DatabaseInvalidObjectDefinition`) before relying on any end-user file upload in production — this affects every upload path in the app (course materials, assignment submissions, FYP deliverables, avatars, admission documents), not just the two built in this phase. The application code for all of them is correct and unchanged in its access pattern; this is an infrastructure-side blocker to verify/resolve on the Supabase project, not a follow-up code task.

## 9. Phase 15 (in progress): HED → Directorate → JMC → College hierarchy

**Status: schema design below, no migrations applied yet.** This is a new, much larger effort than Phases 1–14: it turns the single-college application into a multi-tenant one. Confirmed with you before writing any SQL:

- **Pacing**: continuous phased build, same working style as before — audit/plan, then implement phase by phase with a report after each, no pause for approval between phases.
- **Role mapping**: the existing 8 roles (`admin`, `faculty`, `student`, `department`, `controller`, `coordinator`, `principal`, `administration`) are **not** renamed or merged — they keep exactly their current college-scoped meaning. A new `college_admin` role is added on top, as its own distinct role, implementing the spec's "Principal / College Administrator" concept. **Known overlap, flagged rather than silently resolved**: the existing `admin` role already has full staff-provisioning power within its college, which substantially overlaps with what the spec describes for `college_admin`. Both will exist. How a real deployment divides responsibility between an `admin` and a `college_admin` at the same college is a business-process question for you to settle operationally — the schema/RBAC won't force a particular split.
- **Seed data**: the existing GPGC Kohat college is seeded under **Directorate of Higher Education, KP** (code `DHE-KP`) → **JMC Kohat** (code `JMC-KOH`) → college type `GPGC`.

### 9.1 What "college-scoped" means in the current schema today

Nothing in the current schema has a notion of "college" — the whole system is implicitly one college. The closest existing scoping concept is `departments` (**academic** departments like CS/Math, unrelated to the spec's "Directorate"), and `profiles.department_id`. Every domain table (courses, admissions, promotions, fyp_groups, results, attendance, etc.) already traces back to a department — directly, via a course, or via a profile — which is what makes `current_department_id()` sufficient for today's RLS. That FK chain is the anchor point for adding college scoping without touching all ~65 tables individually.

### 9.2 New schema (this phase)

New tables:
- `college_types` (`id`, `code` unique — `GPGC`/`GDC` seeded, extensible), `name`.
- `directorates` (`id`, `name`, `code` unique, `status` active/inactive, timestamps).
- `jmcs` (`id`, `name`, `code` unique, `directorate_id` FK, `district`, `division`, `address`, `contact_number`, `email`, `status`, timestamps). A JMC belongs to exactly one Directorate.
- `colleges` (`id`, `name`, `code` unique, `college_type_id` FK, `jmc_id` FK, `district`, `division`, `address`, `contact_number`, `email`, `status`, timestamps). A college belongs to exactly one JMC. `principal_profile_id`/`college_admin_profile_id` are derived from `profiles` (role + `college_id`), not stored redundantly on `colleges`.

Changed existing tables:
- `departments` gets a required `college_id` FK → `colleges`. Backfilled to GPGC Kohat's row in the data migration below; `not null` added only after backfill.
- `profiles` gets nullable `directorate_id`, `jmc_id`, `college_id` FKs. `college_id` is populated for every role (denormalized from `department_id` → `departments.college_id` via trigger, for RLS performance — avoids a 2-hop join on every policy check) plus set directly for the three new org-admin roles who aren't associated with an academic department at all. `directorate_id`/`jmc_id` are only set for `directorate_admin`/`jmc_admin` respectively.
- `user_role` enum gains four values: `hed_admin`, `directorate_admin`, `jmc_admin`, `college_admin`. (Split into its own migration file — Postgres doesn't allow using a newly added enum value inside the same transaction it was added in, so the enum-add migration and the migration whose RLS policies reference the new values must be separate files.)

New RLS helper functions, mirroring the existing `current_department_id()`/`current_user_role()`/`is_staff()` pattern in `0002_orgs.sql`:
- `current_college_id()`, `current_jmc_id()`, `current_directorate_id()` — read off the caller's own `profiles` row.

### 9.3 RLS strategy for the new org tables

Straightforward hierarchy containment, `SECURITY DEFINER` where a cross-level existence check is needed to avoid recursive RLS:
- `hed_admin`: full read/write on `directorates`, `jmcs`, `colleges`, `college_types`.
- `directorate_admin`: read own directorate; read/write JMCs and colleges where `jmc.directorate_id = current_directorate_id()`; cannot create/edit Directorates or reach outside their assigned one (per spec §5, §14).
- `jmc_admin`: read own JMC; read/write colleges where `college.jmc_id = current_jmc_id()`; cannot touch other JMCs (§7, §14).
- `college_admin`/existing college-scoped roles: read their own college row only; no write access to the org hierarchy itself.

### 9.4 RLS strategy for the existing ~65 tables (not yet implemented — next sub-phase)

Every existing policy that scopes by `current_department_id()` or by an explicit college-wide role list (`admin`, `principal`, `administration`, etc.) needs an **additive** `or` clause, not a rewrite, so nothing that works today regresses:
```sql
-- existing clause, unchanged
current_user_role() in ('admin', 'principal', 'administration')
or (current_user_role() in ('department', 'faculty') and department_id = current_department_id())
-- new, additive
or current_user_role() = 'hed_admin'
or (current_user_role() = 'directorate_admin' and <row's college's jmc's directorate> = current_directorate_id())
or (current_user_role() = 'jmc_admin' and <row's college's jmc> = current_jmc_id())
```
This is the single largest piece of remaining work in this phase — every migration file from `0002` through `0009` has policies that need this additive clause. Doing it correctly and re-verifying live with disposable test accounts per new role (same methodology as every other phase) is its own multi-file sub-phase, tracked separately from the schema/enum/data-backfill migrations below.

### 9.5 Explicitly out of scope for now, flagged rather than silently decided

- **Public marketing/CMS content** (`site_settings`, `portal_*`, `downloads`, `faculty_directory`, `leadership`, `campus_locations`, `apply_steps`, `institution_faculties`, `department_contacts`, `contact_info`, `footer_info`) stays single-college/site-wide in this phase. The spec doesn't ask for per-college public websites, and building one would be a large separate feature (each college would need its own `(public)` site, its own domain/routing story, etc.) — not attempted here unless you ask for it.
- **HED/Directorate/JMC dashboards, nav, reports, and audit-log entries** (spec §17–21, §28, §30) are built in a later sub-phase, after the schema/RLS foundation lands and is verified.
- **Migrating existing users into the new role set** (spec §27) — no existing user's role changes in this phase; that happens once `college_admin` accounts are actually provisioned by JMC Kohat.

### 9.6 Applied and live-verified

Migrations `0026`–`0029` are applied to the live project (`bulqjxqdbfjbefbofzrd`):
- `0026_hed_hierarchy_roles.sql` — the 4 enum values (its own file/transaction; Postgres won't let a newly added enum value be referenced in the same transaction it was added in).
- `0027_hed_hierarchy_schema.sql` — `college_types`/`directorates`/`jmcs`/`colleges` tables, `departments.college_id`/`profiles.{directorate,jmc,college}_id`, the `sync_profile_college_id` trigger, `current_college_id()`/`current_jmc_id()`/`current_directorate_id()`, and RLS on the 4 new tables.
- `0028_hed_hierarchy_seed_existing_college.sql` — seeds **Directorate of Higher Education, KP** (`DHE-KP`) → **JMC Kohat** (`JMC-KOH`) → **Government Postgraduate College Kohat** (`GPGC-KOH`, type `GPGC`), backfills every existing `departments`/`profiles` row to that one college, then sets `departments.college_id` `not null`.
- `0029_hed_hierarchy_fix_rls_recursion.sql` — **a real bug found during live verification, not anticipated in the design**: `colleges_select_scoped` and `jmcs_select_scoped` each subqueried the other RLS-protected table, which Postgres correctly rejects as infinite recursion (`infinite recursion detected in policy for relation "jmcs"`). Fixed by adding `jmc_directorate_id()`/`college_jmc_id()` as `SECURITY DEFINER` helper functions and rewriting the 4 affected policies to call them instead of subquerying the sibling table directly — the same reason `current_user_role()`/`current_department_id()` are `SECURITY DEFINER` in `0002_orgs.sql`. Worth remembering for the next sub-phase: any RLS policy on table A that needs to check something on table B, where B's own policies check something on A, needs this pattern.

**Live-verified with disposable test accounts** (one `hed_admin`, two `directorate_admin`s in different directorates, one `jmc_admin`, one `student`, plus an isolated second Directorate/JMC/College tree created and torn down for the test):
- `hed_admin` sees every college across both test directorates.
- `directorate_admin` sees exactly the colleges/JMCs under their own directorate, and zero rows from the other directorate's tree — confirmed both ways (each directorate_admin blind to the other's college).
- `jmc_admin` sees exactly the colleges under their own JMC.
- A `directorate_admin` attempting to rename a JMC outside their directorate is silently blocked (0 rows affected, verified the name didn't change) — RLS `with check`, not just a UI restriction.
- A `directorate_admin` attempting to `insert` a new Directorate (hed_admin-only) is rejected.
- An existing `student` account (unrelated to this phase) correctly resolves to exactly its one college via the `department_id` → `sync_profile_college_id` trigger chain, with no manual backfill needed for that user.
- All test users/rows were deleted after verification; confirmed zero leftovers.

### 9.7 Code layer updated to match (before any dashboard work)

- `types/database.types.ts` — added `college_types`/`directorates`/`jmcs`/`colleges` row types and table entries, the 4 new enum values on `UserRoleEnum`, `OrgStatusEnum`, `departments.college_id`, `profiles.{directorate,jmc,college}_id`, and the 5 new RPC/helper function signatures.
- `lib/permissions/roles.ts` — added the 4 roles to `USER_ROLES`/`ROLE_LABELS`/`ROLE_DASHBOARD_PATH`, and a new `ORG_ROLES` constant.
- `lib/auth/session.ts` — `CurrentProfile` now carries `directorateId`/`jmcId`/`collegeId`.
- **A privilege-escalation gap found and closed before it ever shipped**: simply adding the 4 new roles to `USER_ROLES` meant `STAFF_ROLES` (used unfiltered by the existing college-level `admin`'s "Add Staff" dropdown and its `provisionStaffSchema` Zod enum) would have let any college `admin` provision an `hed_admin` for themselves or anyone else — full system-wide access, self-granted, from an existing form that predates this phase entirely. Fixed by adding `COLLEGE_STAFF_ROLES` (the original 8, explicitly excluding `ORG_ROLES`) and switching `lib/validations/staff.ts` and `provision-staff-dialog.tsx` to it. `provisionStaffAction` itself needed no change — the Zod enum *is* the server-side enforcement, not just a UI filter. The 4 org roles get their own, separately-scoped provisioning actions in the next sub-phase (an `hed_admin` provisions `directorate_admin`/`jmc_admin`/`college_admin`; a `directorate_admin` provisions `jmc_admin`; a `jmc_admin` provisions `college_admin`) — none of that exists yet, so there is currently no way to create an org-level account at all except the same manual-SQL bootstrap already documented for the very first `admin` in the README.
- `npm run build` passes clean (78 routes, zero TS/lint errors) after all of the above.

### 9.8 Bootstrap note

There is currently no in-app way to create the first `hed_admin` — by design, mirroring how the first `admin` was bootstrapped originally. Create one manually the same way:
```sql
update profiles set role = 'hed_admin' where email = 'you@example.com';
```
Every other org-level role (`directorate_admin`/`jmc_admin`/`college_admin`) now *does* have an in-app provisioning path — see §9.9.

### 9.9 Status: dashboards, org CRUD, and provisioning — complete

Built on top of the §9.6–9.8 foundation, in the same session:

**Org CRUD** (`lib/validations/org.ts`, `lib/actions/org.ts`) — `createDirectorateAction`/`toggleDirectorateStatusAction` (hed_admin only), `createJmcAction`/`toggleJmcStatusAction` (hed_admin + directorate_admin, scoped by RLS to their own directorate), `createCollegeAction`/`toggleCollegeStatusAction` (hed_admin + directorate_admin + jmc_admin, RLS-scoped). Every action uses the RLS-respecting client, not the service-role client — `requireRole()` is only the coarse gate; the actual own-directorate/own-JMC scoping is enforced by the RLS policies from `0027`/`0029`, the same division of responsibility used throughout `lib/actions/admissions.ts`.

**Org-admin provisioning** (`lib/actions/provision-org-admin.ts`) — `provisionOrgAdminAction` invites a `directorate_admin`/`jmc_admin`/`college_admin` by email, matching the hierarchy: hed_admin can assign any of the three; directorate_admin can assign jmc_admin/college_admin only within their own directorate; jmc_admin can assign college_admin only within their own JMC. This one **can't** lean on RLS for the scope check — it has to use the service-role client (the invitee has no session yet to act as), so the directorate/JMC ownership check is done by hand in the action, reading through the caller's own RLS-scoped client first (which independently reinforces the check: a directorate_admin outside the target JMC's directorate can't even `select` its `directorate_id` to begin with — confirmed live, see below). Keeps `jmcs.jmc_admin_profile_id`/`colleges.college_admin_profile_id` in sync as a denormalized back-pointer.

**Dashboards**, one per new role, mirroring the existing 8 roles' `layout.tsx` (`NAVIGATION` array + `requireRole()` guard) + `page.tsx` convention exactly:
- **HED** (`/dashboard/hed`): overview (directorate/JMC/college/user counts, GPGC vs GDC split), Directorates (full CRUD), JMCs (full CRUD + assign JMC Admin), Colleges (full CRUD + assign College Admin), Reports (directorate-wise and JMC-wise college/GPGC/GDC breakdowns), Audit Logs (system-wide — `audit_log` RLS extended in `0030` to grant hed_admin visibility, additive to the existing admin-only policy).
- **Directorate** (`/dashboard/directorate`): overview, JMCs (CRUD scoped to own directorate + assign JMC Admin), Colleges (CRUD scoped to own directorate's JMCs + assign College Admin), Reports.
- **JMC** (`/dashboard/jmc`): overview, Colleges (CRUD scoped to own JMC + assign College Admin), Reports.
- **College Admin** (`/dashboard/college-admin`): **deliberately minimal** — a read-only college profile (org record, JMC/Directorate breadcrumb, department/student/faculty counts) and nothing else. `colleges` RLS grants write to hed_admin/directorate_admin/jmc_admin only, not college_admin, so there was never going to be an "edit college" screen here regardless. This is **not** a rebuild of what `/dashboard/admin` already does for this same college — see the flagged admin/college_admin overlap decision in §9. Confirmed live: a college_admin can read their own college row but a write attempt against it is silently filtered to 0 rows by RLS (no error returned — PostgREST's normal behavior for an RLS-blocked UPDATE with no matching rows, which is worth remembering next time a "no error but nothing changed" result needs interpreting).

**Live verification** with disposable test accounts (two directorates, cross-directorate/cross-JMC attempts, a college_admin): hed_admin creates a full Directorate → JMC → College chain; a directorate_admin creates a second JMC within their own directorate but is correctly blocked creating one in another directorate; a jmc_admin creates and status-toggles a college within their own JMC; a directorate_admin from an unrelated directorate cannot even `select` a JMC outside their scope (confirms the provisioning action's manual scope check has RLS backing it, not just application logic); a college_admin reads their own college but a write attempt is silently blocked. One test-script false negative caught and corrected during this pass: the write-blocked check initially only looked at whether an `error` was returned (RLS-filtered updates return no error, just zero affected rows) — re-verified directly against the database that the college's name was in fact unchanged.

`npm run build` passes clean (92 routes, zero TS/lint errors).

**Not done in this pass, explicitly deferred**: rewiring RLS on the existing ~65 college-domain tables (courses, admissions, results, etc.) to add hed_admin/directorate_admin/jmc_admin visibility on top of what's already there (§9.4) — those roles currently can't see anything below the `colleges`/`jmcs`/`directorates` tables themselves (no student/faculty/academic data). Also deferred: real end-to-end testing of `provisionOrgAdminAction`'s email-invite path (would require sending real invite emails or mocking delivery — same category of limitation as the Playwright/browser-E2E gap already documented in the README).

### 9.10 Status: org-admin visibility into academic data — complete (scoped, not exhaustive)

Closed the §9.4/§9.9 gap above, deliberately scoped rather than mechanically touching all ~65 tables:

- **`0031_hed_hierarchy_org_visibility_functions.sql`** — four composable `SECURITY DEFINER` predicates: `college_visible_to_org_admin(college_id)` (the fundamental one — true for hed_admin always, for directorate_admin/jmc_admin only within their own scope), and three thin wrappers that resolve a `department_id`/`profile_id`/`course_id` to a college and delegate: `department_visible_to_org_admin()`, `profile_visible_to_org_admin()`, `course_visible_to_org_admin()`. Every downstream policy change is one `or <fn>(...)` line, not a repeated join.
- **`0032_hed_hierarchy_org_visibility_policies.sql`** — drops and recreates 10 existing SELECT policies (`profiles_select_admin_wide`, `enrollments_select_own_or_scoped`, `assignments_select_enrolled_or_scoped`, `submissions_select_own_or_faculty`, `materials_select_enrolled_or_scoped`, `results_select_own_or_scoped`, `attendance_select_scoped`, `admissions_select_scoped`, `fee_payments_select_scoped`, `promotions_select_scoped`) with exactly one new `or` branch appended to each — every pre-existing clause is untouched, so nothing that worked before changes. Write access is **not** extended anywhere — these three roles get reporting/oversight visibility (spec §13, §17–19, §30), never the ability to edit academic records.
- **Deliberately not extended**: FYP tables, announcements, notifications, transcript/result queries, library/tickets/events, scholarships, course_file_reports, role_permissions, messages, admission_documents. No spec section asks an HED/Directorate/JMC admin to see individual FYP deliverables or support tickets — extending everything mechanically would be scope creep with real security-review cost (10 policies were already enough surface to review carefully) for a benefit nobody asked for. `courses`/`exam_schedules`/`timetable_entries`/`admission_settings` needed **no change at all**: their existing `for select to authenticated using (true)` policies already made them visible to every signed-in role, org-admins included.
- **Live-verified** with a fully isolated second Directorate → JMC → College → Department → Course → Student → Admission → Result tree (not reusing GPGC Kohat's data, to prove real cross-college behavior): `hed_admin` sees the new college's admission/result/profile; the matching `directorate_admin`/`jmc_admin` see it; an **unrelated** `directorate_admin` (assigned to GPGC Kohat's own directorate) sees zero rows for either — confirming the isolation holds in both directions, not just "the right one can see it." Regression-checked that a student can still see their own result via the untouched own-row clause. All test fixtures cleaned up and confirmed empty afterward.
- **HED Reports page** now shows a real system-wide admissions funnel (pending/fee_approved/admitted/canceled counts) alongside the existing directorate-wise/JMC-wise college breakdowns — the first dashboard screen to actually consume this new visibility grant, not just prove it works in a test script.

`npm run build` passes clean (92 routes, zero TS/lint errors) after these changes.

## 10. Public content populated with real, sourced GPGC Kohat data

The public-facing CMS tables built in Phase 7 (`site_settings`, `footer_info`, `contact_info`, `campus_locations`, `institution_faculties`, `portal_quick_stats`, `portal_features`, `program_categories`/`program_details`) were live-empty — the UI and RLS existed, but nobody had ever written real rows into them. You asked me to pull real GPGC Kohat info from `gpgckohat.vercel.app` and fill it in.

**That URL turned out to be a dead end**: it's a deployment of this repo's own `legacy-vite-src/` with no backend behind it — an empty `<div id="root">`, a JS bundle with no hardcoded content and no API base URL, and every page in the legacy source fetches from the old (now-unreachable) ASP.NET API. Confirmed this three ways (raw HTML, source inspection, hitting the `/api/*` paths directly) before giving up on it rather than guessing.

With your go-ahead, I instead web-searched for the real Government Postgraduate College Kohat and sourced facts from Khyber Pakhtunkhwa's official Higher Education Department portals (`admission.hed.gkp.pk`, `hed.gkp.pk`, `kp.gov.pk`): founded 1953 as an Intermediate College (23 students, 6 lecturers, rented building), 109-Kanal campus, BS 4-Year programs in 12 disciplines (up from 8 since 2010), Intermediate seat counts by stream (Pre-Medical 120, Computer Sciences 100, Pre-Engineering 60, Arts/Humanities 20), address/phone/email, and the departments explicitly named in admission documents (Zoology, Urdu, Statistics, Political Science, Chemistry, Economics, English).

Populated via a one-off script against the service-role client (data, not schema — doesn't belong in `supabase/migrations/`, and isn't dev fixture data either so it doesn't belong in `seed.sql`): `site_settings` (`AboutUs`/`OurMission`/`OurHistory`/`WelcomeToOurInstitution`/`WhyChooseOurInstitution` — the exact keys the Home/About pages read), `footer_info`, `contact_info` (4 rows), `campus_locations`, `institution_faculties` (Science / Arts & Humanities, with real department names in each), `portal_quick_stats`, `portal_features`, one `program_categories` row ("Intermediate (FA/FSc)") with its 4 real `program_details` rows, and a real `description` on each of the 5 existing fixture departments.

**Deliberately left blank rather than invented at the time**: `OurVision`, `PrincipalName`/`leadership`, `office_hours`, `program_fees`/`additional_fee_*`, `faculty_directory`/`faculty_categories`. You supplied the real values for all of these directly in the next message — see §10.1.

### 10.1 Follow-up: principal, vision/mission, office hours, fees, and a 37-person faculty directory

You provided the specific real values that were missing from public search results. Populated the same way (one-off service-role script, no repo changes):

- **`site_settings`**: `PrincipalName` = "Prof. Hamid Ullah Jan"; `OurVision` = "To have a High-Valued Educated Society."; `OurMission` replaced with the college's actual stated motto ("Let's Work Together to Achieve the Best...") rather than the generic founding-purpose text used as a placeholder before.
- **`leadership`**: one row for the Principal (no quoted message given, so `message` stays null rather than inventing one).
- **`office_hours`**: Monday–Saturday 8:00 AM–2:00 PM, Sunday closed.
- **`program_fees`**: real Intermediate admission/tuition figures, kept separate for FA (750 total) vs FSc/Computer Sciences (800 total) since their tuition genuinely differs (Rs. 500 vs Rs. 550). Added a second `program_categories` row ("BS 4-Year") with 4 tuition-only entries (Science/Arts × semesters 1–4/5–8) — **labeled "(tuition only)" in the program name itself**, because the BS fee structure you described also includes registration/social-work/internal-evaluation/sports/security/hostel components without amounts, and a `total_fee` that silently omitted those would be more misleading than not showing a number at all.
- **`additional_fee_categories`/`additional_fee_items`**: the itemized Intermediate charges that don't fit the 3-column `program_fees` shape — General Fund, College Security, the 5 hostel line items, and the 2 Computer-Science-specific items — exactly what this table pair exists for.
- **`downloads` — still not populated, and won't be without real files**: you listed real document *titles* (Prospectus, Admission Policy-2025, etc.), but `downloads.file_path` points at an actual object in the `public-assets` Storage bucket, and inserting rows with no real file behind them would produce dead download links, which is worse than the page's current "nothing published yet" state. `download_categories` (Admission Schedule, Jurisdiction Area, Prospectus) also wasn't added standalone — empty categories with no downloads under them aren't worth creating yet. This one genuinely needs the actual PDFs, not just their names.
- **`faculty_categories`/`faculty_directory`**: 8 categories (English, Computer Science, Chemistry, Mathematics, Physics, Statistics, Botany, Zoology) and 37 real named faculty members, linked to the matching operational `departments` row where one exists (English/CS/Chemistry/Math/Physics — Statistics/Botany/Zoology had no operational department row at the time, so `department_id` was null for those; fixed in §10.2 below). Followed your explicit source preference where the two lists you gave disagreed: the HED portal's newer official records for English/Computer Science/Chemistry, the college's own faculty page for Physics/Mathematics/Statistics/Botany/Zoology (departments HED didn't cover). Designations included where given; qualification/specialization/email/phone/publications_count left null rather than invented — none of that was in what you provided.

### 10.2 Follow-up: the real 12-department list

You gave the complete, correct list of 12 departments (the same "12 disciplines" figure sourced earlier, now with actual names): Botany, English, Computer Science, Chemistry, Economics, Geography, Mathematics, Political Science, Physics, Statistics, Urdu, Zoology. Only 5 existed as operational `departments` rows (the original dev fixture: CS, Physics, Chemistry, Mathematics, English) — added the 7 missing ones (Botany, Economics, Geography, Political Science, Statistics, Urdu, Zoology) with new codes (BOT/ECO/GEO/POL/STAT/URD/ZOO, none colliding with the existing CS/PH/CH/MA/ENG) and real `description` text, via the same one-off service-role script pattern.

This is operational data, not just CMS content — `departments` is the real scoping table `courses`/`admissions`/`profiles`/RLS/registration-numbers all key off — so unlike the pure-content tables in §10/§10.1, this one is a genuine schema-data change to the live college structure, done additively (pure inserts, nothing existing modified or renamed).

Also reconciled from the earlier pass: the 11 Statistics/Botany/Zoology faculty members created in §10.1 with `department_id = null` (because those departments didn't exist yet) are now correctly linked to their real department rows. Added `faculty_categories` for Economics/Geography/Political Science/Urdu too, so the Faculty page's tab list matches all 12 real departments — those 4 tabs are currently empty (no named faculty found for them yet), which is honest rather than a bug. Updated the two `institution_faculties` rows (Science / Arts & Humanities) to list the corrected, complete department split.

### 10.3 Follow-up: complete 141-person staff list from an official HED MIS export

You uploaded the real "Permanent Staff | HED MIS" export (dated 04-09-2025, `Export By: GPGCKOHAT`) and asked to wipe the faculty directory and replace it with everyone in it. Wholesale replaced `faculty_directory` (deleted the 37-person set from §10.1/§10.2, which is now superseded by this authoritative source) and rebuilt `faculty_categories` from the document's actual 19 subjects plus one `Administrative & Support Staff` catch-all for the 49 non-teaching roles (clerks, lab staff, chowkidars, cooks, etc.) the document also lists — all 141 rows, exactly as given.

**One thing flagged rather than done silently**: the source document includes each person's personal mobile number, and reads like an internal HR/MIS export (it has `Profile Status`/`Charge Taken` workflow columns aimed at HED staff, not a public directory). Populated everyone's name, designation, and subject/category, but left `faculty_directory.phone` unset for all 141 — publishing that many personal phone numbers to a public website by default isn't something to do without asking, even though the underlying data came from you directly. Told you this before running the script rather than after. If you actually want the numbers public, that's a one-line change to add back.

`department_id` was linked wherever the subject matches one of the 12 real operational departments (77 of 141 rows — the teaching staff in Botany/Chemistry/Computer Science/Economics/English/Geography/Mathematics/Physics/Political Science/Statistics/Urdu/Zoology); the rest (Islamiat, Pakistan Study, Library Science, Biology, HPE, History, Management Sciences, and all non-teaching roles) have no matching operational department and so stay unlinked — consistent with how §10.1/§10.2 handled the same situation, not a new rule invented for this pass. Also corrected one thing the earlier web-search-sourced list got wrong: Abdul Khaliq's subject is **Biology**, not Zoology as the earlier (less authoritative) source implied — this document is the more authoritative one, so it wins.

### 10.4 Follow-up: phone numbers added, with a real access boundary — not just left out

You confirmed you want the mobile numbers in, with the constraint from §10.3 kept: public can't see them, signed-in users can. This isn't something Row Level Security can express on its own — RLS controls which *rows* a query returns, not which *columns*, and `faculty_directory`'s existing policy (`for select to anon, authenticated using (true)`, from `0009_public_content.sql`) already allows both roles to read every row. Hiding one column from one of those roles needed the same tool already used on `profiles` for column-restricted `UPDATE` (`0002_profiles_and_orgs.sql`), applied here to `SELECT`:

- **`0033_faculty_directory_phone_privacy.sql`**: `revoke select on faculty_directory from anon`, then `grant select` back on every column except `phone`. `authenticated` (any signed-in user — every role in the app, not a separate "staff" tier) keeps its full-column grant untouched.
- **`app/(public)/faculty/page.tsx`**: had to change regardless of the grant, not just because of it — `select("*")` as a signed-out visitor now throws `permission denied for table faculty_directory` (Postgres denies `SELECT *` if the role lacks privilege on *any* selected column, it doesn't silently drop the restricted one). Split into two branches: signed-in visitors get `select("*")` (including `phone`); signed-out visitors get an explicit column list that omits `phone`, with the field normalized back to `null` so both branches type-check as the same row shape. No component-level rendering change was needed — the JSX already did `{faculty.phone && (...)}`, so an absent value just doesn't render.
- **Live-verified** with the anon key and a disposable signed-in account: `select("*")` and even an explicit `select("id, phone")` both fail for `anon` with `permission denied`; the safe-columns query still returns rows fine; a signed-in test student can read `phone` values without issue.

140 of 141 people have a phone number now (row 122, Sher Muhammad Khan, had none in the source document).

### 10.5 Follow-up: Heads of Department, Coordinator/Controller, and BS(Hons)/Associate Degree programs

You gave the HOD for 12 departments plus three named academic-affairs positions and the standard program structure. Handled at the content level, not the account level — explained below.

- **Programs**: unambiguous and done in full. The `programs` table (distinct from the richer `program_categories`/`program_details` pair behind the dedicated `/programs` page — this simpler one feeds the About page's per-department "Programs Offered" list) was empty. Added 2 rows per department × 12 departments = 24 rows: "BS (Hons) - 4 Year" and "Associate Degree - 2 Year", exactly matching what you said applies to all of them.
- **11 of 12 HODs, plus Coordinator/Controller/Intermediate Coordinator**: matched by exact name against `faculty_directory` (verified each match was unique before writing anything), then appended the role to their existing `designation` (e.g., "Associate Professor" → "Associate Professor / Head of Department") and added "Head of Department: {name}." to the relevant `departments.description`. Niamat Ullah → Intermediate Coordinator, Muhammad Altaf Khan → Coordinator, Tanzeel ur Rehman → Controller of Examinations, appended the same way.
- **Urdu HOD not set — flagged, not guessed**: you named "Javed Iqbal" as Urdu's HOD. The only "Javed Iqbal" in the database is a Bearer (support staff, from the §10.3 HED MIS import) — not a member of the Urdu department's teaching faculty at all, and none of the 4 real Urdu faculty members (Sajjad Ahmed, Hussain Mahmood, Zia ur Rehman, Riasat Mehmood) match that name. Rather than either silently mislabeling a support-staff member as a department head or silently picking one of the 4 Urdu faculty at random, left it unset and am flagging it back to you directly.
- **What this deliberately does NOT do**: none of this creates a real login/dashboard account. `departments.hod_profile_id` (the operational field an actual "department" role account would occupy — with real dashboard access, RLS-scoped data, the works) still points at nothing for all 12 departments, and no `coordinator`/`controller` accounts exist either. Provisioning a real account requires a real email address (the invite flow in `lib/actions/provision-staff.ts` sends mail to it) — none of the source documents you've provided so far included staff emails, and inventing placeholder ones would create logins nobody can ever access. Everything in this pass is public-content-level ("who holds this title," shown on the public site) rather than account-level ("who can log in and act with this role's permissions"). If you want any of these 14 people to actually have dashboard access, their real email addresses are what's needed next.

**Resolved**: you confirmed Urdu's Javed Iqbal is a real, different person — transferred in from another college since Feb 2026, which is exactly why he isn't in the September 2025 HED MIS export used in §10.3. Added him as a new `faculty_directory` row (Urdu, "Head of Department" — no academic rank given, so none was invented; unlike the other 11 HODs, his designation doesn't get an "Associate/Assistant Professor /" prefix) rather than either reusing or renaming the unrelated Bearer record, which stays untouched. Urdu's `departments.description` updated the same way as the other 11. One thing with nowhere to go: there's no field in `faculty_directory` for a join date or transfer note, so "since Feb 2026" isn't recorded anywhere — only the designation and department assignment are.

### 10.6 Follow-up: Principal's and Minister's homepage messages

Populated `PrincipalShortMessage`/`PrincipalFullMessage` and `MinisterName`/`MinisterShortMessage`/`MinisterFullMessage` — the exact `site_settings` keys `HomePage.tsx`'s `LeadershipMessages` component already reads (`app/(public)/page.tsx` §"leaders" array, filtered to only render a card when `name` is set). No code change was needed: the Minister box simply didn't render before because `MinisterName` was empty, and now does.

**Flagged, not silently resolved**: the Principal's full message you gave signs off "Dr. Javed Iqbal / Principal" — directly contradicting the Principal's name you confirmed earlier (Prof. Hamid Ullah Jan, §10.1), and reusing the same name just assigned to the new Urdu HOD in §10.5 (almost certainly a different person, but worth you double-checking it isn't a copy-paste mix-up on your end). Stored the message text exactly as given, but deliberately did **not** overwrite `PrincipalName` based on a signature line inside a message body — that's the kind of quiet, easy-to-miss inconsistency that's worse to "helpfully" resolve than to surface. `PrincipalName` still reads "Prof. Hamid Ullah Jan"; the message underneath it is signed by a different name until you tell me which one is actually correct.

### 10.7 Bug fix: Departments page and Programs "BS 4-Year" tab both reading the wrong/missing source

You reported the public `/departments` page showing "Head: Not yet assigned" and "Faculty 0" for every department despite everything in §10.5, and the `/programs` page's "BS 4-Year" tab showing nothing.

- **`/departments` — a real bug, not expected behavior.** It was reading `departments.hod_profile_id` and `profiles.role = 'faculty'` — the *operational* tables for real login accounts, which are correctly empty (§10.5 was explicit that nothing in this content-population effort provisions real accounts). Switched both to read `faculty_directory` instead, the actual populated staff directory — an informational public page has no reason to require a real login account to exist before it can say who the department head is. Student counts still come from real `profiles` rows (accurately low/zero for now) — that one's legitimately operational data and wasn't touched.
- **`/programs` "BS 4-Year" tab — not a bug, a gap.** The category row existed (added in §10.1 purely to hold `program_fees` tuition data) but never got any `program_details` rows under it, so the tab correctly rendered nothing — there was nothing to render. Added one "BS (Hons) {Department}" row per real department (12 rows, 4-year duration, Intermediate-or-equivalent eligibility).

### 10.8 Refused: bulk account creation with phone numbers as passwords

You asked for real login accounts for all 142 staff, phone number as the password. Declined, for two independent reasons rather than one fixable blocker:

1. **No real emails.** This app's account system is entirely email-based — `provisionStaffAction` invites by email and the person sets their own password from the link; nothing in `lib/actions/` or `lib/actions/provision-org-admin.ts` creates a login any other way. None of the source documents so far included staff emails, and inventing plausible ones (`firstname.lastname@gpgckohat.edu.pk`) wasn't done — that's fabricating real people's contact details, with real downstream risk if the address turns out to belong to someone else or gets claimed later.
2. **Phone-as-password would have been refused even with real emails.** Every one of those numbers already sits in `faculty_directory.phone`, visible to any signed-in user (§10.4) and low-entropy/guessable to begin with. Using it as a login credential would let anyone who knows or guesses a colleague's number act as them — read grades, submit results, whatever that role can do. The app's existing invite-only flow (admin never sets or knows a password) already avoids this class of problem; this would have been a deliberate regression from it.

**Not closed, just blocked on you**: get real institutional email addresses for any of these people and the existing `provisionStaffAction`/`provisionOrgAdminAction` flows handle the rest — real invite email, they set their own password, no code changes needed.

### 10.9 Admission requirements populated, with two scoping decisions confirmed with you first

The Academic/Test/Additional requirements you gave (16 years of education, GAT, research proposal) read as graduate/postgraduate admission criteria, but the system only has "Intermediate (FA/FSc)" and "BS 4-Year" categories — neither logically requires an already-completed Bachelor's to apply. Asked rather than guessed; you chose to file them under BS 4-Year anyway. Separately, "General Requirements for All Programs" (Eligibility Criteria + Document Verification, 10 items) doesn't fit the page's fixed 3-column layout (Academic/Test/Additional only, in `app/(public)/requirements/page.tsx`'s `COLUMNS` constant) — no "applies everywhere" concept exists in it. You chose duplication over a code change.

Populated `program_requirements` (29 rows, previously empty) accordingly: the 9 BS-specific items under "BS 4-Year" only (3 Academic, 3 Test, 3 Additional); the 10 general items duplicated into both categories, split into the two columns that exist — Eligibility Criteria → Academic, Document Verification → Additional (there's no separate "Eligibility"/"Document" column, so these were the closest honest fit). Final counts, verified live: Intermediate (FA/FSc) — 5 Academic, 5 Additional; BS 4-Year — 8 Academic, 3 Test, 8 Additional.

### 10.10 Decided: staff logins stay email-invite-only, no phone-login work started

You asked about switching the initial identifier from email to mobile number, with email requested/verified after first login. The "verify email after first login" half is ordinary, safe Supabase work (`updateUser({ email })` + confirmation link) whenever it's needed. The other half isn't just a code decision — phone number can't be both the identifier and a secure credential (the same problem as §10.8, differently framed), so making it work for real requires one of: an SMS provider (Twilio or similar) connected in the Supabase dashboard for OTP login, or a generated temporary password distributed to 142 people through some offline channel neither of us has right now. Laid out both real costs rather than picking one silently. You chose to wait for real staff emails instead — no new infrastructure, no distribution problem, and it's the flow already built and live-verified. No code changes made; this is a decision record, not an implementation.

### 10.11 First real staff account provisioned: Asim Wadood (Computer Science, faculty)

You gave one real email (`aasim.wadood@gmail.com`), matching the "Asim Wadood" already in `faculty_directory` as a Computer Science Lecturer (§10.3, the HED MIS import). Provisioned for real through the exact same path `provisionStaffAction` uses — `inviteUserByEmail`, then set `role = 'faculty'`, `department_id` = Computer Science on the resulting `profiles` row, an `audit_log` entry noting this went through a script rather than the app UI (no signed-in admin caller to attribute it to, so `actor_profile_id` is null). Verified the resulting row live: `role: faculty`, correct `department_id`, `is_active: true`.

**Flagged before sending, not after**: the invite's confirmation link points at `NEXT_PUBLIC_SITE_URL`, currently `http://localhost:3000` — this app isn't deployed anywhere public yet. The email is real and was actually sent, but the link inside it only resolves for whoever opens it on this same machine while `npm run dev` is running. This is fine for a first self-test account; it is not a workable way to onboard anyone else until the app has a real deployed URL and `NEXT_PUBLIC_SITE_URL` is updated to match.

### 10.12 "Our Leadership" section populated: Principal, both Coordinators, Controller, all 12 HODs

Added 15 rows to `leadership` (which already had the Principal from §10.1) — nothing new to source, just moving already-confirmed people from §10.5 into the table that feeds the About page's "Our Leadership" grid: Controller of Examinations (Tanzeel ur Rehman, labeled "(BS/Intermediate)" since only one name was ever given for that role, not two), Coordinator (BS) (Muhammad Altaf Khan), Coordinator (Intermediate) (Niamat Ullah), and all 12 HODs with their department.

**A real bug in my own script, caught before it shipped**: the first insert set the Controller's `title` field to his own first name ("Tanzeel") instead of an honorific, which would have rendered as "Tanzeel Tanzeel ur Rehman" on the page — a leftover from a `.split(" ")[0]` expression that should never have been there. Caught it by reading back what was actually inserted rather than trusting the script ran correctly, and fixed it with a follow-up update before saying anything was done.

### 10.13 Correction: Controller of Examinations is two people, split by level

You corrected the combined "Controller of Examinations (BS/Intermediate)" entry from §10.12: it's actually two separate people — Tanzeel ur Rehman for BS, Niamat Ullah for Intermediate. Updated Tanzeel's `leadership` position to "Controller of Examinations (BS)" and added a new row for Niamat Ullah as "Controller of Examinations (Intermediate)" — **added, not swapped in**: nothing you said suggested he stopped being Intermediate Coordinator (§10.5), so that row stays alongside the new one; he now holds both listed roles, which is unremarkable for a small college. Mirrored both changes into `faculty_directory.designation` so the two tables stay consistent with each other. Verified both records read correctly afterward.

### 10.14 Four corrections: Abdul Khaliq's department, Javed Iqbal's rank, ranked ordering, and a full Faculties rebuild

- **Abdul Khaliq is Zoology, not Biology.** §10.3 had flagged this as the *more* authoritative HED MIS source correcting an earlier guess — you've now corrected that correction with firsthand knowledge, which wins. Moved his `faculty_directory` row to the Zoology category and department (designation unchanged: Assistant Professor). The "Biology" category existed only because of him; with zero members left, deleted it rather than leaving a dead tab on the Faculty page.
- **Javed Iqbal (Urdu HOD) is a Professor.** §10.5 deliberately left his designation without a rank since none was given at the time (he wasn't in the HED MIS export at all — he transferred in after it was taken, §10.5/§10.6). Now set: `designation = "Professor / Head of Department"`.
- **Faculty page now orders each tab by academic rank.** Previously ordered by `display_order` (original HED MIS row order), which wasn't rank-sorted within a filtered single category. Added a `rankOf()` helper to `app/(public)/faculty/page.tsx` (Professor → Associate Professor → Assistant Professor → Lecturer → everything else, e.g. non-teaching designations) and sort each tab's member list by it before rendering. Checks "Associate/Assistant Professor" before the plain "Professor" substring match, since both contain it.
- **Homepage "Faculties" section rebuilt around the real 12 departments, not 2 broad umbrella groups.** The 2 existing rows ("Faculty of Science" / "Faculty of Arts & Humanities") were the only content that table ever had, dating back to the initial round of content population before any of the real department/HOD work — read literally, "render all Faculties" wasn't satisfied by 2 broad groupings when the rest of the site had long since moved to the real 12. Replaced them with one card per real department: `dean` now shows the real HOD ("Head of Department: {name}"), `programs` pulled from the already-populated `programs` table (BS (Hons)/Associate Degree), `description`/`full_detail` reused from `departments.description`, and each given a distinct gradient for visual variety. This was an interpretation call, not a literal instruction (you didn't say "one card per department" explicitly) — flagging it as such rather than presenting it as the only possible reading.

### 10.15 Login switched from email to username

You asked for this partway through creating a batch of test admin accounts (which hit Supabase's default email rate limit after 2 of 10 — `admin` and `principal` succeeded, the other 8 are still pending). Implemented as a genuine architecture change, not a UI relabel:

- **`profiles.username`**: added nullable + unique index (`0034`), backfilled for the 3 existing accounts (`asim.wadood`, `test.admin`, `test.principal`), then set `NOT NULL` (`0035`). `handle_new_user()` (the `auth.users` signup trigger) updated to set it from `raw_user_meta_data`, falling back to the email local-part only in the unlikely case nothing was provided.
- **Supabase Auth itself is still email-based underneath** — that's not something this app controls. `loginAction` resolves username → email server-side via the admin client (never exposed to the browser as its own endpoint, which would otherwise be a username-enumeration oracle), then signs in with the resolved email exactly as before. Live-verified: correct resolution, wrong-password rejection, unknown-username handling, and unique-username enforcement.
- **New accounts need a username to ever log in**, so this had to extend past just `loginAction`: `registerAction`/the register form now collect a student-chosen username (email is still collected too — the signup confirmation link needs a real inbox regardless of how login works afterward); `provisionStaffAction` and `provisionOrgAdminAction` now auto-generate one via `lib/utils/username.ts` (slugified full name, numeric suffix on collision) and **surface it back to the inviting admin** in both provisioning dialogs — without that, there'd be no way to tell a new hire what their login actually is.
- **`forgotPasswordAction` intentionally left email-based** — password reset delivery needs a real inbox no matter which identifier login uses, so there was nothing to gain by changing it, and doing so would've added complexity for no benefit.

**Practical note for you**: your existing accounts now log in as `asim.wadood`, `test.admin`, and `test.principal` (not their email addresses). The 8 remaining test accounts from the interrupted batch can be finished once Supabase's email rate limit resets — say when you want me to pick that back up.

**Follow-up**: widened back to accept either — the login field ("Username or Email") auto-detects which one was typed (presence of `@`) and resolves accordingly; only the username path needs the server-side lookup. Live-verified both.

### 10.16 All 10 admin-type test accounts created, with real passwords instead of invite emails

Deleted the 2 leftover accounts from the interrupted batch (`test.admin`, `test.principal`) and recreated all 10 admin-type roles (`admin`, `principal`, `controller`, `coordinator`, `department`/HoD, `administration`, `hed_admin`, `directorate_admin`, `jmc_admin`, `college_admin`). This time via `auth.admin.createUser()` with a directly-set random password instead of `inviteUserByEmail()` — no email sent at all, which sidesteps the rate limit that stopped the previous attempt at 2/10, and means the credentials could be handed over immediately rather than waiting on a click-through.

This is a different trust situation from the invite flow used for real staff (§10.11 onward): those are other real people, so the app never sets or knows their password — they set it themselves via the emailed link. These 10 are the account owner's own test/access accounts, requested directly, with real generated passwords told to them directly in this conversation — not the "phone number as password for 142 people" pattern that was declined earlier (§10.8), which was refused specifically because it would have been low-entropy and already-visible-elsewhere credentials for other people's real accounts, not a one-off exchange with the account owner about their own access.

`department` (HoD) was given Computer Science; `directorate_admin`/`jmc_admin`/`college_admin` were scoped to the real Directorate of Higher Education KP / JMC Kohat / GPGC Kohat rows respectively. Spot-verified one full sign-in live before handing over credentials.

### 10.17 Real bug found: every dashboard crashed on first real page load

Logging into one of the new accounts hit a bug that had been latent since Phase 6: **"Functions cannot be passed directly to Client Components"**. `DashboardNavItem.icon` was typed as `LucideIcon` — a component reference — populated directly from `lucide-react` imports inside each dashboard's `layout.tsx` (a Server Component) and passed as a plain prop to `DashboardLayout` (a Client Component, `"use client"`). A component reference is a function; only serializable data or already-rendered JSX can cross the Server→Client boundary, so this could never have worked. It didn't surface earlier because nothing in this entire migration had actually loaded a dashboard in a real browser until just now — every phase was verified via direct RLS/RPC checks against the live database (documented repeatedly throughout this plan as a known gap: no headless browser available in this environment), never a real page render.

Fixed the same way the public pages already solve this exact problem (`Icon({name})` lookups in `app/(public)/page.tsx` and `contact/page.tsx`): icons are now referenced by name (string), and `DashboardLayout` owns a `NAV_ICONS` lookup map + `NavIcon(name)` helper that resolves and renders them internally. Updated all 12 dashboard `layout.tsx` files to pass icon names instead of component references, and removed their now-dead `lucide-react` imports.

Two casualties caught before committing, not after: the regex used to bulk-convert `icon: ComponentName` → `icon: "ComponentName"` across 12 files missed `Building2` (the character class didn't include digits), and `student/layout.tsx`'s `User as UserIcon` import alias didn't match the lookup map's `"User"` key. Both would have silently fallen through to the map's fallback icon rather than erroring, so these were caught by reading the diff, not by the build. `npm run build` is clean; a live dev-server smoke test confirmed the route still serves correctly (a separate instance, port 3001 — didn't touch your own running `npm run dev` on 3000).

**Worth being direct about**: this bug existing in every single dashboard, undetected through 15+ phases of "complete" work, is the sharpest illustration yet of the gap this plan has flagged repeatedly — RLS/RPC verification against the live database is real and was done thoroughly, but it is not the same thing as a page actually rendering in a browser. The first genuine page load surfaced a bug that no amount of database-level checking could have caught.

### 10.18 Principal's real photo added, plus two more image gaps found the same way

You provided a real photo of Prof. Hamid Ullah Jan. Getting the file itself surfaced an environment quirk worth recording: my Bash tool could `ls` your Desktop folder (metadata) but not open individual files in it (a macOS Desktop-folder privacy restriction, most likely) — and separately, macOS's own screenshot filenames use a narrow no-break space rather than a regular space, so even a correctly-typed literal path silently didn't match until referenced via a shell glob instead. Once copied into the scratchpad by hand, both were non-issues.

Uploaded to the `public-assets` Storage bucket, wired into `leadership.photo_path` (Principal's row) and a new `PrincipalPhotoUrl` site_setting. Verified the public URL resolves (HTTP 200) before committing.

**Two more real gaps found and fixed while doing this — not just the one photo**, matching the pattern from §10.17 (real bugs only surface once a page actually renders):
- The homepage's Principal's/Minister's Message cards hardcoded nonexistent placeholder paths (`/images/javed.jpg`, `/images/cm.jpeg`) instead of reading from `site_settings` like every other field on those cards already did — every page load was silently requesting two images that could never exist. Now reads `PrincipalPhotoUrl`/`MinisterPhotoUrl`, falling back to `ImageWithFallback`'s placeholder (§ earlier fix) when unset instead of a guaranteed 404.
- The About page's "Our Leadership" grid never rendered `leadership.photo_path` at all — the code only ever built an initials avatar, regardless of whether a photo existed. Would have silently ignored this exact photo even after it was correctly stored. Fixed to render the real photo via `ImageWithFallback` when present, initials otherwise.

### 10.19 The real Admission Policy, and a storage bucket that could never have held one

You provided the complete, real text of the official "Admission Policy for Government Colleges (Male & Female) in Khyber Pakhtunkhwa" — 22 sections covering eligibility, age limits, documents, seat quotas (Intermediate and BS/AD, with the full percentage tables), merit determination, cancellation, refunds, migration, and more. This is the province-wide policy GPGC Kohat's own admissions operate under.

This is a genuinely different situation from §10.3's "Admission Policy-2025" gap: there, only a document *title* existed with no file behind it, and the honest call was to leave it unbuilt rather than create a dead link. Here you gave the complete real text, so there's a real file to make.

**A second real infrastructure gap found in the process, same pattern as §10.17/§10.18 — something only surfaces once you actually try to use it**: the entire public Downloads page (`app/(public)/downloads/page.tsx`) has always pointed every download at the `public-assets` Storage bucket, but that bucket's `allowed_mime_types` (`0010_storage.sql`) was images-only. No document — PDF, prospectus, policy, anything — could ever have been uploaded there. This never surfaced earlier for the same reason as the title-only gap in §10.3: no download row was ever created without a real file, so the broken bucket config sat unexercised. Fixed in `0036`: added `application/pdf` and `text/plain` to the bucket's allowed types, bumped the size limit to 10MB (from 5MB) for future real document uploads.

No PDF-generation tooling is available in this environment (checked for `pandoc`/`wkhtmltopdf`, neither installed), so the document itself is a complete, clean plain-text file rather than a polished PDF — real and complete content, not a formatting downgrade in substance. Uploaded to `public-assets` at `downloads/admission-policy-kp-govt-colleges.txt`, with a new "Admission Policy" `download_categories` row and a `downloads` row pointing at it. Verified the public URL resolves (HTTP 200) and the Downloads page still builds clean before committing.

### 10.20 How to Apply page rebuilt from the real Admission Policy

You asked to replicate `gpgckohat.vercel.app/how-to-apply` onto this app's own page. Re-checked that URL first rather than assuming — identical empty shell, same JS bundle hash as the original check in §10 (`index-MflB52n1.js`), confirming nothing has changed and there is still genuinely nothing to copy from it.

Used the real Admission Policy text from §10.19 instead, since it actually describes this page's exact subject (the application process and required documents):

- **`apply_steps`** (was empty, so the "Application Process" section rendered nothing) — populated with 6 real steps sourced from the policy's actual process (§3: results announcement → application → processing fee → committee scrutiny; §11(ix): merit list/interview → confirmation).
- **`REQUIRED_DOCUMENTS`** — the previous hardcoded list was an unsourced generic placeholder (asked for a "Degree Certificate," "NOC for employed candidates," "Entry Test Scorecard" — none of which the real policy requires at Intermediate/BS/AD level). Replaced with the real 11-item list from the policy's §6.
- **Removed an unverified "PKR 2,000 application fee" figure** that had no source anywhere in what's been gathered — replaced with a pointer to the Fee Structure page (which does have real, sourced figures, §10.1) and a download link to the full policy.
- **"Important Notes" rewritten** to match real policy provisions instead of generic boilerplate — and dropped one claim ("the college reserves the right to cancel any application without assigning any reason") that wasn't actually in the source policy at all; the real cancellation grounds (§15 of the policy) are specific and enumerated, not a catch-all.

### 10.21 BS 4-Year Requirements corrected against the real policy

§10.9 flagged the original BS 4-Year Academic/Test/Additional trio as reading like graduate/MS-level criteria (16 years of education as a prerequisite, GAT, a research proposal) rather than BS 1st-Semester undergraduate criteria — you chose to file it there anyway at the time, since no better source existed yet. Now that the real Admission Policy (§10.19) is available, corrected it for real: removed all 9 of those items and replaced them with what the policy actually specifies for BS admission — no subject failures in the preceding exam, university-set minimum marks, the real 22-year male age limit (§5), and a genuinely important correction: **the real policy has no entrance test at all for BS 1st Semester** — admission is purely on Intermediate/HSSC merit percentage — so the fabricated GAT requirement wasn't just unsourced, it was actively wrong. Also added the real supporting-document and merit-adjustment rules from §6/§11 (migration certificate, verified marks sheet, Hafiz-e-Quran bonus marks, the per-year merit deduction). Left the generic "General Requirements" items (Pakistani national, no criminal record, etc.) alone — they weren't specifically flagged as wrong and don't conflict with the real policy, just aren't sourced from it; correcting them wasn't part of what was asked.

## 11. Phase 16 (in progress): Recruitment / Appointment System

**Status: built, `npm run build` clean, migrations applied to the live project.** You brought a large three-part spec: (1) rebuild the public site as multi-college, (2) a full Recruitment/Appointment workflow, (3) a functional audit of every existing workflow. Given the size — each part alone is a multi-week effort — the three were explicitly **not** attempted together. You chose to scope only Part 2 in full for this phase; Part 1 (multi-college public site) and Part 3 (audit-and-fix, report-first per your instruction) remain unstarted, tracked for their own future phases.

Three decisions you made before any code was written, all load-bearing for the design below:
- Job applicants get their **own account type**, not the `student` role — they're external candidates, not people inside the institution.
- Appointment-order issuance (Part 3 of the pipeline's back half) is a separate, more-privileged action than the rest of recruitment management.
- The future workflow audit (§ not yet started) will be report-first, fixes only after your review — noted here for continuity, doesn't apply to this phase's own work.

### 11.1 Why applicants can't just be `auth.users` rows like everyone else

The existing `handle_new_user()` trigger (0002, tightened in 0035) unconditionally inserts a `profiles` row — with `role = 'student'` — for any new `auth.users` row that doesn't already have one, including ones created by the admin/service-role client (staff provisioning already relies on this: it lets the trigger fire, then overwrites the row). A job applicant is not a student or staff member and must never end up in `profiles`/`user_role` at all — that table and its ~65 dependent RLS policies are the wrong home for someone who may never have any relationship with the institution beyond a single job application.

Fix (0038): `handle_new_user()` gained one guard clause — `if new.raw_user_meta_data ->> 'account_type' = 'applicant' then return new; end if;` — checked before the existing student-insert logic. Applicants get a parallel `applicant_profiles` table instead, created explicitly by `applicantRegisterAction()` (mirroring `provisionStaffAction()`'s two-step admin-client pattern, not the public `registerAction()`/trigger-only path). This is additive and touches nothing about how the trigger behaves for anyone else.

### 11.2 Schema and RPC pattern

Four new migrations (`0037`–`0040`): schema, functions, RLS, storage — split the same way Phase 15 split HED-hierarchy work across multiple files, for the same reason (reviewability). ~13 new tables (`recruitment_advertisements`, `recruitment_positions`, `recruitment_merit_criteria`, `recruitment_required_documents`, `recruitment_applications`, `recruitment_application_experience`, `recruitment_application_documents`, `recruitment_merit_scores`, `recruitment_interviews`, `recruitment_interview_marks`, `recruitment_counters`, `recruitment_appointment_orders`, `applicant_profiles`), one view (`recruitment_application_merit_totals`, recomputed on read rather than a synced column), and 12 `SECURITY DEFINER` state-transition functions (`submit_recruitment_application`, `scrutinize_recruitment_application`, `verify_recruitment_document`, `shortlist_recruitment_candidates`, `schedule_recruitment_interview`, `enter_interview_marks`, `finalize_interview_marks`, `reopen_interview_marks`, `finalize_recruitment_selection`, `issue_appointment_order`, `withdraw_recruitment_application`), following the exact `admit_student()`/`approve_admission_fee()`/`cancel_admission()` pattern from Phase 1: row lock via `select ... for update`, internal role/status re-check, no blanket UPDATE policy on the table it owns. Merit scoring is a configurable per-position criteria table rather than a hard-coded formula, per the spec's own instruction not to fix one formula. Application/appointment-order numbers reuse the exact atomic-counter idiom from `registration_counters`/`admit_student()` (`insert ... on conflict do update set last_seq = last_seq + 1`), scoped per-college instead of per-department.

Role scoping: `coordinator` is the primary owner (per spec), with `admin`/`principal`/`college_admin` given full management access too; `issue_appointment_order()` is further restricted to `principal`/`college_admin`/`admin` only — a coordinator can run the entire pipeline up to a final selection but can't issue the appointment itself. This wasn't explicit in the spec; flagging it as an assumption, not a literal instruction. `hed_admin`/`directorate_admin`/`jmc_admin` get the same additive read-only oversight pattern Phase 15 established (§9.4) rather than a new mechanism.

### 11.3 A real bug: one malformed type broke row-typing for the entire app, not just the new tables

While adding the new tables to the hand-authored `types/database.types.ts` (see §"Regenerating database types" in the README — this file is hand-maintained in this environment, no Docker/linked-project access to generate it for real), the new `recruitment_application_merit_totals` view was declared as `{ Row: RecruitmentApplicationMeritTotalsRow }`, missing the `Relationships: []` field that `@supabase/postgrest-js`'s `GenericNonUpdatableView` constraint requires even for views. A malformed `Views` entry doesn't just fail on that one entry — the whole `Database["public"]` type fails to satisfy `GenericSchema`, which cascades into every `.from(table)` call across the entire codebase resolving to `never` for its row type.

This was **not** caught by writing the code carefully — it was caught by actually running `npx tsc --noEmit` and noticing the error list included dozens of pre-existing, untouched pages (`about/page.tsx`, `contact/page.tsx`, `downloads/page.tsx`, etc.), which is what made it obviously a structural break rather than a typo in the new code. Bisected by stashing just the types file and re-running tsc to confirm the pre-existing pages type-checked fine without it. Fixed with one field (`Relationships: []`); `npm run build` (98 routes now, up from 92) and `npm run lint` both came back clean afterward. Worth remembering for next time this file is hand-edited: a single malformed `Views`/`Tables` entry can silently break type-checking for the entire app, not just the table you touched — always re-run a full `tsc --noEmit`, not just eyeball the diff.

### 11.4 What's built vs. what's still unverified

Built: full DB layer (§11.2), staff-facing Server Actions (`lib/actions/recruitment.ts`) and applicant-facing ones (`lib/actions/recruitment-applicant.ts`), an applicant session helper parallel to `lib/auth/session.ts` (`lib/auth/applicant-session.ts` — the existing `getCurrentProfile()`/`requireRole()`/`loginAction()` can't be reused for applicants; `loginAction()` in particular explicitly treats "authenticated but no `profiles` row" as an inactive-account error, which would incorrectly lock out every applicant), and 14 new routes: public advertisement listing/detail at `/recruitment`, an applicant portal (`/recruitment/register`, `/login`, `/portal`, application form, status tracker, print-stylesheet appointment order — no new PDF library added, matching the fact that no PDF generation exists anywhere else in this app), and a staff dashboard at `/dashboard/recruitment`. That last one is deliberately its own top-level route rather than nested under `/dashboard/coordinator/*` — `CoordinatorLayout`'s own `requireRole("coordinator")` would redirect the other three roles away before a nested layout ever got a chance to run its own, broader check, since role-gating in this app happens once at the layout level and cascades to everything under it.

**Update — migrations applied.** The Supabase CLI turned out to be available locally after all (`v2.114.0`, via a project devDependency at `node_modules/@supabase/cli-darwin-arm64` — the earlier `which supabase` check only looked at the global `PATH` and missed it). You provided the database password directly; ran `supabase migration list --db-url ...` first to confirm exactly which migrations were pending (0037–0040, nothing else), then `supabase db push --db-url ...`, then `migration list` again to confirm all four now show `local == remote`. Followed up with two live checks independent of the CLI's own success report: a REST query against `recruitment_advertisements` (`200 []` — reachable, RLS not erroring, correctly empty since no ad exists yet) and a Storage API check confirming the `recruitment-documents` bucket exists with the right config (private, 10MB, PDF/PNG/JPEG).

### 11.5 Real-account RLS/RPC verification — a critical bug found and fixed

Followed the same live-verification method every prior phase used (§8/§9): created ephemeral, disposable test accounts via the Auth Admin API — one `coordinator` (department set to Computer Science so `college_id` resolves via the sync trigger, confirming the assumption flagged in §11.1's plan was correct to worry about), one `college_admin` (`college_id` set directly), one applicant (`account_type: 'applicant'`) — signed in as each to get real RLS-scoped JWTs, and drove the entire pipeline through the actual REST/RPC endpoints, not the service-role client. First finding, confirming §11.1's design: the applicant signup correctly produced **zero** `profiles` rows.

**A critical, genuinely serious bug surfaced almost immediately**: called `scrutinize_recruitment_application` as the signed-in applicant, expecting `insufficient_privilege`. Instead got an `invalid_status` error — meaning the role check never fired at all. Traced it to `is_recruitment_staff()`: for a caller with no `profiles` row (i.e. every applicant — the first-ever such caller in this app's history), `current_user_role()` returns SQL `NULL`, and `NULL in (...)` is `NULL`, not `false`. Every guard in the new RPCs was written as `if not (is_recruitment_staff() and <scope check>) then raise exception`, and in three-valued SQL logic, `not (null and x)` is `NULL` — which PL/pgSQL's `IF` silently treats as "condition not met," i.e. it does **not** raise. Confirmed directly: `rpc/is_recruitment_staff` returned literal `null` for the applicant token, not `false`.

**Practical impact, verified directly rather than just reasoned about**: with the bug present, the applicant's own `issue_appointment_order` call against their own (unselected, wrong-status) application also returned a domain error instead of `insufficient_privilege` — the privilege gate was open, and only the status precondition happened to block it in this test. This affected every staff-only recruitment RPC (`scrutinize`, `verify_recruitment_document`, `shortlist`, `schedule_recruitment_interview`, `enter_interview_marks`, `finalize_interview_marks`, `finalize_recruitment_selection`, `issue_appointment_order`) plus `reopen_interview_marks` (which checks `current_user_role() in (...)` directly, same flaw). It does **not** affect any of the pre-existing admissions/promotions/FYP functions from earlier phases, because before this phase, every authenticated caller always had a `profiles` row — applicants are the first category of signed-in user this app has ever had with none, and that's exactly what exposed a latent gap in a boolean-logic pattern that had never been exercised this way before.

**Fix** (`0041_recruitment_null_role_fix.sql`): `is_recruitment_staff()` now wraps its result in `coalesce(..., false)`, so it always returns a real boolean — this alone fixes every function that composes through it, since Postgres correctly invalidates and re-plans dependent function calls after `CREATE OR REPLACE FUNCTION`. `reopen_interview_marks()` and `issue_appointment_order()` check role directly rather than through the helper, so each got the same `coalesce` treatment individually. Pushed, then re-ran the exact same two calls that exposed the bug: both now correctly return `403 insufficient_privilege`.

**Then verified the full happy path end-to-end**, live, with real generated identifiers: coordinator opens applications → applicant submits (`GPGC-KOH-REC-2026-000001`, matching the designed atomic-counter format) → coordinator scrutinizes to eligible → shortlists → schedules an interview (bulk-transitions the application to `interview_scheduled`, confirmed) → enters marks → finalizes (locks them) → finalizes selection (`final_rank: 1`, `status: selected`, correct for 1 vacancy/1 candidate) → **coordinator is correctly blocked** from issuing the appointment order (`403`, confirming the deliberate role restriction from §11.2 actually holds at the database level, not just in the UI) → college_admin issues it successfully (`GPGC-KOH/REC/2026/001`, matching the designed order-number format) → applicant can see their own issued order. Also re-confirmed the college-scoping boundary directly: the coordinator's attempt to insert an advertisement under a different college's id was rejected by RLS before any of the above began.

A second, smaller finding along the way, not a bug but worth recording: `INSERT ... RETURNING` under RLS can fail even when the row itself is valid, if the table's SELECT policy needs a fresh cross-table lookup (via a `SECURITY DEFINER` join function like `recruitment_position_college_id()`) rather than a direct column comparison — Postgres re-checks SELECT-visibility for the returned row, and that indirect lookup didn't resolve within the same statement. Confirmed empirically: the same insert succeeded immediately without `Prefer: return=representation`. Checked every `.insert()` call in `lib/actions/recruitment.ts` and `lib/actions/recruitment-applicant.ts` against this — only `startApplicationAction()` chains `.select()` after insert, and it hits the applicant's own direct `applicant_id = auth.uid()` policy (no indirect join), which is unaffected and was confirmed working live. No code changes needed, but worth remembering if a future insert-with-`.select()` is added against a table whose SELECT policy resolves through one of these join-based helper functions.

All test data (advertisement, position, application, interview, marks, appointment order, and the three ephemeral auth accounts) was deleted afterward and confirmed gone — nothing from this verification pass persists in the real database.

**Still outstanding**: an actual browser click-through (this verification exercised every RLS boundary and RPC directly over HTTP, which is stronger than a UI click-through for security purposes but doesn't prove the React forms/pages themselves render and wire up correctly — see §10.17 for why that distinction matters). The project-wide Storage-upload infrastructure bug (§8, still unresolved) will still block real applicant document uploads until it's fixed on the Supabase project side.

## 12. Phase 17: Multi-College Public Website (spec Part 1) — schema, RLS, and public routing applied and live-verified

With Recruitment (Phase 16) done, you asked to start Part 1 — turning the single-college public marketing site into a real multi-college one, each college getting its own identity at `/college/[slug]`, distinguishing global (HED-wide) content from college-specific content, with zero per-college frontend code.

### 12.1 Scope and what was already there

Surveyed before writing anything (an Explore pass, not assumption): the public site (`app/(public)/*`) queries its ~20 content tables completely unscoped — even `departments.college_id`, which already existed and is `NOT NULL` from the earlier HED-hierarchy phase, was being ignored by `app/(public)/departments/page.tsx`. Branding (logo, college name, favicon) is 100% hardcoded JSX in `components/layout/header.tsx`/`app/layout.tsx` — only `footer.tsx` reads from a table (`footer_info`) at all. Of the ~20 content tables, only `faculty_directory`/`program_details`/`department_contacts` have any `department_id` column, and it's nullable on all three, so a transitive join through `departments.college_id` can't reliably cover them — the other ~17 (`site_settings`, `leadership`, `portal_*`, `downloads`, `program_categories`, `apply_steps`, `footer_info`, `contact_info`, `office_hours`, `campus_locations`, etc.) have no path to a college at all.

Decisions made up front, stated so they're easy to redirect: existing bare URLs (`/about`, `/departments`, etc.) become **redirects** to `/college/gpgc-kohat/...` rather than a second duplicated implementation — one canonical page tree; `faculty_directory`/`program_details`/`department_contacts` get their own direct `college_id` column rather than relying on the leaky nullable-department join; admin content management reuses the **existing** admin UI (the one `/dashboard/admin/settings` page, plus the existing college-creation dialog) rather than building a new from-scratch CMS for 20 tables — there wasn't one to begin with, so this was actually the entire admin-UI surface, not a subset of it.

### 12.2 Schema (`0042`–`0044`)

`0042_multi_college_public_site_schema.sql`: branding/identity columns on `colleges` (`slug`, `logo_path`, `favicon_path`, `banner_path`, `principal_name`, `principal_photo_path`, `about_content`, social links, `theme_color`) plus a nullable `college_id` on all ~23 remaining content tables — nullable is the global-vs-college-specific mechanism throughout (NULL shows on every college's site, matching spec's "Global HED/GMC Content"; non-null shows only on that one). `site_settings` was the one structural exception: its PK was just `key` (one row per setting, single college implicit) — changed to `(college_id, key)` with `college_id` **not** nullable, since every college needs its own full settings rather than a shared-bag-with-null-fallback (which wasn't asked for). All of it backfilled to GPGC Kohat's college row in the same migration — not just a schema change, the actual "migrate existing content in place" step from your earlier decision. `0043_multi_college_public_site_rls.sql`: every `"{table}_write_admin"` policy (from `0009`/`0011`/`0012`/`0021`/`0022`) dropped and recreated with one additive `or` branch letting `college_admin` write their own college's rows alongside the existing, unchanged `admin` access.

**A critical gap found live, not by inspection** (`0044_colleges_public_read.sql`): after pushing `0042`/`0043` and building the whole routing tree, a routine anon-role REST check (`GET /rest/v1/colleges?slug=eq.gpgc-kohat` with the anon key) came back empty. Traced it to `colleges` itself — built in the earlier HED-hierarchy phase purely for internal org-hierarchy management, `colleges_select_scoped` (`0027`) only ever granted `authenticated` staff/org-admin roles, and **no policy ever granted anonymous read at all**. Every public page under `app/college/[slug]/*` resolves its college via `getCollegeBySlug()`, which runs through the normal RLS-respecting client — meaning every real anonymous visitor would have hit `notFound()` on every single college page, despite `npm run build` being clean and every other query being correctly scoped. Fixed with one additive policy: `for select to anon, authenticated using (status = 'active')`. This is the same category of lesson as Phase 16's NULL-role-check bug (§11.5) and the RETURNING/RLS quirk before it — a schema/RLS layer bug that TypeScript, ESLint, and even `npm run build` cannot see, only a live request against the real database can.

### 12.3 Routing, branding, and admin UI

New route tree `app/college/[slug]/` (10 pages — home, about, departments, downloads, faculty, fee-structure, how-to-apply, programs, requirements, contact — plus `layout.tsx`) mirrors every existing public page, each resolving its college via a `cache()`-wrapped `getCollegeBySlug()` (`lib/services/colleges.ts`, shared across the layout and every page in one request) and scoping its queries by that college's id. `Header`/`Footer` (`components/layout/`) gained a `basePath` prop threaded through every internal link — so navigating a college's site stays on that college's pages instead of jumping back to a hardcoded one — plus branding props (`collegeName`/`logoPath`/etc.) with defaults matching the original hardcoded GPGC Kohat strings, so anything still rendering without a college context (the new `/colleges` directory page) looks the same as before. The 10 original bare pages (`app/(public)/*`) became one-line redirects to `/college/gpgc-kohat/...`, per the stated decision — the old `contact-form.tsx` at that location became genuinely orphaned once its page redirected instead of rendering, and was deleted rather than left as dead code. New `app/colleges/page.tsx` is the spec's "Select College" directory, listing every active college.

Admin UI: `saveSiteSettingAction` (`lib/actions/site-settings.ts`) now takes a `collegeId`; a new `resolveAdminCollegeId()` helper (`lib/utils/college-scope.ts`) falls back to GPGC Kohat for plain `admin` accounts, which — confirmed by checking `test.admin`/`test.principal`/`test.coordinator` live — don't carry a `college_id` at all today, only `college_admin` reliably does. The college-creation dialog (`components/features/org/org-dialogs.tsx`, used by `hed_admin`/`directorate_admin`/`jmc_admin`) gained a required `slug` field — without one, a newly created college could never resolve a `/college/[slug]` page at all, so this wasn't optional polish.

### 12.4 Live verification

Same method as Phase 16 (§11.5): pushed `0042`–`0044`, then verified over real HTTP rather than trusting the migration's own success report. Confirmed GPGC Kohat's backfill directly — `slug = 'gpgc-kohat'`, `principal_name` correctly derived from the real `leadership` row ("Prof. Hamid Ullah Jan", matching §10.18), every spot-checked table's `college_id` set. Created a throwaway second college (`[TEST] Verify College`, its own slug, one `leadership` row, one `site_settings` row) and confirmed two-way isolation as an anonymous visitor: the test college's scoped query returned only its own row, GPGC's scoped query returned zero rows from the test college. Created one more ephemeral `college_admin` scoped to the test college and confirmed the new RLS write branch: succeeded writing to their own college's `site_settings`, got `403` attempting to write into GPGC Kohat's. All test data (the college, its two content rows, the ephemeral admin account) deleted and confirmed gone afterward. `npm run build`/`npm run lint` clean throughout (99 routes, up from 98 after Phase 16).

**Still outstanding**: a real browser click-through of the new pages (same caveat as §11.5 — the RLS/routing layer is verified, the actual rendered UI isn't yet). Multi-college support for the Recruitment module itself (nesting `/recruitment` under `/college/[slug]/recruitment`) was explicitly out of scope for this phase, per the original plan.

## 13. Phase 18: Workflow Audit (spec Part 3) — report-first, per your earlier instruction

With Parts 1 and 2 done, you asked to start Part 3 — a full functional audit of every existing workflow, not just Admissions/FYP/Promotions as the spec's own examples named, but everything. Per your decision back when this three-part spec was first scoped, this phase is **report-first**: findings only, no fixes applied without your review.

**Method**: five parallel investigations, each given the same rubric (trace frontend → server action → RPC/RLS → actual dashboard query, don't just check that a page renders) across a natural cluster of tables: Admissions; FYP; Promotions & Fee Payments; the academic core (courses/enrollments/timetable/assignments/materials/exam-schedules/results/attendance); and the operational/support tables (announcements/notifications/transcripts/tickets/library/events/scholarships/course-file-reports/role-permissions/audit-log/messages). Each produced a long, file:line-cited report; synthesized into one document at **[`docs/WORKFLOW_AUDIT.md`](WORKFLOW_AUDIT.md)** rather than pasted here verbatim, since five raw agent transcripts would be both huge and repetitive — several findings turned out to be the same structural gap showing up independently in three or four clusters.

**Headline results** (full detail and file citations in `WORKFLOW_AUDIT.md`):
- **The same cross-college RLS gap this session already found and fixed twice** (Recruitment §11.5, the public site §12.2) **turns out to be systemic** — the original 8 roles (`admin`/`principal`/`controller`/`coordinator`/`administration`) were never scoped by college anywhere in admissions, promotions/fees, or the entire academic core, and this was confirmed exploitable via the actual dashboard queries (e.g. `app/dashboard/admin/timetable/page.tsx` selects every college's timetable with no filter), not just a theoretical RLS gap. The inverse problem exists too: `college_admin`, the role meant to run one college, has almost no visibility anywhere outside Recruitment.
- **`enrollments` is never written by any code path in the app** — no action, no form, no admin UI. Since faculty/student rosters for results, attendance, assignments, and materials all resolve through `enrollments`, this single gap makes all four of those otherwise-correctly-built workflows non-operational for real use.
- **A real security gap in FYP**: supervisor identity is never validated server-side at group creation, and the RPC that approves/declines supervision doesn't independently re-check the caller's role — a student could name themselves their own supervisor and self-approve via a direct API call, bypassing the Next.js-layer role check entirely.
- **The FYP lifecycle is stuck** — 5 of its 8 defined statuses have no function anywhere that ever sets them, so no group can progress past initial proposal submission through the app.
- Several fully-built features (notifications, transcript requests, result queries, support tickets, scholarships) turned out to have a working *resolution* side and no *creation* path at all — they can never actually be triggered by a real user.
- The "Role Management" admin screen (`role_permissions`) has zero runtime effect anywhere in the codebase — toggling a permission changes nothing, which is worse than the feature simply not existing, since it looks like it works.

**Not done in this phase, deliberately**: no code changes. The suggested prioritization at the end of `WORKFLOW_AUDIT.md` is a starting point for your review, not a commitment to an order — next step is your call on which findings (if any) to act on.
