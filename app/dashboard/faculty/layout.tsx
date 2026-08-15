import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/faculty" },
  { name: "My Courses", icon: "BookOpen", href: "/dashboard/faculty/courses" },
  { name: "Attendance", icon: "CheckCircle", href: "/dashboard/faculty/attendance" },
  { name: "Assignments", icon: "FileText", href: "/dashboard/faculty/assignments" },
  { name: "Upload Marks", icon: "Upload", href: "/dashboard/faculty/marks" },
  { name: "Admissions", icon: "UserPlus", href: "/dashboard/faculty/admissions" },
  { name: "Course Materials", icon: "Upload", href: "/dashboard/faculty/materials" },
  { name: "Announcements", icon: "MessageSquare", href: "/dashboard/faculty/announcements" },
  { name: "Class Schedule", icon: "Calendar", href: "/dashboard/faculty/schedule" },
  { name: "FYP Supervision", icon: "Award", href: "/dashboard/faculty/fyp" },
  { name: "Course File Report", icon: "FileText", href: "/dashboard/faculty/course-file" },
];

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("faculty");
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
