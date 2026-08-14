-- Home page "Quick Stats" (Students Enrolled / Programs / Years of
-- Excellence / Placement Rate) is a distinct content area from the About
-- page's "Campus Highlights" (portal_stats) — different endpoint in the
-- legacy app (/api/PublicPortal/stats vs /api/PublicPortal/highlights),
-- and needs an icon name, which portal_stats doesn't carry.
create table portal_quick_stats (
  id uuid primary key default gen_random_uuid(),
  icon text,
  label text not null,
  value text not null,
  color_class text,
  display_order int not null default 0
);

alter table portal_quick_stats enable row level security;
create policy "portal_quick_stats_select_public" on portal_quick_stats
  for select to anon, authenticated using (true);
create policy "portal_quick_stats_write_admin" on portal_quick_stats
  for all to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');
