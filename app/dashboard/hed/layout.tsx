import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/hed" },
  { name: "Directorates", icon: "Building2", href: "/dashboard/hed/directorates" },
  { name: "JMCs", icon: "Landmark", href: "/dashboard/hed/jmcs" },
  { name: "Colleges", icon: "School", href: "/dashboard/hed/colleges" },
  { name: "Reports", icon: "TrendingUp", href: "/dashboard/hed/reports" },
  { name: "Audit Logs", icon: "Activity", href: "/dashboard/hed/logs" },
];

export default async function HedLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("hed_admin");
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
