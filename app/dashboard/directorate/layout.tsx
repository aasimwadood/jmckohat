import { LayoutDashboard, Landmark, School, TrendingUp } from "lucide-react";
import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard/directorate" },
  { name: "JMCs", icon: Landmark, href: "/dashboard/directorate/jmcs" },
  { name: "Colleges", icon: School, href: "/dashboard/directorate/colleges" },
  { name: "Reports", icon: TrendingUp, href: "/dashboard/directorate/reports" },
];

export default async function DirectorateLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("directorate_admin");
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
