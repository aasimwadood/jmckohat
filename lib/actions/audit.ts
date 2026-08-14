import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.types";

/**
 * Writes an audit_log row via the service-role client. `audit_log` has no
 * INSERT policy for `authenticated` on purpose (0008_operations.sql) —
 * every entry is written from trusted server code alongside the mutation
 * it's recording, never from a client-supplied request.
 */
export async function logAudit(
  actorProfileId: string,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_profile_id: actorProfileId,
    action,
    entity,
    entity_id: entityId ?? null,
    metadata: (metadata as Json) ?? null,
  });
}
