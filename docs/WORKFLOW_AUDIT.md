# Workflow Audit — Findings Report

**Status: findings only, no fixes applied.** Per your instruction, this audit is report-first — nothing here has been changed in the codebase or the live database. This document is the deliverable for spec Part 3 ("verify all existing workflows"). See `docs/MIGRATION_PLAN.md` §13 for how this was conducted.

## How this was done

Five parallel investigations, each tracing frontend → server action → RPC/RLS → actual dashboard query for its cluster, not just checking whether a page renders:

1. Admissions (`admission_settings`, `admissions`, `registration_counters`, `admission_documents`)
2. Final Year Project (`fyp_semester_config`, `fyp_groups`, `fyp_members`, `fyp_proposals`, `fyp_deliverables`, `fyp_evaluations`)
3. Promotions & Fee Payments (`promotions`, `fee_payments`)
4. Academic core (`courses`, `course_faculty`, `enrollments`, `timetable_entries`, `assignments`, `assignment_submissions`, `course_materials`, `exam_schedules`, `results`, `attendance`)
5. Operational/support (`announcements`, `notifications`, `transcript_requests`, `result_queries`, `academic_calendar_events`, `library_items`, `support_tickets`, `campus_events`, `scholarships`, `course_file_reports`, `role_permissions`, `audit_log`, `messages`)

