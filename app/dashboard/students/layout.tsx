import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getNavigationForRole } from "@/lib/permissions/navigation";

// Its own top-level route — same nested-layout-trap reasoning as
// app/dashboard/shifts/layout.tsx and app/dashboard/groups/layout.tsx.
export default async function StudentsLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin", "principal", "department", "focal_person_intermediate");
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
