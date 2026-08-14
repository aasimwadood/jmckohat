import {
  LayoutDashboard,
  Calendar,
  CheckCircle,
  FileText,
  TrendingUp,
  DollarSign,
  BookOpen,
  User as UserIcon,
} from "lucide-react";
import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { requireRole } from "@/lib/auth/session";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard/student" },
  { name: "My Timetable", icon: Calendar, href: "/dashboard/student/timetable" },
  { name: "Attendance", icon: CheckCircle, href: "/dashboard/student/attendance" },
  { name: "Assignments", icon: FileText, href: "/dashboard/student/assignments" },
  { name: "Results & Grades", icon: TrendingUp, href: "/dashboard/student/results" },
  { name: "Fee Payment", icon: DollarSign, href: "/dashboard/student/fees" },
  { name: "Course Materials", icon: BookOpen, href: "/dashboard/student/materials" },
  { name: "Final Year Project", icon: FileText, href: "/dashboard/student/fyp" },
  { name: "Profile", icon: UserIcon, href: "/dashboard/student/profile" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("student");

  return (
    <DashboardLayout userName={profile.fullName} userRole={profile.role} navigation={NAVIGATION}>
      {children}
    </DashboardLayout>
  );
}
