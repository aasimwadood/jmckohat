import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EditProfileForm } from "@/components/features/profile/edit-profile-form";
import { AvatarUpload } from "@/components/features/profile/avatar-upload";

export default async function StudentProfilePage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const [{ data: department }, { data: semester }] = await Promise.all([
    profile.departmentId
      ? supabase.from("departments").select("name").eq("id", profile.departmentId).single()
      : Promise.resolve({ data: null }),
    profile.currentSemesterId
      ? supabase.from("semesters").select("number").eq("id", profile.currentSemesterId).single()
      : Promise.resolve({ data: null }),
  ]);

  const { data: results } = await supabase.from("results").select("total").eq("student_profile_id", profile.id);
  const { computeGpa } = await import("@/lib/utils/grading");
  const gpa = computeGpa((results ?? []).map((r) => r.total));

  const avatarUrl = profile.avatarPath
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatarPath).data.publicUrl
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <AvatarUpload avatarUrl={avatarUrl} fullName={profile.fullName} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Full Name" value={profile.fullName} />
            <Field label="Email" value={profile.email} />
            <Field label="Department" value={department?.name ?? "N/A"} />
            <Field label="Current Semester" value={semester ? `Semester ${semester.number}` : "N/A"} />
            <Field label="GPA" value={`${gpa.toFixed(2)}/4.00`} />
            <Field label="Phone" value={profile.phone ?? "N/A"} />
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
