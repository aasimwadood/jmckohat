import "server-only";
import type { DashboardNavItem } from "@/components/layout/dashboard-layout";
import type { CurrentProfile } from "@/lib/auth/session";
import { filterNavByAccess } from "@/lib/permissions/policies";
import { getAccessibleResources } from "@/lib/permissions/role-permissions";
import { getTeachingNavExtras } from "@/lib/permissions/teaching";
import { getProctorNavExtras } from "@/lib/permissions/proctorial";

/**
 * Cross-cutting sections (Recruitment, the Proctorial Board pages) live
 * under their own top-level route segment, outside any one role's
 * `/dashboard/<role>/*` tree — Next.js layout nesting means navigating
 * into them would otherwise swap in that segment's own (much smaller)
 * layout and lose the rest of the user's sidebar entirely. This mirrors
 * each role's own dashboard layout's NAVIGATION array exactly, so those
 * pages can show the same full, role-appropriate sidebar instead.
 *
 * Deliberately duplicated from each `app/dashboard/<role>/layout.tsx`
 * rather than importing from them (Next.js layouts aren't meant to be
 * reused as plain functions) — if a role's own nav changes, mirror the
 * change here too.
 */
const NAVIGATION_BY_ROLE: Partial<Record<CurrentProfile["role"], DashboardNavItem[]>> = {
  admin: [
    { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/admin" },
    { name: "User Management", icon: "Users", href: "/dashboard/admin/users", resource: "userManagement" },
    { name: "Role Management", icon: "Shield", href: "/dashboard/admin/roles", resource: "roleManagement" },
    { name: "Fee Structures", icon: "Settings", href: "/dashboard/fee-structures", resource: "feeStructures" },
    { name: "Bank Accounts", icon: "Landmark", href: "/dashboard/bank-accounts", resource: "bankAccounts" },
    { name: "Shifts", icon: "Clock", href: "/dashboard/shifts", resource: "shifts" },
    { name: "Groups", icon: "Layers", href: "/dashboard/groups", resource: "groups" },
    { name: "Sections", icon: "Rows3", href: "/dashboard/sections", resource: "sections" },
    { name: "Students", icon: "UsersRound", href: "/dashboard/students", resource: "students" },
    { name: "Timetable", icon: "Calendar", href: "/dashboard/admin/timetable", resource: "timetable" },
    { name: "Announcements", icon: "FileText", href: "/dashboard/admin/announcements", resource: "announcements" },
    { name: "Recruitment", icon: "UserPlus", href: "/dashboard/recruitment", resource: "recruitment" },
    { name: "Reports", icon: "TrendingUp", href: "/dashboard/admin/reports" },
    { name: "System Settings", icon: "Settings", href: "/dashboard/admin/settings", resource: "siteContent" },
    { name: "System Logs", icon: "Activity", href: "/dashboard/admin/logs", resource: "auditLog" },
  ],
  administration: [
    { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/administration" },
    { name: "Fee Verification", icon: "UserPlus", href: "/dashboard/administration/admissions", resource: "admissions" },
    { name: "Finance & Fees", icon: "DollarSign", href: "/dashboard/administration/finance" },
    { name: "Bank Import", icon: "Upload", href: "/dashboard/administration/finance/import", resource: "feeManagement" },
    { name: "Bank Accounts", icon: "Landmark", href: "/dashboard/bank-accounts", resource: "bankAccounts" },
    { name: "Library", icon: "BookOpen", href: "/dashboard/administration/library", resource: "library" },
    { name: "Helpdesk", icon: "HelpCircle", href: "/dashboard/administration/helpdesk", resource: "supportTickets" },
    { name: "Events & Facilities", icon: "Calendar", href: "/dashboard/administration/events", resource: "campusEvents" },
    { name: "Contact Messages", icon: "MessageSquare", href: "/dashboard/administration/messages" },
  ],
  college_admin: [
    { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/college-admin" },
    { name: "Recruitment", icon: "UserPlus", href: "/dashboard/recruitment", resource: "recruitment" },
  ],
  principal: [
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
  ],
  faculty: [
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
    { name: "Profile", icon: "User", href: "/dashboard/faculty/profile" },
  ],
  department: [
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
  ],
  focal_person_intermediate: [
    { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/focal-person" },
    { name: "Admissions", icon: "UserPlus", href: "/dashboard/focal-person/admissions", resource: "admissions" },
    { name: "Promotions", icon: "Users", href: "/dashboard/focal-person/promotions", resource: "promotions" },
    { name: "Student Fees", icon: "DollarSign", href: "/dashboard/focal-person/fees", resource: "departmentFees" },
    { name: "Students", icon: "UsersRound", href: "/dashboard/students", resource: "students" },
    { name: "Marks Overview", icon: "FileCheck", href: "/dashboard/focal-person/marks", resource: "results" },
    { name: "Groups", icon: "Layers", href: "/dashboard/groups", resource: "groups" },
    { name: "Sections", icon: "Rows3", href: "/dashboard/sections", resource: "sections" },
    { name: "Reports", icon: "TrendingUp", href: "/dashboard/focal-person/reports" },
  ],
  coordinator: [
    { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/coordinator" },
    { name: "Timetable Management", icon: "Calendar", href: "/dashboard/coordinator/timetable", resource: "timetable" },
    { name: "Academic Calendar", icon: "Calendar", href: "/dashboard/coordinator/calendar", resource: "academicCalendar" },
    { name: "Faculty Coordination", icon: "Users", href: "/dashboard/coordinator/faculty" },
    { name: "Scheduling Conflicts", icon: "AlertCircle", href: "/dashboard/coordinator/conflicts" },
    { name: "Recruitment", icon: "UserPlus", href: "/dashboard/recruitment", resource: "recruitment" },
  ],
  controller: [
    { name: "Dashboard", icon: "LayoutDashboard", href: "/dashboard/controller" },
    { name: "Exam Schedules", icon: "Calendar", href: "/dashboard/controller/schedules", resource: "examSchedules" },
    { name: "Results", icon: "FileCheck", href: "/dashboard/controller/results", resource: "results" },
    { name: "Transcript Requests", icon: "FileText", href: "/dashboard/controller/transcripts", resource: "transcripts" },
    { name: "Result Queries", icon: "Award", href: "/dashboard/controller/queries", resource: "resultQueries" },
    { name: "Exam Policies", icon: "Settings", href: "/dashboard/controller/policies" },
  ],
};

// Which of the 4 "also teaches" layouts also call getTeachingNavExtras — the
// faculty layout doesn't (it's already the teaching dashboard).
const TEACHING_EXTRAS_ROLES: CurrentProfile["role"][] = ["department", "coordinator", "controller"];
const PROCTOR_EXTRAS_ROLES: CurrentProfile["role"][] = ["faculty", "department", "coordinator", "controller"];

export async function getNavigationForRole(profile: CurrentProfile): Promise<DashboardNavItem[]> {
  const base = NAVIGATION_BY_ROLE[profile.role] ?? [];
  const accessible = await getAccessibleResources(profile.role);

  const [teachingExtras, proctorExtras] = await Promise.all([
    TEACHING_EXTRAS_ROLES.includes(profile.role) ? getTeachingNavExtras(profile.id) : Promise.resolve([]),
    PROCTOR_EXTRAS_ROLES.includes(profile.role) ? getProctorNavExtras(profile.id) : Promise.resolve([]),
  ]);

  return [...filterNavByAccess(base, accessible), ...teachingExtras, ...proctorExtras];
}
