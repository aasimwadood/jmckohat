import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getAccessibleResources } from "@/lib/permissions/role-permissions";
import { filterNavByAccess } from "@/lib/permissions/policies";

// Deliberately minimal: college_admin's college-organization-record access
// is read-only (colleges RLS grants write to hed_admin/directorate_admin/
// jmc_admin only, not college_admin — see 0027_hed_hierarchy_schema.sql).
// This is NOT a rebuild of the existing 8-role academic dashboards (the
// admin/principal/department/etc. screens already do that for this
// college) — see docs/MIGRATION_PLAN.md §9 for the flagged, deliberate
// admin/college_admin overlap decision.
const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/college-admin" },
  { name: "Recruitment", icon: "UserPlus", href: "/dashboard/recruitment", resource: "recruitment" },
];

export default async function CollegeAdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("college_admin");
  const [notifications, accessible] = await Promise.all([
    getInitialNotifications(profile.id),
    getAccessibleResources(profile.role),
  ]);
  const navigation = filterNavByAccess(NAVIGATION, accessible);

  return (
    <DashboardLayout
      userName={profile.fullName}
      userRole={profile.role}
      navigation={navigation}
      notificationBell={<NotificationBell userId={profile.id} initialNotifications={notifications} />}
    >
      {children}
    </DashboardLayout>
  );
}
