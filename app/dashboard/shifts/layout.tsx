import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getNavigationForRole } from "@/lib/permissions/navigation";

// Its own top-level route, not nested under /dashboard/admin or
// /dashboard/principal — either of those layouts' own requireRole() would
// block the other role before this page's own check ever ran, the same
// pitfall app/dashboard/fee-structures/layout.tsx and
// app/dashboard/bank-accounts/layout.tsx already document.
export default async function ShiftsLayout({ children }: { children: React.ReactNode }) {
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
