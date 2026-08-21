import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getAccessibleResources } from "@/lib/permissions/role-permissions";
import { filterNavByAccess } from "@/lib/permissions/policies";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/principal" },
  { name: "Academic Performance", icon: "TrendingUp", href: "/dashboard/principal/academic" },
  { name: "Financial", icon: "DollarSign", href: "/dashboard/principal/financial" },
  { name: "Fee Structures", icon: "Settings", href: "/dashboard/fee-structures", resource: "feeStructures" },
  { name: "Bank Accounts", icon: "Landmark", href: "/dashboard/bank-accounts", resource: "bankAccounts" },
  { name: "Shifts", icon: "Clock", href: "/dashboard/shifts", resource: "shifts" },
  { name: "Groups", icon: "Layers", href: "/dashboard/groups", resource: "groups" },
  { name: "Sections", icon: "Rows3", href: "/dashboard/sections", resource: "sections" },
  { name: "Students", icon: "UsersRound", href: "/dashboard/students", resource: "students" },
  { name: "Staff", icon: "UserPlus", href: "/dashboard/principal/users", resource: "userManagement" },
  { name: "Departmental Reports", icon: "FileText", href: "/dashboard/principal/departments" },
  { name: "Exam Results", icon: "Award", href: "/dashboard/principal/results" },
  { name: "Announcements", icon: "Bell", href: "/dashboard/principal/announcements", resource: "announcements" },
  { name: "Designations", icon: "Shield", href: "/dashboard/principal/designations" },
  { name: "Proctorial Board", icon: "Shield", href: "/dashboard/principal/proctorial-board" },
  { name: "Recruitment", icon: "UserPlus", href: "/dashboard/recruitment", resource: "recruitment" },
];

export default async function PrincipalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("principal");
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
