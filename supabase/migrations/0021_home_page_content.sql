-- HomePage.tsx fields not modeled in 0009's initial guess: news items have
-- a category badge; "why choose us" features carry a gradient + a
-- stat/statLabel pair; and "Faculties" here means academic Faculties/
-- Schools (each with a dean and program list) — a distinct concept from
-- both `departments` and `faculty_directory` (individual faculty members),
-- with no existing table.

alter table portal_news add column category text;

alter table portal_features
  add column gradient text,
  add column stat text,
  add column stat_label text;

create table institution_faculties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dean text,
  description text,
  full_detail text,
  image_path text,
  color text,
  programs text[] not null default '{}',
  display_order int not null default 0
);

alter table institution_faculties enable row level security;
create policy "institution_faculties_select_public" on institution_faculties
  for select to anon, authenticated using (true);
create policy "institution_faculties_write_admin" on institution_faculties
  for all to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');
