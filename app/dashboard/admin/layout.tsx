import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/admin" },
  { name: "User Management", icon: "Users", href: "/dashboard/admin/users" },
  { name: "Role Management", icon: "Shield", href: "/dashboard/admin/roles" },
  { name: "Timetable", icon: "Calendar", href: "/dashboard/admin/timetable" },
  { name: "Announcements", icon: "FileText", href: "/dashboard/admin/announcements" },
  { name: "Reports", icon: "TrendingUp", href: "/dashboard/admin/reports" },
  { name: "System Settings", icon: "Settings", href: "/dashboard/admin/settings" },
  { name: "System Logs", icon: "Activity", href: "/dashboard/admin/logs" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin");
  const notifications = await getInitialNotifications(profile.id);

  return (
    <DashboardLayout
      userName={profile.fullName}
      userRole={profile.role}
      navigation={NAVIGATION}
      notificationBell={<NotificationBell userId={profile.id} initialNotifications={notifications} />}
    >
      {children}
    </DashboardLayout>
  );
}
