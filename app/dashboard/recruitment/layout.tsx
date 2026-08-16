import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getNavigationForRole } from "@/lib/permissions/navigation";

// Deliberately its own top-level route rather than nested under
// /dashboard/coordinator — coordinator is the primary owner (per spec) but
// admin/principal/college_admin also need access (RESOURCE_ROLES.recruitment
// in lib/permissions/policies.ts), and CoordinatorLayout's own
// requireRole("coordinator") would redirect those other roles away before a
// nested layout ever got a chance to run its own check.
//
// The sidebar shows the caller's own full dashboard navigation (via
// getNavigationForRole), not just a bare "Recruitment" link — this used to
// be a single-item nav, which meant clicking into Recruitment made every
// other menu item disappear until you navigated back.
export default async function RecruitmentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("coordinator", "admin", "principal", "college_admin");
  const [notifications, navigation] = await Promise.all([
    getInitialNotifications(profile.id),
    getNavigationForRole(profile),
  ]);

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
