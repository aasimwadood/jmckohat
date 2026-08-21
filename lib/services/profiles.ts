import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { UserRole } from "@/lib/permissions/roles";

export type ProfileListRow = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department_id: string | null;
  is_active: boolean;
};

// PostgREST caps any single response at 1000 rows — with 1404 real
// profiles today (and growing), a plain .select("*") over the whole table
// silently hides the last third of it. Paged defensively, same pattern
// already established for student rosters (app/dashboard/students/page.tsx).
const PAGE_SIZE = 1000;

export async function fetchAllProfiles(supabase: SupabaseClient<Database>, collegeId?: string): Promise<ProfileListRow[]> {
  const rows: ProfileListRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase
      .from("profiles")
      .select("id, full_name, email, role, department_id, is_active")
      .order("full_name")
      .range(offset, offset + PAGE_SIZE - 1);
    if (collegeId) query = query.eq("college_id", collegeId);
    const { data } = await query;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}
