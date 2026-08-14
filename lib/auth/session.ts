import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/permissions/roles";
import { ROLE_DASHBOARD_PATH } from "@/lib/permissions/roles";

export type CurrentProfile = {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone: string | null;
  departmentId: string | null;
  avatarPath: string | null;
  isActive: boolean;
};

/**
 * Reads the current session's profile server-side. Returns null when
 * signed out. This is the ONLY place dashboard code should get "who is the
 * current user" from — never trust a role/user object passed as a client
 * prop for an authorization decision, only for display.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, phone, department_id, avatar_path, is_active")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    role: profile.role as UserRole,
    fullName: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    departmentId: profile.department_id,
    avatarPath: profile.avatar_path,
    isActive: profile.is_active,
  };
}

/**
 * Server Component / Server Action guard: redirects to /login when signed
 * out, and to the caller's own dashboard when signed in but with the wrong
 * role. This is a UX convenience on top of RLS, not a substitute for it —
 * every table a dashboard reads from enforces the same rule independently.
 */
export async function requireRole(...allowed: UserRole[]): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }
  if (!allowed.includes(profile.role)) {
    redirect(ROLE_DASHBOARD_PATH[profile.role]);
  }
  return profile;
}
