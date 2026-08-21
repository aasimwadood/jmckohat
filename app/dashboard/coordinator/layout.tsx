import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getAccessibleResources } from "@/lib/permissions/role-permissions";
import { filterNavByAccess } from "@/lib/permissions/policies";
import { getTeachingNavExtras } from "@/lib/permissions/teaching";
import { getProctorNavExtras, getLibraryNavExtras } from "@/lib/permissions/proctorial";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/coordinator" },
  { name: "Timetable Management", icon: "Calendar", href: "/dashboard/coordinator/timetable", resource: "timetable" },
  { name: "Academic Calendar", icon: "Calendar", href: "/dashboard/coordinator/calendar", resource: "academicCalendar" },
  { name: "Faculty Coordination", icon: "Users", href: "/dashboard/coordinator/faculty" },
  { name: "Scheduling Conflicts", icon: "AlertCircle", href: "/dashboard/coordinator/conflicts" },
  { name: "Recruitment", icon: "UserPlus", href: "/dashboard/recruitment", resource: "recruitment" },
];

export default async function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("coordinator");
  const [notifications, accessible, teachingExtras, proctorExtras, libraryExtras] = await Promise.all([
    getInitialNotifications(profile.id),
    getAccessibleResources(profile.role),
    getTeachingNavExtras(profile.id),
    getProctorNavExtras(profile.id),
    getLibraryNavExtras(profile.id),
  ]);
  const navigation = [...filterNavByAccess(NAVIGATION, accessible), ...teachingExtras, ...proctorExtras, ...libraryExtras];

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
