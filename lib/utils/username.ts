import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export function slugifyUsername(fullName: string): string {
  return fullName.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "").slice(0, 30) || "user";
}

/**
 * Appends a numeric suffix until the candidate is free. Used wherever a
 * username is generated on the caller's behalf (staff/org-admin
 * provisioning) rather than chosen by the account holder at registration.
 */
export async function generateUniqueUsername(base: string): Promise<string> {
  const admin = createAdminClient();
  const slug = slugifyUsername(base);
  let candidate = slug;
  let suffix = 1;
  for (;;) {
    const { data } = await admin.from("profiles").select("id").eq("username", candidate).maybeSingle();
    if (!data) return candidate;
    suffix += 1;
    candidate = `${slug}${suffix}`;
  }
}
