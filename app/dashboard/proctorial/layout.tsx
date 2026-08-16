import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getNavigationForRole } from "@/lib/permissions/navigation";

// Chief Proctor / Staff Proctor are designations (0056), not a role, so any
// staff role could plausibly hold one — the page itself checks the actual
// designation and shows a "not currently designated" message if not. This
// layout only handles navigation: the sidebar shows the caller's own full
// dashboard nav (via getNavigationForRole), not a bare single link — these
// pages previously had no layout of their own at all, which meant the
// sidebar disappeared entirely when visiting them.
export default async function ProctorialLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(
    "admin", "principal", "administration", "college_admin",
    "department", "coordinator", "controller", "faculty",
  );
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
