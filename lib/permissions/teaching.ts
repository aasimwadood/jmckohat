import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DashboardNavItem } from "@/components/layout/dashboard-layout";

/**
 * Department heads, coordinators, and controllers are often also real
 * teachers — they show up in course_faculty like anyone else. RLS already
 * treats that as the actual boundary (teaches_course(), not profiles.role
 * — see 0053_teaching_department_coordinator_controller.sql), so the nav
 * side should match: show the faculty pages only to the ones who actually
 * teach a course, not to every department/coordinator/controller account.
 *
 * These deliberately carry no `resource` tag (unlike the rest of a
 * dashboard's NAVIGATION) — RESOURCE_ROLES' default allow-lists for
 * courseMaterials/assignments/etc. don't include department/coordinator/
 * controller at all, so tagging these would hide them by default the
 * moment this shipped. Visibility here is already gated on the more
 * precise "do they personally teach" signal below, not the role-level map.
 */
export async function getTeachingNavExtras(profileId: string): Promise<DashboardNavItem[]> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("course_faculty")
    .select("course_id", { count: "exact", head: true })
    .eq("faculty_profile_id", profileId);

  if (!count || count === 0) return [];

  return [
    { name: "My Courses", icon: "BookOpen", href: "/dashboard/faculty/courses" },
    { name: "Attendance", icon: "CheckCircle", href: "/dashboard/faculty/attendance" },
    { name: "Assignments", icon: "FileText", href: "/dashboard/faculty/assignments" },
    { name: "Upload Marks", icon: "Upload", href: "/dashboard/faculty/marks" },
    { name: "Course Materials", icon: "Upload", href: "/dashboard/faculty/materials" },
    { name: "Class Schedule", icon: "Calendar", href: "/dashboard/faculty/schedule" },
    { name: "FYP Supervision", icon: "Award", href: "/dashboard/faculty/fyp" },
    { name: "Course File Report", icon: "FileText", href: "/dashboard/faculty/course-file" },
  ];
}
