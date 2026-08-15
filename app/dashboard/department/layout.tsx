import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/department" },
  { name: "Admissions", icon: "UserPlus", href: "/dashboard/department/admissions" },
  { name: "Promotions", icon: "Users", href: "/dashboard/department/promotions" },
  { name: "Exam Scheduling", icon: "Calendar", href: "/dashboard/department/exams" },
  { name: "Marks Overview", icon: "FileCheck", href: "/dashboard/department/marks" },
  { name: "Curriculum", icon: "BookOpen", href: "/dashboard/department/curriculum" },
  { name: "Reports", icon: "TrendingUp", href: "/dashboard/department/reports" },
  { name: "Announcements", icon: "Bell", href: "/dashboard/department/announcements" },
];

export default async function DepartmentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("department");
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
