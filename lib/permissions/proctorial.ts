import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DashboardNavItem } from "@/components/layout/dashboard-layout";

/**
 * Chief Proctor / Staff Proctor are designations (0056), not profiles.role
 * values, so nav visibility can't come from the role-based filterNavByAccess
 * map — it has to check the actual current designation, same approach as
 * getTeachingNavExtras (lib/permissions/teaching.ts).
 */
export async function getProctorNavExtras(profileId: string): Promise<DashboardNavItem[]> {
  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("designation_assignments")
    .select("designation_type_id")
    .eq("profile_id", profileId);

  const typeIds = (assignments ?? []).map((a) => a.designation_type_id);
  const { data: types } =
    typeIds.length > 0
      ? await supabase.from("designation_types").select("id, name").in("id", typeIds)
      : { data: [] };

  const titles = new Set((types ?? []).map((t) => t.name));
  const items: DashboardNavItem[] = [];

  if (titles.has("Chief Proctor")) {
    items.push({ name: "Proctorial Board", icon: "Shield", href: "/dashboard/proctorial/chief" });
  }
  if (titles.has("Staff Proctor")) {
    items.push({ name: "My Proctor Duty", icon: "Shield", href: "/dashboard/proctorial/staff" });
  }
  return items;
}
