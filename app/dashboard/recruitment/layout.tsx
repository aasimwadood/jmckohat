import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";

// Deliberately its own top-level route rather than nested under
// /dashboard/coordinator — coordinator is the primary owner (per spec) but
// admin/principal/college_admin also need access (RESOURCE_ROLES.recruitment
// in lib/permissions/policies.ts), and CoordinatorLayout's own
// requireRole("coordinator") would redirect those other roles away before a
// nested layout ever got a chance to run its own check.
const NAVIGATION: DashboardNavItem[] = [
  { name: "Recruitment", icon: "UserPlus", href: "/dashboard/recruitment" },
];

export default async function RecruitmentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("coordinator", "admin", "principal", "college_admin");
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
