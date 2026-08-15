-- HED hierarchy, part 1: new role vocabulary.
--
-- ALTER TYPE ... ADD VALUE cannot be referenced by any RLS policy, index,
-- or other object created in the same transaction it runs in — Postgres
-- only allows using a newly added enum value in a later, separate
-- transaction. Every migration file is applied as its own transaction, so
-- this is kept as its own file specifically so 0027 (which writes policies
-- referencing these values) can safely follow it. See
-- docs/MIGRATION_PLAN.md §9.2.
--
-- These four are purely additive: none of the existing 8 roles
-- (admin/faculty/student/department/controller/coordinator/principal/
-- administration) change meaning or scope. See docs/MIGRATION_PLAN.md §9
-- for the explicit, confirmed decision on how college_admin relates to the
-- pre-existing admin/principal roles.
alter type user_role add value 'hed_admin';
alter type user_role add value 'directorate_admin';
alter type user_role add value 'jmc_admin';
alter type user_role add value 'college_admin';
