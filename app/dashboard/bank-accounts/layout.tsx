import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getNavigationForRole } from "@/lib/permissions/navigation";

// Its own top-level route, not nested under /dashboard/administration or
// /dashboard/principal — either of those layouts' own requireRole() would
// block the other roles before this page's own check ever ran, the same
// pitfall app/dashboard/fee-structures/layout.tsx already documents and
// app/dashboard/recruitment/layout.tsx originated.
export default async function BankAccountsLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin", "principal", "administration");
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
