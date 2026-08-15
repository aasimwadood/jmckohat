import type { Metadata } from "next";
import { requireApplicant } from "@/lib/auth/applicant-session";
import { createClient } from "@/lib/supabase/server";
import { ApplicantProfileForm } from "@/components/features/recruitment/applicant-profile-form";

export const metadata: Metadata = { title: "Applicant Profile" };

export default async function ApplicantProfilePage() {
  const applicant = await requireApplicant();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("applicant_profiles")
    .select("full_name, father_name, cnic, dob, gender, phone, address, domicile")
    .eq("id", applicant.id)
    .single();

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      <ApplicantProfileForm
        initial={{
          fullName: profile?.full_name ?? "",
          fatherName: profile?.father_name ?? "",
          cnic: profile?.cnic ?? "",
          dob: profile?.dob ?? "",
          gender: profile?.gender ?? "",
          phone: profile?.phone ?? "",
          address: profile?.address ?? "",
          domicile: profile?.domicile ?? "",
        }}
      />
    </div>
  );
}
