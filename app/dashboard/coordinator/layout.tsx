import { LayoutDashboard, Calendar, Users, AlertCircle } from "lucide-react";
import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { requireRole } from "@/lib/auth/session";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard/coordinator" },
  { name: "Timetable Management", icon: Calendar, href: "/dashboard/coordinator/timetable" },
  { name: "Academic Calendar", icon: Calendar, href: "/dashboard/coordinator/calendar" },
  { name: "Faculty Coordination", icon: Users, href: "/dashboard/coordinator/faculty" },
  { name: "Scheduling Conflicts", icon: AlertCircle, href: "/dashboard/coordinator/conflicts" },
];

export default async function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("coordinator");

  return (
    <DashboardLayout userName={profile.fullName} userRole={profile.role} navigation={NAVIGATION}>
      {children}
    </DashboardLayout>
  );
}
