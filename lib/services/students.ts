import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Same >1000-row PostgREST page-size cap other college-wide student fetches
// already document (app/dashboard/students/page.tsx) — paged defensively.
const PAGE_SIZE = 1000;

export async function fetchAllCollegeStudents(supabase: SupabaseClient<Database>, collegeId: string) {
  const rows: { id: string; full_name: string; registration_number: string | null }[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, registration_number")
      .eq("college_id", collegeId)
      .eq("role", "student")
      .order("full_name")
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}
