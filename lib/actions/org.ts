"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { createDirectorateSchema, createJmcSchema, createCollegeSchema, toggleOrgStatusSchema } from "@/lib/validations/org";
import { logAudit } from "@/lib/actions/audit";
import type { ActionResult } from "@/lib/actions/auth";

// Every action here uses the RLS-respecting client (not the service-role
// admin client) deliberately: requireRole() is only the coarse "is this
// role allowed to call this action at all" gate. The actual scope check
// (a directorate_admin can only touch their own directorate's JMCs, a
// jmc_admin only their own JMC's colleges, etc.) is enforced by the RLS
// policies in 0027/0029_hed_hierarchy_*.sql — the same pattern already
// used throughout lib/actions/admissions.ts and promotions.ts.

export async function createDirectorateAction(formData: FormData): Promise<ActionResult> {
  const caller = await requireRole("hed_admin");

  const parsed = createDirectorateSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("directorates").insert(parsed.data).select("id").single();
  if (error) return { error: error.message };

  await logAudit(caller.id, "create_directorate", "directorates", data.id, parsed.data);
  revalidatePath("/dashboard/hed", "layout");
  return {};
}

export async function toggleDirectorateStatusAction(formData: FormData): Promise<ActionResult> {
  const caller = await requireRole("hed_admin");

  const parsed = toggleOrgStatusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("directorates").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return { error: error.message };

  await logAudit(caller.id, `directorate_${parsed.data.status}`, "directorates", parsed.data.id);
  revalidatePath("/dashboard/hed", "layout");
  return {};
}

export async function createJmcAction(formData: FormData): Promise<ActionResult> {
  const caller = await requireRole("hed_admin", "directorate_admin");

  const parsed = createJmcSchema.safeParse({
    directorateId: formData.get("directorateId"),
    name: formData.get("name"),
    code: formData.get("code"),
    district: formData.get("district"),
    division: formData.get("division"),
    address: formData.get("address"),
    contactNumber: formData.get("contactNumber"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jmcs")
    .insert({
      directorate_id: parsed.data.directorateId,
      name: parsed.data.name,
      code: parsed.data.code,
      district: parsed.data.district || null,
      division: parsed.data.division || null,
      address: parsed.data.address || null,
      contact_number: parsed.data.contactNumber || null,
      email: parsed.data.email || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await logAudit(caller.id, "create_jmc", "jmcs", data.id, { name: parsed.data.name });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function toggleJmcStatusAction(formData: FormData): Promise<ActionResult> {
  const caller = await requireRole("hed_admin", "directorate_admin");

  const parsed = toggleOrgStatusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("jmcs").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return { error: error.message };

  await logAudit(caller.id, `jmc_${parsed.data.status}`, "jmcs", parsed.data.id);
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function createCollegeAction(formData: FormData): Promise<ActionResult> {
  const caller = await requireRole("hed_admin", "directorate_admin", "jmc_admin");

  const parsed = createCollegeSchema.safeParse({
    jmcId: formData.get("jmcId"),
    collegeTypeId: formData.get("collegeTypeId"),
    name: formData.get("name"),
    code: formData.get("code"),
    slug: formData.get("slug"),
    district: formData.get("district"),
    division: formData.get("division"),
    address: formData.get("address"),
    contactNumber: formData.get("contactNumber"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colleges")
    .insert({
      jmc_id: parsed.data.jmcId,
      college_type_id: parsed.data.collegeTypeId,
      name: parsed.data.name,
      code: parsed.data.code,
      slug: parsed.data.slug,
      district: parsed.data.district || null,
      division: parsed.data.division || null,
      address: parsed.data.address || null,
      contact_number: parsed.data.contactNumber || null,
      email: parsed.data.email || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await logAudit(caller.id, "create_college", "colleges", data.id, { name: parsed.data.name });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function toggleCollegeStatusAction(formData: FormData): Promise<ActionResult> {
  const caller = await requireRole("hed_admin", "directorate_admin", "jmc_admin");

  const parsed = toggleOrgStatusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("colleges").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return { error: error.message };

  await logAudit(caller.id, `college_${parsed.data.status}`, "colleges", parsed.data.id);
  revalidatePath("/dashboard", "layout");
  return {};
}
