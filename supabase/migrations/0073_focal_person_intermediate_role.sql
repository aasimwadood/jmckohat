-- Shift Management, Phase 2: a genuinely new role for HOD-equivalent
-- authority over Intermediate students, not a reuse/rename of 'department'.
-- Its own migration/transaction, mirroring 0026_hed_hierarchy_roles.sql —
-- a value added by ALTER TYPE ... ADD VALUE cannot be referenced by any
-- policy or function created in the same transaction.
alter type user_role add value 'focal_person_intermediate';
