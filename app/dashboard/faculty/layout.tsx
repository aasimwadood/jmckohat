import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getAccessibleResources } from "@/lib/permissions/role-permissions";
import { filterNavByAccess } from "@/lib/permissions/policies";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/faculty" },
  { name: "My Courses", icon: "BookOpen", href: "/dashboard/faculty/courses" },
  { name: "Attendance", icon: "CheckCircle", href: "/dashboard/faculty/attendance" },
  { name: "Assignments", icon: "FileText", href: "/dashboard/faculty/assignments", resource: "assignments" },
  { name: "Upload Marks", icon: "Upload", href: "/dashboard/faculty/marks", resource: "results" },
  { name: "Admissions", icon: "UserPlus", href: "/dashboard/faculty/admissions", resource: "admissions" },
  { name: "Course Materials", icon: "Upload", href: "/dashboard/faculty/materials", resource: "courseMaterials" },
  { name: "Announcements", icon: "MessageSquare", href: "/dashboard/faculty/announcements", resource: "announcements" },
  { name: "Class Schedule", icon: "Calendar", href: "/dashboard/faculty/schedule", resource: "timetable" },
  { name: "FYP Supervision", icon: "Award", href: "/dashboard/faculty/fyp", resource: "fyp" },
  { name: "Course File Report", icon: "FileText", href: "/dashboard/faculty/course-file", resource: "courseFileReports" },
];

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("faculty", "department", "coordinator", "controller");
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
