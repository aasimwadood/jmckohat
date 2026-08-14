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
