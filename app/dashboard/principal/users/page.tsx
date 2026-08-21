import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ProvisionStaffDialog } from "@/app/dashboard/admin/users/provision-staff-dialog";
import { UserManagementView } from "@/components/features/users/user-management-view";
import { fetchAllProfiles } from "@/lib/services/profiles";

// Principal-facing mirror of app/dashboard/admin/users/page.tsx, scoped to
// the principal's own college (admin's version is intentionally unscoped —
// admin isn't tied to a single college the way principal is). Deactivation
// (setUserActiveAction) stays admin-only, so unlike the admin page this
// shows status as a plain badge, not a toggle a principal can't actually use.
export default async function PrincipalUsersPage() {
  const profile = await requireRole("principal");
  const supabase = await createClient();

  const [users, { data: departments }] = await Promise.all([
    profile.collegeId ? fetchAllProfiles(supabase, profile.collegeId) : Promise.resolve([]),
    profile.collegeId
      ? supabase.from("departments").select("id, name").eq("college_id", profile.collegeId)
      : Promise.resolve({ data: [] }),
  ]);
  const departmentNames = new Map((departments ?? []).map((d) => [d.id, d.name]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Staff</CardTitle>
          <ProvisionStaffDialog departments={departments ?? []} />
        </div>
      </CardHeader>
      <CardContent>
        <UserManagementView
          users={users.map((u) => ({
            id: u.id,
            fullName: u.full_name,
            email: u.email,
            role: u.role,
            departmentId: u.department_id,
            isActive: u.is_active,
          }))}
          departmentNames={departmentNames}
          canToggleActive={false}
        />
      </CardContent>
    </Card>
  );
}
