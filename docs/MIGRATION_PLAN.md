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
