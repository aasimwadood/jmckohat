-- Multi-college public website, part 3: a critical gap found via live
-- verification (see docs/MIGRATION_PLAN.md §11's Part 1 write-up) —
-- `colleges` (built in the earlier HED-hierarchy phase, 0027) has never
-- had a public read policy at all; `colleges_select_scoped` only covers
-- `authenticated` staff/org-admin roles. Every anonymous visitor to
-- app/college/[slug]/* depends on reading this table (getCollegeBySlug()/
-- listActiveColleges() in lib/services/colleges.ts) to resolve which
-- college's page to render — without this, every public page 404s for
-- real visitors. Additive only: doesn't touch the existing staff-scoped
-- policy, and only exposes `active` colleges (draft/inactive stay
-- invisible publicly, matching the app-layer filtering already in place).

create policy "colleges_select_public" on colleges
  for select to anon, authenticated
  using (status = 'active');
