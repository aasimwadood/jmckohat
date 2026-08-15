"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  updatePasswordSchema,
} from "@/lib/validations/auth";
import { ROLE_DASHBOARD_PATH, isUserRole } from "@/lib/permissions/roles";

export type ActionResult = { error: string } | { error?: undefined };

export async function loginAction(
  redirectTo: string | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Accepts either a username or an email address in the same field. An
  // email goes straight to signInWithPassword; a username has to be
  // resolved to its email first, server-side only, via the admin client
  // (there's no session yet for the RLS-respecting client to act as, and
  // this lookup must never be exposed to the browser as its own endpoint —
  // that would make it a username-enumeration oracle).
  const identifier = parsed.data.identifier.trim();
  let email = identifier;

  if (!identifier.includes("@")) {
    const admin = createAdminClient();
    const { data: accountLookup } = await admin
      .from("profiles")
      .select("email")
      .eq("username", identifier.toLowerCase())
      .maybeSingle();

    if (!accountLookup) {
      return { error: "Invalid username or password" };
    }
    email = accountLookup.email;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });

  if (error) {
    return { error: "Invalid username or password" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: "This account is inactive. Contact your administrator." };
  }

  const role = profile.role;
  const destination =
    redirectTo && redirectTo.startsWith("/dashboard")
      ? redirectTo
      : isUserRole(role)
        ? ROLE_DASHBOARD_PATH[role]
        : "/";

  redirect(destination);
}

export async function registerAction(formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    departmentId: formData.get("departmentId"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const username = parsed.data.username.toLowerCase();
  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (existing) {
    return { error: "That username is already taken" };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // No role is ever accepted from this form — handle_new_user() (the
  // auth.users trigger) always assigns 'student' regardless of what's in
  // raw_user_meta_data. Staff accounts are provisioned separately, see
  // lib/actions/provision-staff.ts.
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: {
        full_name: parsed.data.fullName,
        username,
        department_id: parsed.data.departmentId,
        phone: parsed.data.phone || null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function logoutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/update-password`,
  });

  // Always report success, whether or not the email exists, so this
  // endpoint can't be used to enumerate registered accounts.
  return {};
}

export async function updatePasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: error.message };
  }

  redirect("/login");
}
