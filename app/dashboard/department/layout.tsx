import { LayoutDashboard } from "lucide-react";
import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { requireRole } from "@/lib/auth/session";

const NAVIGATION: DashboardNavItem[] = [{ name: "Overview", icon: LayoutDashboard, href: "/dashboard/department" }];

export default async function DepartmentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("department");

  return (
    <DashboardLayout userName={profile.fullName} userRole={profile.role} navigation={NAVIGATION}>
      {children}
    </DashboardLayout>
  );
}
