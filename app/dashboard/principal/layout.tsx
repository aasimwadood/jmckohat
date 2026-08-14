import { LayoutDashboard, TrendingUp, DollarSign, FileText, Award, Bell } from "lucide-react";
import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard/principal" },
  { name: "Academic Performance", icon: TrendingUp, href: "/dashboard/principal/academic" },
  { name: "Financial", icon: DollarSign, href: "/dashboard/principal/financial" },
  { name: "Departmental Reports", icon: FileText, href: "/dashboard/principal/departments" },
  { name: "Exam Results", icon: Award, href: "/dashboard/principal/results" },
  { name: "Announcements", icon: Bell, href: "/dashboard/principal/announcements" },
];

export default async function PrincipalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("principal");
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
