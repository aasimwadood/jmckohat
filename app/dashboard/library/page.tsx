import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddFineForm } from "@/components/features/fines/add-fine-form";
import { fetchAllCollegeStudents } from "@/lib/services/students";

export default async function LibraryPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  const { data: myAssignments } = await supabase.from("designation_assignments").select("designation_type_id").eq("profile_id", profile.id);
  const typeIds = (myAssignments ?? []).map((a) => a.designation_type_id);
  const { data: myTypes } = typeIds.length ? await supabase.from("designation_types").select("id, name").in("id", typeIds) : { data: [] };
  const isLibrarian = (myTypes ?? []).some((t) => t.name === "Librarian");

  if (!isLibrarian) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          You are not currently designated Librarian.
        </CardContent>
      </Card>
    );
  }

  const collegeStudents = profile.collegeId ? await fetchAllCollegeStudents(supabase, profile.collegeId) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Library Fines</CardTitle>
      </CardHeader>
      <CardContent>
        <AddFineForm
          title="Add Library Fine"
          fineType="library_fine"
          students={collegeStudents.map((s) => ({ id: s.id, name: s.full_name, registrationNumber: s.registration_number }))}
        />
      </CardContent>
    </Card>
  );
}
