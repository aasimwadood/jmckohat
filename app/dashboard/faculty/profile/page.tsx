import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AvatarUpload } from "@/components/features/profile/avatar-upload";
import { EditProfileForm } from "@/components/features/profile/edit-profile-form";
import { ROLE_LABELS } from "@/lib/permissions/roles";

export default async function FacultyProfilePage() {
  const profile = await requireRole("faculty", "department", "coordinator", "controller");
  const supabase = await createClient();

  const [{ data: department }, { data: self }] = await Promise.all([
    profile.departmentId
      ? supabase.from("departments").select("name").eq("id", profile.departmentId).single()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("username").eq("id", profile.id).single(),
  ]);

  const { data: assignments } = await supabase
    .from("course_faculty")
    .select("course_id, semester_id, offering_type")
    .eq("faculty_profile_id", profile.id);

  const courseIds = [...new Set((assignments ?? []).map((a) => a.course_id))];
  const semesterIds = [...new Set((assignments ?? []).map((a) => a.semester_id))];
  const [{ data: courses }, { data: semesters }] = await Promise.all([
    courseIds.length ? supabase.from("courses").select("id, code, title").in("id", courseIds) : Promise.resolve({ data: [] }),
    semesterIds.length ? supabase.from("semesters").select("id, number").in("id", semesterIds) : Promise.resolve({ data: [] }),
  ]);
  const courseById = new Map((courses ?? []).map((c) => [c.id, c]));
  const semesterNumberById = new Map((semesters ?? []).map((s) => [s.id, s.number]));

  const avatarUrl = profile.avatarPath
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatarPath).data.publicUrl
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faculty Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <AvatarUpload avatarUrl={avatarUrl} fullName={profile.fullName} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Full Name" value={profile.fullName} />
            <Field label="Email" value={profile.email} />
            <Field label="Role" value={ROLE_LABELS[profile.role]} />
            <Field label="Department" value={department?.name ?? "N/A"} />
            <Field label="Username" value={self?.username ?? "N/A"} />
            <Field label="Phone" value={profile.phone ?? "N/A"} />
          </div>

          <div className="pt-2">
            <p className="mb-2 text-sm text-gray-600">Courses Currently Teaching</p>
            {(assignments ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">No courses assigned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(assignments ?? []).map((a) => {
                  const course = courseById.get(a.course_id);
                  return (
                    <Badge key={`${a.course_id}-${a.semester_id}`} variant="secondary">
                      {course ? `${course.code} — ${course.title}` : "Unknown course"} · Sem {semesterNumberById.get(a.semester_id) ?? "?"}
                      {a.offering_type === "repeat" && <span className="ml-1 text-amber-600">(Repeat)</span>}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4">
            <EditProfileForm fullName={profile.fullName} phone={profile.phone} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  );
}
