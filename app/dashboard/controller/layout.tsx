import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getAccessibleResources } from "@/lib/permissions/role-permissions";
import { filterNavByAccess } from "@/lib/permissions/policies";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/controller" },
  { name: "Exam Schedules", icon: "Calendar", href: "/dashboard/controller/schedules", resource: "examSchedules" },
  { name: "Results", icon: "FileCheck", href: "/dashboard/controller/results", resource: "results" },
  { name: "Transcript Requests", icon: "FileText", href: "/dashboard/controller/transcripts", resource: "transcripts" },
  { name: "Result Queries", icon: "Award", href: "/dashboard/controller/queries", resource: "resultQueries" },
  { name: "Exam Policies", icon: "Settings", href: "/dashboard/controller/policies" },
];

export default async function ControllerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("controller");
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
