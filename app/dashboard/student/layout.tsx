import {
  LayoutDashboard,
  Calendar,
  CheckCircle,
  FileText,
  TrendingUp,
  DollarSign,
  BookOpen,
  Bell,
  User as UserIcon,
} from "lucide-react";
import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard/student" },
  { name: "My Timetable", icon: Calendar, href: "/dashboard/student/timetable" },
  { name: "Attendance", icon: CheckCircle, href: "/dashboard/student/attendance" },
  { name: "Assignments", icon: FileText, href: "/dashboard/student/assignments" },
  { name: "Results & Grades", icon: TrendingUp, href: "/dashboard/student/results" },
  { name: "Fee Payment", icon: DollarSign, href: "/dashboard/student/fees" },
  { name: "Course Materials", icon: BookOpen, href: "/dashboard/student/materials" },
  { name: "Announcements", icon: Bell, href: "/dashboard/student/announcements" },
  { name: "Final Year Project", icon: FileText, href: "/dashboard/student/fyp" },
  { name: "Profile", icon: UserIcon, href: "/dashboard/student/profile" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("student");
  const notifications = await getInitialNotifications(profile.id);

  return (
    <DashboardLayout
      userName={profile.fullName}
      userRole={profile.role}
      navigation={NAVIGATION}
      notificationBell={<NotificationBell userId={profile.id} initialNotifications={notifications} />}
    >
      {children}
    </DashboardLayout>
  );
}
