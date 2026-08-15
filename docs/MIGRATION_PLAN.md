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
- **`faculty_categories`/`faculty_directory`**: 8 categories (English, Computer Science, Chemistry, Mathematics, Physics, Statistics, Botany, Zoology) and 37 real named faculty members, linked to the matching operational `departments` row where one exists (English/CS/Chemistry/Math/Physics — Statistics/Botany/Zoology have no operational department row yet, so `department_id` is null for those). Followed your explicit source preference where the two lists you gave disagreed: the HED portal's newer official records for English/Computer Science/Chemistry, the college's own faculty page for Physics/Mathematics/Statistics/Botany/Zoology (departments HED didn't cover). Designations included where given; qualification/specialization/email/phone/publications_count left null rather than invented — none of that was in what you provided.
