import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getNavigationForRole } from "@/lib/permissions/navigation";

// Deliberately its own top-level route rather than nested under
// /dashboard/administration — that layout's own requireRole("administration")
// would redirect admin/principal away before this page's own
// requireRole("admin", "principal") ever got a chance to run (the exact
// pitfall app/dashboard/recruitment/layout.tsx already documents and works
// around the same way). Found live: navigating here directly as a real
// principal account silently bounced to /dashboard/principal.
export default async function FeeStructuresLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin", "principal");
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
