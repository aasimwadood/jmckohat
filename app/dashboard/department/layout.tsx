import { DashboardLayout, type DashboardNavItem } from "@/components/layout/dashboard-layout";
import { NotificationBell } from "@/components/features/realtime/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { getInitialNotifications } from "@/lib/services/notifications";
import { getAccessibleResources } from "@/lib/permissions/role-permissions";
import { filterNavByAccess } from "@/lib/permissions/policies";
import { getTeachingNavExtras } from "@/lib/permissions/teaching";
import { getProctorNavExtras, getLibraryNavExtras } from "@/lib/permissions/proctorial";

const NAVIGATION: DashboardNavItem[] = [
  { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/department" },
  { name: "Admissions", icon: "UserPlus", href: "/dashboard/department/admissions", resource: "admissions" },
  { name: "Promotions", icon: "Users", href: "/dashboard/department/promotions", resource: "promotions" },
  { name: "Student Fees", icon: "DollarSign", href: "/dashboard/department/fees", resource: "departmentFees" },
  { name: "Students", icon: "UsersRound", href: "/dashboard/students", resource: "students" },
  { name: "Enrollments", icon: "UserPlus", href: "/dashboard/department/enrollments" },
  { name: "Exam Scheduling", icon: "Calendar", href: "/dashboard/department/exams", resource: "examSchedules" },
  { name: "Marks Overview", icon: "FileCheck", href: "/dashboard/department/marks", resource: "results" },
  { name: "Curriculum", icon: "BookOpen", href: "/dashboard/department/curriculum" },
  { name: "FYP Settings", icon: "Award", href: "/dashboard/department/fyp" },
  { name: "Reports", icon: "TrendingUp", href: "/dashboard/department/reports" },
  { name: "Announcements", icon: "Bell", href: "/dashboard/department/announcements", resource: "announcements" },
  { name: "Designations", icon: "Shield", href: "/dashboard/department/designations" },
];

export default async function DepartmentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("department");
  const [notifications, accessible, teachingExtras, proctorExtras, libraryExtras] = await Promise.all([
    getInitialNotifications(profile.id),
    getAccessibleResources(profile.role),
    getTeachingNavExtras(profile.id),
    getProctorNavExtras(profile.id),
    getLibraryNavExtras(profile.id),
  ]);
  const navigation = [...filterNavByAccess(NAVIGATION, accessible), ...teachingExtras, ...proctorExtras, ...libraryExtras];

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
