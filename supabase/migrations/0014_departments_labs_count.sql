-- Legacy DepartmentsPage shows a static "labs" count per department
-- alongside live student/faculty counts (which are derived from `profiles`
-- at query time, not stored). Labs are physical resources with no natural
-- table of their own yet, so a simple counter column is the honest model.
alter table departments add column labs_count int not null default 0;
