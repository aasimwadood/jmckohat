import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getAccessibleResources } from "@/lib/permissions/role-permissions";
import { filterNavByAccess } from "@/lib/permissions/policies";

// No "System Logs" entry here: audit_log is admin-only by RLS design
// (0008_operations.sql), and its current content — staff provisioning,
// account activation — isn't administration-staff-relevant anyway. Adding
// a page that RLS would just return empty for isn't a real feature.
const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/administration" },
  { name: "Fee Verification", icon: "UserPlus", href: "/dashboard/administration/admissions", resource: "admissions" },
  { name: "Finance & Fees", icon: "DollarSign", href: "/dashboard/administration/finance" },
  { name: "Bank Import", icon: "Upload", href: "/dashboard/administration/finance/import", resource: "feeManagement" },
  { name: "Library", icon: "BookOpen", href: "/dashboard/administration/library", resource: "library" },
  { name: "Helpdesk", icon: "HelpCircle", href: "/dashboard/administration/helpdesk", resource: "supportTickets" },
  { name: "Events & Facilities", icon: "Calendar", href: "/dashboard/administration/events", resource: "campusEvents" },
  { name: "Contact Messages", icon: "MessageSquare", href: "/dashboard/administration/messages" },
];

export default async function AdministrationLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("administration");
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
