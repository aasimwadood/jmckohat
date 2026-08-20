import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getAccessibleResources } from "@/lib/permissions/role-permissions";
import { filterNavByAccess } from "@/lib/permissions/policies";

// Mirrors app/dashboard/department/layout.tsx's exact pattern — a local
// NAVIGATION const kept in sync with lib/permissions/navigation.ts's own
// focal_person_intermediate array (that copy is for cross-cutting pages
// like Groups/Sections that live outside this role's own /dashboard/
// focal-person/* tree; this one is this tree's real sidebar). Deliberately
// trimmed to exactly the confirmed authority — no FYP, course materials,
// attendance, timetable, curriculum, designations, or announcements.
const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/focal-person" },
  { name: "Admissions", icon: "UserPlus", href: "/dashboard/focal-person/admissions", resource: "admissions" },
  { name: "Promotions", icon: "Users", href: "/dashboard/focal-person/promotions", resource: "promotions" },
  { name: "Student Fees", icon: "DollarSign", href: "/dashboard/focal-person/fees", resource: "departmentFees" },
  { name: "Students", icon: "UsersRound", href: "/dashboard/students", resource: "students" },
  { name: "Marks Overview", icon: "FileCheck", href: "/dashboard/focal-person/marks", resource: "results" },
  { name: "Groups", icon: "Layers", href: "/dashboard/groups", resource: "groups" },
  { name: "Sections", icon: "Rows3", href: "/dashboard/sections", resource: "sections" },
  { name: "Reports", icon: "TrendingUp", href: "/dashboard/focal-person/reports" },
];

export default async function FocalPersonLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("focal_person_intermediate");
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
