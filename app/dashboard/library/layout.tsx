import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getNavigationForRole } from "@/lib/permissions/navigation";

// Librarian (0080) is a designation, not a role — same shape as
// app/dashboard/proctorial/layout.tsx: any staff role that could plausibly
// hold it is let in here, and the page itself checks the actual
// designation and shows a "not currently designated" message if absent.
export default async function LibraryLayout({ children }: { children: React.ReactNode }) {
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