Every finding below cites a real file/line. Severity labels: **Critical** (security/data-integrity gap, or a workflow that's completely non-functional despite looking built), **Functional bug** (a real feature gap or incorrect behavior, not a security hole), **Minor** (inconsistency or cosmetic issue).

---

## Cross-cutting themes (read this part first)

Four issues showed up independently across nearly every cluster — these aren't five unrelated bug lists, they're the same handful of structural gaps repeating.

### Theme 1 — Legacy roles (`admin`/`principal`/`controller`/`coordinator`/`administration`) are globally unscoped by college, and this is now a real cross-tenant data-access gap

The app is genuinely multi-college now (Recruitment and the public site both got real college-scoping this session). But the **original 8 roles were never revisited** when the HED hierarchy (Phase 15) or the multi-college site (Phase 17) shipped — every RLS policy for these roles is a bare `current_user_role() in (...)` check with no `college_id` comparison. Confirmed **exploitable via the actual dashboard queries**, not just RLS in theory:

- `app/dashboard/admin/timetable/page.tsx:15-16` — `select("*")` on `timetable_entries`, no college filter.
- `app/dashboard/controller/results/page.tsx:12` — same, on `results`.
- `app/dashboard/principal/results/page.tsx:11-14` — same, on `departments`/`courses`/`results`.
- `app/dashboard/administration/finance/page.tsx:13,24-28` — same, on `fee_payments`/`promotions`. Worse here: `verify_promotion_fee()` only checks `current_user_role() = 'administration'`, so an accountant at College B can verify — and thereby auto-promote — a College A student.
- Confirmed present identically in Admissions (`admissions_select_scoped` unscoped since `0005`, never touched by `0032`) and every academic-core table (`0003`/`0004`/`0023`).

Reinforcing fact from earlier this session: `test.admin`/`test.principal`/`test.coordinator` all have `college_id: null` today — these roles were never even set up to carry a college identity, let alone be scoped by one.

**This is the single highest-value fix in the whole audit** — one consistent pattern (join through `profiles.college_id` or add a denormalized `college_id`, mirroring how `college_visible_to_org_admin()` already works for the newer org roles) would close it everywhere at once, the same way `0032`'s additive-OR-branch pattern already did for `hed_admin`/`directorate_admin`/`jmc_admin`.

### Theme 2 — `college_admin` is the opposite problem: locked out of nearly everything

Where Theme 1 is "legacy roles see too much," `college_admin` (the role actually meant to run one college day-to-day) sees almost nothing: zero visibility into Admissions, zero into FYP, zero into any of the 12 operational/support tables. Its dashboard (`app/dashboard/college-admin/`) is a read-only summary page with no sub-pages at all. Recruitment is the only module that got this right (`college_admin` is a first-class scoped role there). Fixing Theme 1 and Theme 2 together is really one job: give `college_admin` the same additive-OR-branch treatment `0032` gave the three org-hierarchy roles, everywhere it's currently missing.

### Theme 3 — Several fully-built features have no way to ever be triggered

Not bugs in the traditional sense — the resolution/consumption side is often correctly built and correctly gated — but the **creation side doesn't exist**, so the feature can never fire in practice:

- **`enrollments` is never written anywhere in the app.** No action, no form, no admin UI. This single gap is why results, attendance, assignments, and materials are all effectively non-functional for real use — every roster query (`faculty/marks`, `faculty/attendance`, `student/assignments`, `student/materials`) resolves through `enrollments` and comes back empty.
- **`notifications` is fully built (schema, RLS, Realtime, a working bell UI) and never inserted into by any business-logic code.** The bell will always be empty.
- **Transcript requests, result queries, and support tickets** all have a working, correctly-gated *resolution* side (controller/admin queue pages) but **no creation path** — no student-facing form exists for any of the three. The queues can never receive anything through the app.
- **Scholarships** can be displayed but never awarded/created through the app.
- **Courses and `course_faculty`** (who teaches what) have full RLS write support but no UI/action anywhere — they can currently only be set up via direct database access.

### Theme 4 — "Success" is sometimes reported when nothing happened

A recurring pattern: `gradeSubmissionAction`, `deleteMaterialAction`, `deleteTimetableEntryAction`, and the update branches of `submitResultAction`/`markAttendanceAction`'s upserts all skip checking whether their mutation actually matched a row. When RLS silently filters out an unauthorized attempt (standard Postgres/PostgREST behavior — 0 rows affected, no error), these actions still return `{}` (success) to the UI. The authorization boundary itself holds in every case checked — this is a UX-truthfulness bug, not a security bypass — but it can mask both real bugs and probing attempts behind a false "saved" message.

---

## Critical findings

| # | Finding | Where | Impact |
|---|---|---|---|
| C1 | Legacy roles unscoped by college across admissions, promotions/fees, and all 8 academic-core tables | See Theme 1 | Real cross-college data exposure + cross-college write (fee verification → auto-promotion) once a second college has its own staff accounts |
| C2 | `enrollments` never written by any code path | `lib/actions/promotions.ts`, no enrollment action exists anywhere | Results/attendance/assignments/materials are non-operational — every roster is empty |
| C3 | FYP supervisor identity never validated server-side at group creation; `respond_to_fyp_supervision()` RPC doesn't re-check caller role | `supabase/migrations/0007_fyp.sql:88-153,157-186` | A student can name themselves as their own "supervisor" and self-approve their group via a direct RPC call, bypassing the `requireRole("faculty")` check that only exists in the Next.js layer |
| C4 | FYP evaluation scores have no server-side upper bound | `lib/actions/fyp-supervisor.ts:27-48`; only DB constraint is `score >= 0` | The `max=15`-style limits are HTML-only; a supervisor can submit an arbitrary score |
| C5 | FYP lifecycle stuck — 5 of 8 statuses (`proposal_approved` → `completed`) have no function that ever sets them | `supabase/migrations/0007_fyp.sql`; confirmed via full grep, no later migration adds them | No FYP group can progress past initial proposal submission through the app, ever |
| C6 | FYP: a supervisor declining a group permanently locks the student out | `app/dashboard/student/fyp/page.tsx:25-27,89` | No re-request-supervisor path, no archive path reachable — dead end with no error shown |
| C7 | `register_for_promotion()` RPC doesn't replicate the RLS department-scoping it's supposed to mirror | `supabase/migrations/0006_promotions_and_fees.sql:52-91` (security definer, role-only check) | Any `department`/`faculty` account can register courses on another department's student's promotion via a direct RPC call |
| C8 | `role_permissions` / the "Role Management" admin screen has zero runtime effect | `lib/permissions/policies.ts:10-15,49-51` (`canAccess()` has no callers anywhere); `app/dashboard/admin/roles/page.tsx` | An admin can toggle a permission off and nothing changes — actively misleading, not just unused |
| C9 | Public contact form has no spam protection and is never read by anyone | `lib/actions/contact.ts`; RLS `messages_insert_anyone` (`0008_operations.sql:320-321`); no admin inbox page exists anywhere | Trivially floodable; submissions currently go nowhere a human will ever see them |

## Functional gaps (real, but not security issues)

- **Assignment deadlines are not enforced anywhere** — not DB, not RLS, not the action, not even client-side disabling. A student can submit at any time after the due date with no indication.
- **Grades are effectively unbounded** — `assignment_submissions.grade` has no relationship to any per-assignment max-marks field (there isn't one); a faculty member can enter e.g. 999.
- **The results table has no "Final Exam" field**, despite the Controller's own documented policy page stating Final is 40% of the grade — `results.total` is a generated column summing only quiz1/quiz2/midterm/assignments_score. Either the documented policy is stale or a real column is missing.
- **No timetable or exam-schedule conflict prevention at creation time** — `scheduling-conflicts.ts` is read-only, shown after the fact on the Coordinator's Conflicts page; nothing blocks two entries with the same faculty/room double-booked.
- **Storage RLS narrower than table RLS for course materials**: the DB policy grants `department` (own dept) read access to materials, but the Storage bucket policy for the same files omits that branch — a department head can see a material exists but can't download it.
- **Admissions**: `cancel_admission()` allows canceling from `pending`/`fee_approved`/`admitted`, but the UI only exposes Cancel once `admitted` — two of three valid transitions are unreachable. Also: `admin` is authorized in code/RLS for every admissions action but has no dashboard page at all — a pure dead-end, not a gap in enforcement. Also: registration numbers are hardcoded with a `'GPCK-'` (GPGC Kohat) prefix for every college (`admit_student()`), a real correctness bug the moment a second college admits students.
- **Promotions**: `fee_pending` (in the status enum) is never set by any function — appears to be an intentional collapsed state machine per the code's own comment, not an accidental gap, but the enum value is dead weight. `cgpa`/`academic_standing` are never written by any code path despite a comment claiming `max_courses` derives from academic standing — that derivation doesn't exist; `max_courses` is just a fixed default.
- **Announcements**: the publish/draft mechanism (`published_at` nullable) exists in schema and RLS but every announcement is published immediately at creation — no UI ever creates a draft or schedules one.
- **Library**: no lending/checkout workflow exists in the schema at all (by design, not a bug) — `available_copies` is a vestigial column that always equals `total_copies`.
- **Audit log coverage is real but inconsistent** — present for admissions, staff/org provisioning, recruitment, and promotion *fee verification only*; missing from FYP evaluation finalization, results submission, promotion cycle start/course registration, and role-permission changes.

## Minor / cosmetic findings

- `RESOURCE_ROLES` (the UI-visibility map in `lib/permissions/policies.ts`) is unused dead code app-wide — `canAccess()` has zero callers — so every mismatch between it and the real RLS/RPC enforcement (several found across FYP, results, materials, assignments) has no live effect. Worth knowing so nobody "fixes" the map expecting it to change behavior.
- Attendance status `'leave'` exists in the enum but is never written — only `present`/`absent` are ever set.
- FYP: `nominate_fyp_group()`/`archive_fyp_group()` RPCs exist and are correctly gated, but no UI button calls either.
- Realtime publication includes `fyp_groups`/`fyp_proposals` but not `fyp_deliverables`/`fyp_evaluations`/`fyp_members` — live-refresh silently won't fire for those.
- CNIC/phone fields across admissions accept any string up to a length cap — no real format validation. Merit numbers have no positivity check and no DB uniqueness constraint.
- `role_permissions` table itself is readable by any authenticated user (including students) — low-severity information disclosure, given the table is inert (C8).

---

## Per-module quick reference

| Module | Headline status |
|---|---|
| Admissions | Core lifecycle (pending→fee_approved→admitted) works and is correctly guarded; cross-college RLS gap (C1); admin has no UI; registration-number prefix hardcoded to GPGC Kohat |
| FYP | Functionally stuck at first stage (C5); real self-approval security gap (C3); unclamped scores (C4); decline dead-end (C6) |
| Promotions & Fees | Course-cap enforcement is solid; cross-department RPC gap (C7); cross-college RLS gap (C1, most severe instance — includes a write path) |
| Academic core | Blocked end-to-end by the empty-`enrollments` gap (C2); courses/course_faculty have no UI at all; cross-college RLS gap (C1) confirmed via real dashboard queries; no deadline/conflict enforcement |
| Operational/support | Notifications entirely dead (Theme 3); transcript/result-query/ticket creation entirely missing (Theme 3); Role Management screen is decorative (C8); none of the 12 tables have college scoping at all |

---

## Suggested prioritization (not started — awaiting your go-ahead per your original instruction)

If/when you want fixes, a reasonable order given severity and how much shares a single root cause:

1. **C1 + Theme 2 together** — one consistent college-scoping pass (mirroring `0032`'s pattern) across admissions/promotions/fees/academic-core, adding `college_admin` visibility everywhere it's currently missing. Highest blast radius, one coherent piece of work.
2. **C2** (`enrollments` never written) — unblocks results/attendance/assignments/materials, which are otherwise fully built.
3. **C3 + C4** (FYP security gaps) — smallest surface area, most serious individual security issue.
4. **C5 + C6** (FYP lifecycle) — larger effort (needs the missing RPCs for 5 lifecycle stages), but the module is unusable past step one without it.
5. **C7, C8, C9** — each independent, each fairly contained.
6. Functional gaps, roughly in the order listed above.
