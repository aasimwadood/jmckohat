"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import {
  assignDutySchema,
  updateDutyStatusSchema,
  fileComplaintSchema,
  updateComplaintStatusSchema,
} from "@/lib/validations/proctorial";
import type { ActionResult } from "@/lib/actions/auth";

// Chief Proctor / Staff Proctor are designations, not profiles.role values
// (see 0056_proctorial_board.sql) — any staff role could plausibly hold
// them, so the app-layer guard here is just "must be a real signed-in staff
// account"; RLS (is_chief_proctor()/is_staff_proctor(), scoped to
// current_college_id()) is the actual boundary for who can assign duties,
// update someone else's, or file/review complaints.
const STAFF_ROLES_ALLOWED = [
  "admin", "principal", "administration", "college_admin",
  "department", "coordinator", "controller", "faculty",
] as const;

export async function assignDutyAction(formData: FormData): Promise<ActionResult> {
  const caller = await requireRole(...STAFF_ROLES_ALLOWED);
  if (!caller.collegeId) return { error: "Your account has no college set" };

  const rawDept = formData.get("departmentId");
  const parsed = assignDutySchema.safeParse({
    assignedTo: formData.get("assignedTo"),
    departmentId: rawDept ? rawDept : null,
    dutyType: formData.get("dutyType"),
    dutyDate: formData.get("dutyDate"),
    shiftTime: formData.get("shiftTime"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("proctor_duties").insert({
    college_id: caller.collegeId,
    department_id: parsed.data.departmentId,
    assigned_to: parsed.data.assignedTo,
    duty_type: parsed.data.dutyType,
    duty_date: parsed.data.dutyDate,
    shift_time: parsed.data.shiftTime || null,
    location: parsed.data.location || null,
    notes: parsed.data.notes || null,
    assigned_by: caller.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/proctorial/chief");
  revalidatePath("/dashboard/principal/proctorial-board");
  return {};
}

export async function updateDutyStatusAction(formData: FormData): Promise<ActionResult> {
  await requireRole(...STAFF_ROLES_ALLOWED);

  const parsed = updateDutyStatusSchema.safeParse({
    dutyId: formData.get("dutyId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("proctor_duties")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.dutyId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/proctorial/staff");
  revalidatePath("/dashboard/proctorial/chief");
  revalidatePath("/dashboard/principal/proctorial-board");
  return {};
}

export async function fileComplaintAction(formData: FormData): Promise<ActionResult> {
  const caller = await requireRole(...STAFF_ROLES_ALLOWED);
  if (!caller.collegeId) return { error: "Your account has no college set" };

  const rawStudent = formData.get("againstStudentId");
  const parsed = fileComplaintSchema.safeParse({
    description: formData.get("description"),
    againstStudentId: rawStudent ? rawStudent : null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("proctor_complaints").insert({
    college_id: caller.collegeId,
    raised_by: caller.id,
    against_student_id: parsed.data.againstStudentId,
    description: parsed.data.description,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/proctorial/chief");
  revalidatePath("/dashboard/proctorial/staff");
  revalidatePath("/dashboard/principal/proctorial-board");
  return {};
}

export async function updateComplaintStatusAction(formData: FormData): Promise<ActionResult> {
  const caller = await requireRole(...STAFF_ROLES_ALLOWED);

  const parsed = updateComplaintStatusSchema.safeParse({
    complaintId: formData.get("complaintId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("proctor_complaints")
    .update({ status: parsed.data.status, reviewed_by: caller.id })
    .eq("id", parsed.data.complaintId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/proctorial/chief");
  revalidatePath("/dashboard/principal/proctorial-board");
  return {};
}
