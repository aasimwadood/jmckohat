-- Extends audit_log visibility to hed_admin (spec §28: "HED administrators
-- should be able to view system-wide audit logs"), additive to the
-- existing admin-only policy from 0008_operations.sql.
--
-- Not attempted here: directorate_admin/jmc_admin-scoped log filtering.
-- audit_log's entity/entity_id columns point at whichever table the action
-- touched (profiles, admissions, jmcs, ...), so "logs within their scope"
-- would need a per-entity-type join to resolve a college/jmc/directorate —
-- real work, deferred to the broader RLS rewiring sub-phase rather than
-- rushed here. hed_admin's blanket visibility has no such ambiguity.
create policy "audit_log_select_hed_admin" on audit_log
  for select to authenticated
  using (current_user_role() = 'hed_admin');
