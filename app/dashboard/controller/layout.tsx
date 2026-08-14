import { LayoutDashboard, Calendar, FileCheck, FileText, Award, Settings } from "lucide-react";
import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { requireRole } from "@/lib/auth/session";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard/controller" },
  { name: "Exam Schedules", icon: Calendar, href: "/dashboard/controller/schedules" },
  { name: "Results", icon: FileCheck, href: "/dashboard/controller/results" },
  { name: "Transcript Requests", icon: FileText, href: "/dashboard/controller/transcripts" },
  { name: "Result Queries", icon: Award, href: "/dashboard/controller/queries" },
  { name: "Exam Policies", icon: Settings, href: "/dashboard/controller/policies" },
];

export default async function ControllerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("controller");

  return (
    <DashboardLayout userName={profile.fullName} userRole={profile.role} navigation={NAVIGATION}>
      {children}
    </DashboardLayout>
  );
}
