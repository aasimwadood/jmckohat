import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getNavigationForRole } from "@/lib/permissions/navigation";

// Its own top-level route, not nested under /dashboard/admin, /dashboard/
// principal, or /dashboard/focal-person — any one of those layouts' own
// requireRole() would block the other roles before this page's own check
// ever ran, the same pitfall app/dashboard/shifts/layout.tsx already
// documents and works around the same way.
export default async function GroupsLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin", "principal", "focal_person_intermediate");
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
