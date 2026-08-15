import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentApplicant = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  cnic: string | null;
};

/**
 * Applicant equivalent of lib/auth/session.ts's getCurrentProfile(). Kept
 * as its own module rather than extending getCurrentProfile()/requireRole()
 * because applicants deliberately have no `profiles` row at all (see
 * handle_new_user() in supabase/migrations/0038_recruitment_functions.sql)
 * — reusing the staff/student session helpers here would either crash or
 * silently treat every applicant as signed out.
 */
export async function getCurrentApplicant(): Promise<CurrentApplicant | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: applicant } = await supabase
    .from("applicant_profiles")
    .select("id, full_name, email, phone, cnic")
    .eq("id", user.id)
    .single();

  if (!applicant) return null;

  return {
    id: applicant.id,
    fullName: applicant.full_name,
    email: applicant.email,
    phone: applicant.phone,
    cnic: applicant.cnic,
  };
}

/** Server Component guard for the applicant portal — redirects to the applicant login, not /login. */
export async function requireApplicant(): Promise<CurrentApplicant> {
  const applicant = await getCurrentApplicant();
  if (!applicant) {
    redirect("/recruitment/login");
  }
  return applicant;
}
