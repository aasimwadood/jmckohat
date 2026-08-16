import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getAccessibleResources } from "@/lib/permissions/role-permissions";
import { filterNavByAccess } from "@/lib/permissions/policies";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/admin" },
  { name: "User Management", icon: "Users", href: "/dashboard/admin/users", resource: "userManagement" },
  { name: "Role Management", icon: "Shield", href: "/dashboard/admin/roles", resource: "roleManagement" },
  { name: "Timetable", icon: "Calendar", href: "/dashboard/admin/timetable", resource: "timetable" },
  { name: "Announcements", icon: "FileText", href: "/dashboard/admin/announcements", resource: "announcements" },
  { name: "Recruitment", icon: "UserPlus", href: "/dashboard/recruitment", resource: "recruitment" },
  { name: "Reports", icon: "TrendingUp", href: "/dashboard/admin/reports" },
  { name: "System Settings", icon: "Settings", href: "/dashboard/admin/settings", resource: "siteContent" },
  { name: "System Logs", icon: "Activity", href: "/dashboard/admin/logs", resource: "auditLog" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin");
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
