import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getAccessibleResources } from "@/lib/permissions/role-permissions";
import { filterNavByAccess } from "@/lib/permissions/policies";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/student" },
  { name: "My Timetable", icon: "Calendar", href: "/dashboard/student/timetable", resource: "timetable" },
  { name: "Attendance", icon: "CheckCircle", href: "/dashboard/student/attendance" },
  { name: "Assignments", icon: "FileText", href: "/dashboard/student/assignments", resource: "assignments" },
  { name: "Results & Grades", icon: "TrendingUp", href: "/dashboard/student/results", resource: "results" },
  { name: "Fee Payment", icon: "DollarSign", href: "/dashboard/student/fees" },
  { name: "Course Materials", icon: "BookOpen", href: "/dashboard/student/materials", resource: "courseMaterials" },
  { name: "Announcements", icon: "Bell", href: "/dashboard/student/announcements" },
  { name: "Final Year Project", icon: "FileText", href: "/dashboard/student/fyp", resource: "fyp" },
  { name: "Profile", icon: "User", href: "/dashboard/student/profile" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("student");
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
