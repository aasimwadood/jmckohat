import { LayoutDashboard, UserPlus, DollarSign, BookOpen, HelpCircle, Calendar } from "lucide-react";
import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { requireRole } from "@/lib/auth/session";

// No "System Logs" entry here: audit_log is admin-only by RLS design
// (0008_operations.sql), and its current content — staff provisioning,
// account activation — isn't administration-staff-relevant anyway. Adding
// a page that RLS would just return empty for isn't a real feature.
const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard/administration" },
  { name: "Fee Verification", icon: UserPlus, href: "/dashboard/administration/admissions" },
  { name: "Finance & Fees", icon: DollarSign, href: "/dashboard/administration/finance" },
  { name: "Library", icon: BookOpen, href: "/dashboard/administration/library" },
  { name: "Helpdesk", icon: HelpCircle, href: "/dashboard/administration/helpdesk" },
  { name: "Events & Facilities", icon: Calendar, href: "/dashboard/administration/events" },
];

export default async function AdministrationLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("administration");

  return (
    <DashboardLayout userName={profile.fullName} userRole={profile.role} navigation={NAVIGATION}>
      {children}
    </DashboardLayout>
  );
}
