import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Resolves which college an admin content-management page/action should
 * read/write. `admin` predates the multi-college schema and typically has
 * no `profiles.college_id` (only `college_admin`/org roles reliably do) —
 * falling back to GPGC Kohat (the app's sole real college today) preserves
 * today's single-college behavior exactly for those accounts. Every public
 * content table this resolves against (site_settings, leadership,
 * portal_*, downloads, program_*, etc. — see supabase/migrations/0042)
 * uses this same fallback, so a plain `admin` account keeps editing "the"
 * college it always implicitly managed.
 */
export async function resolveAdminCollegeId(
  supabase: SupabaseClient<Database>,
  profileCollegeId: string | null,
): Promise<string> {
  if (profileCollegeId) return profileCollegeId;

  const { data } = await supabase.from("colleges").select("id").eq("code", "GPGC-KOH").single();
  if (!data) throw new Error("No default college configured");
  return data.id;
}
